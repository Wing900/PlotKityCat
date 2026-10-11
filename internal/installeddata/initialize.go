// Package installeddata owns first-install initialization. Existing installed
// data and portable layouts are never rewritten during startup or reinstall.
package installeddata

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf16"

	"plotkitycat/internal/paths"
)

const readyFile = ".initialized-v1"

func Initialize() error {
	installed, err := paths.IsInstalled()
	if err != nil || !installed {
		return err
	}
	root, err := paths.DataRoot()
	if err != nil {
		return err
	}
	appRoot, err := paths.AppRoot()
	if err != nil {
		return err
	}
	return initialize(root, appRoot)
}

func initialize(root, appRoot string) error {
	if info, err := os.Stat(filepath.Join(root, readyFile)); err == nil && !info.IsDir() {
		return nil
	} else if err != nil && !os.IsNotExist(err) {
		return err
	}
	if _, err := os.Lstat(root); err == nil {
		return fmt.Errorf("user data directory already exists without an initialization marker: %s; keep its contents and rename the directory before retrying", root)
	} else if !os.IsNotExist(err) {
		return err
	}
	parent := filepath.Dir(root)
	if err := os.MkdirAll(parent, 0o755); err != nil {
		return err
	}
	stage, err := os.MkdirTemp(parent, ".plotkitycat-initialize-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(stage) // Only the private directory created above.

	source, err := readLegacySource(filepath.Join(appRoot, paths.LegacySourceFile))
	if err != nil {
		return err
	}
	if source != "" {
		if err := importLegacy(source, stage); err != nil {
			return fmt.Errorf("copy legacy data: %w", err)
		}
	}
	templates := filepath.Join(appRoot, "resources", "templates", "Scripts")
	if err := seedTemplates(templates, filepath.Join(stage, "Scripts")); err != nil {
		return fmt.Errorf("initialize templates: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(stage, "config"), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(stage, readyFile), []byte("1\n"), 0o644); err != nil {
		return err
	}
	// Publish the complete data tree in one rename. Failed copies leave the
	// source untouched and cannot expose partially imported user data.
	if err := os.Rename(stage, root); err != nil {
		return fmt.Errorf("commit initialized user data: %w", err)
	}
	return nil
}

func readLegacySource(path string) (string, error) {
	content, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	// Unicode NSIS writes UTF-16LE with a BOM, preserving Chinese paths.
	if len(content) < 2 || content[0] != 0xff || content[1] != 0xfe || len(content)%2 != 0 {
		return "", fmt.Errorf("invalid legacy directory request encoding")
	}
	units := make([]uint16, (len(content)-2)/2)
	for i := range units {
		units[i] = binary.LittleEndian.Uint16(content[2+i*2:])
	}
	return strings.TrimSpace(string(utf16.Decode(units))), nil
}

func importLegacy(source, stage string) error {
	if !filepath.IsAbs(source) {
		return fmt.Errorf("legacy source must be an absolute application directory")
	}
	if _, err := os.Stat(filepath.Join(source, paths.InstalledMarker)); err == nil {
		return fmt.Errorf("choose the old portable application directory, not an installed copy")
	} else if !os.IsNotExist(err) {
		return err
	}
	info, err := os.Lstat(filepath.Join(source, "PlotKityCat.exe"))
	if err != nil {
		return err
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("legacy application executable is not a regular file")
	}
	if err := copyTree(filepath.Join(source, "Scripts"), filepath.Join(stage, "Scripts")); err != nil {
		return err
	}
	config := filepath.Join(source, "config")
	entries, err := os.ReadDir(config)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	for _, entry := range entries {
		// Old update state references a different executable and download tree.
		if strings.EqualFold(entry.Name(), "updates") {
			continue
		}
		if err := copyTree(filepath.Join(config, entry.Name()), filepath.Join(stage, "config", entry.Name())); err != nil {
			return err
		}
	}
	return nil
}

func seedTemplates(source, target string) error {
	entries, err := os.ReadDir(source)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(target, 0o755); err != nil {
		return err
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		dest := filepath.Join(target, entry.Name())
		if _, err := os.Lstat(dest); err == nil {
			continue // Preserve imported workspaces, including deleted scenes.
		} else if !os.IsNotExist(err) {
			return err
		}
		if err := copyTree(filepath.Join(source, entry.Name()), dest); err != nil {
			return err
		}
	}
	return nil
}

func copyTree(source, target string) error {
	info, err := os.Lstat(source)
	if err != nil {
		return err
	}
	if info.IsDir() {
		if err := os.MkdirAll(target, 0o755); err != nil {
			return err
		}
		entries, err := os.ReadDir(source)
		if err != nil {
			return err
		}
		for _, entry := range entries {
			if err := copyTree(filepath.Join(source, entry.Name()), filepath.Join(target, entry.Name())); err != nil {
				return err
			}
		}
		return nil
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("unsupported file type: %s", source)
	}
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	in, err := os.Open(source)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(target, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	_, copyErr := io.Copy(out, in)
	syncErr := out.Sync()
	closeErr := out.Close()
	if copyErr != nil {
		return copyErr
	}
	if syncErr != nil {
		return syncErr
	}
	return closeErr
}
