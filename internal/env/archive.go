package env

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"plotkitycat/internal/paths"
	"plotkitycat/internal/processutil"
)

var archiveProgressPattern = regexp.MustCompile(`(?:^|\D)(\d{1,3})%(?:$|\D)`)

func (m *Manager) ensureRuntimeExtracted(onProgress func(Progress)) error {
	return m.ensureRuntime(onProgress, false)
}

func (m *Manager) ensureRuntime(onProgress func(Progress), force bool) error {
	reportProgress(onProgress, Progress{
		Stage:   "checking",
		Message: "Checking runtime",
		Percent: 12,
	})

	status, err := m.Status()
	if err != nil {
		return err
	}
	if status.Ready && !force {
		reportProgress(onProgress, Progress{
			Stage:   "ready",
			Message: "Runtime ready",
			Percent: 100,
		})
		return nil
	}

	archivePath, err := paths.RuntimeArchivePath()
	if err != nil {
		return err
	}

	if _, err := os.Stat(archivePath); err != nil {
		return fmt.Errorf("runtime archive not found: %s", archivePath)
	}
	revision, err := paths.RuntimeRevision()
	if err != nil {
		return err
	}
	if revision != "" {
		archive, err := os.Open(archivePath)
		if err != nil {
			return err
		}
		hash := sha256.New()
		_, copyErr := io.Copy(hash, archive)
		archive.Close()
		if copyErr != nil {
			return copyErr
		}
		if hex.EncodeToString(hash.Sum(nil)) != revision {
			return fmt.Errorf("runtime archive digest mismatch")
		}
	}

	extractorPath, err := paths.RuntimeExtractorPath()
	if err != nil {
		return err
	}

	if _, err := os.Stat(extractorPath); err != nil {
		return fmt.Errorf("runtime extractor not found: %s", extractorPath)
	}

	reportProgress(onProgress, Progress{
		Stage:   "extracting",
		Message: "Extracting runtime",
		Percent: 18,
	})

	runtimeDir, err := paths.RuntimeDir()
	if err != nil {
		return err
	}

	tempDir, err := paths.RuntimeTempDir()
	if err != nil {
		return err
	}

	if err := os.RemoveAll(tempDir); err != nil {
		return err
	}
	if err := os.MkdirAll(tempDir, 0o755); err != nil {
		return err
	}

	if err := extractArchive(archivePath, extractorPath, tempDir, onProgress); err != nil {
		_ = os.RemoveAll(tempDir)
		return err
	}
	stagedStatus, err := evaluateStatusAt(tempDir, archivePath, DefaultRequirements())
	if err != nil {
		return err
	}
	if !stagedStatus.Ready {
		return fmt.Errorf("staged runtime failed validation: %s", stagedStatus.Summary)
	}

	reportProgress(onProgress, Progress{
		Stage:   "installing",
		Message: "Installing runtime",
		Percent: 92,
	})

	if err := installRuntimeFromTemp(tempDir, runtimeDir); err != nil {
		_ = os.RemoveAll(tempDir)
		return err
	}

	status, err = m.Status()
	if err != nil {
		return err
	}
	if !status.Ready {
		return fmt.Errorf("runtime extracted but still incomplete")
	}

	reportProgress(onProgress, Progress{
		Stage:   "ready",
		Message: "Runtime ready",
		Percent: 100,
	})

	return nil
}

func installRuntimeFromTemp(tempDir string, runtimeDir string) error {
	if err := os.MkdirAll(filepath.Dir(runtimeDir), 0700); err != nil {
		return err
	}
	backup, err := os.MkdirTemp(filepath.Dir(runtimeDir), ".runtime-backup-")
	if err != nil {
		return err
	}
	if err := os.Remove(backup); err != nil {
		return err
	}
	existed := false
	if info, err := os.Lstat(runtimeDir); err == nil {
		if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("runtime directory type invalid")
		}
		if err := retryRename(runtimeDir, backup, 8, 250*time.Millisecond); err != nil {
			return err
		}
		existed = true
	} else if !os.IsNotExist(err) {
		return err
	}
	if err := retryRename(tempDir, runtimeDir, 8, 250*time.Millisecond); err != nil {
		if existed {
			if rollbackErr := os.Rename(backup, runtimeDir); rollbackErr != nil {
				return fmt.Errorf("runtime activation failed: %v; backup retained at %s: %w", err, backup, rollbackErr)
			}
		}
		return err
	}
	// Retain a rebuilt environment's backup for operator recovery. Other archive
	// revisions remain in versions/, allowing application rollback to reuse them.
	return nil
}

func retryRename(source string, target string, attempts int, delay time.Duration) error {
	var lastErr error
	for index := 0; index < attempts; index++ {
		lastErr = os.Rename(source, target)
		if lastErr == nil {
			return nil
		}

		time.Sleep(delay)
	}

	return lastErr
}

func copyDirContents(sourceDir string, targetDir string) error {
	entries, err := os.ReadDir(sourceDir)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		sourcePath := filepath.Join(sourceDir, entry.Name())
		targetPath := filepath.Join(targetDir, entry.Name())

		info, err := entry.Info()
		if err != nil {
			return err
		}

		if entry.IsDir() {
			if err := os.MkdirAll(targetPath, info.Mode()); err != nil {
				return err
			}
			if err := copyDirContents(sourcePath, targetPath); err != nil {
				return err
			}
			continue
		}

		if err := copyFile(sourcePath, targetPath, info.Mode()); err != nil {
			return err
		}
	}

	return nil
}

func copyFile(sourcePath string, targetPath string, mode os.FileMode) error {
	source, err := os.Open(sourcePath)
	if err != nil {
		return err
	}
	defer source.Close()

	target, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}

	_, copyErr := io.Copy(target, source)
	closeErr := target.Close()
	if copyErr != nil {
		return copyErr
	}
	if closeErr != nil {
		return closeErr
	}

	return nil
}

func extractArchive(archivePath string, extractorPath string, targetDir string, onProgress func(Progress)) error {
	reportProgress(onProgress, Progress{
		Stage:   "extracting",
		Message: "Launching 7z extractor",
		Percent: 24,
	})

	outputDirArg := "-o" + targetDir
	cmd := exec.Command(extractorPath, "x", archivePath, outputDirArg, "-y", "-bsp1")
	cmd.SysProcAttr = processutil.WithoutConsoleWindow()
	cmd.Dir = filepath.Dir(extractorPath)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	progressParser := newArchiveProgressParser(onProgress)
	cmd.Stdout = io.MultiWriter(&stdout, progressParser)
	cmd.Stderr = io.MultiWriter(&stderr, progressParser)

	if err := cmd.Run(); err != nil {
		progressParser.Flush()
		message := stderr.String()
		if message == "" {
			message = stdout.String()
		}
		if message == "" {
			message = err.Error()
		}

		return fmt.Errorf("extract runtime archive with 7z: %s", message)
	}
	progressParser.Flush()

	reportProgress(onProgress, Progress{
		Stage:   "extracting",
		Message: "Runtime archive extracted",
		Percent: 86,
	})

	return nil
}

type archiveProgressParser struct {
	lastPercent int
	onProgress  func(Progress)
	pending     string
}

func newArchiveProgressParser(onProgress func(Progress)) *archiveProgressParser {
	return &archiveProgressParser{
		lastPercent: -1,
		onProgress:  onProgress,
	}
}

func (p *archiveProgressParser) Write(data []byte) (int, error) {
	text := strings.ReplaceAll(string(data), "\r", "\n")
	p.pending += text

	for {
		lineEnd := strings.IndexByte(p.pending, '\n')
		if lineEnd < 0 {
			break
		}

		p.consume(strings.TrimSpace(p.pending[:lineEnd]))
		p.pending = p.pending[lineEnd+1:]
	}

	if len(p.pending) > 512 {
		p.consume(strings.TrimSpace(p.pending))
		p.pending = ""
	}

	return len(data), nil
}

func (p *archiveProgressParser) Flush() {
	p.consume(strings.TrimSpace(p.pending))
	p.pending = ""
}

func (p *archiveProgressParser) consume(line string) {
	if line == "" || p.onProgress == nil {
		return
	}

	matches := archiveProgressPattern.FindAllStringSubmatch(line, -1)
	if len(matches) == 0 {
		return
	}

	lastMatch := matches[len(matches)-1]
	rawPercent, err := strconv.Atoi(lastMatch[1])
	if err != nil {
		return
	}

	if rawPercent < 0 {
		rawPercent = 0
	}
	if rawPercent > 100 {
		rawPercent = 100
	}

	mappedPercent := 24 + int(float64(rawPercent)*62.0/100.0)
	if mappedPercent <= p.lastPercent {
		return
	}

	p.lastPercent = mappedPercent
	reportProgress(p.onProgress, Progress{
		Stage:   "extracting",
		Message: fmt.Sprintf("Extracting runtime %d%%", rawPercent),
		Percent: mappedPercent,
	})
}
