//go:build windows

package setup

import (
	"encoding/binary"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unicode/utf16"

	"golang.org/x/sys/windows/registry"
)

const uninstallKey = `Software\Microsoft\Windows\CurrentVersion\Uninstall\PlotKityCat`

func registeredInstallDir() string {
	key, err := registry.OpenKey(registry.CURRENT_USER, uninstallKey, registry.QUERY_VALUE|registry.WOW64_64KEY)
	if err != nil {
		return ""
	}
	defer key.Close()
	dir, _, _ := key.GetStringValue("InstallLocation")
	return dir
}

func validateDestination(dir string) error {
	volume := filepath.VolumeName(dir)
	if !filepath.IsAbs(dir) || len(volume) != 2 || volume[1] != ':' || strings.ContainsAny(dir, `"<>|?*`) {
		return fmt.Errorf("请选择本机磁盘上的安装目录")
	}
	if filepath.Clean(dir) == volume+`\` {
		return fmt.Errorf("请选择独立的 PlotKityCat 文件夹")
	}
	// Resolve existing junctions before checking protected/data roots.
	resolved, err := resolveExistingParent(dir)
	if err != nil {
		return err
	}
	userRoot, err := os.UserCacheDir()
	if err != nil {
		return err
	}
	for _, forbidden := range []string{filepath.Join(userRoot, "PlotKityCat"), os.Getenv("SystemRoot")} {
		if forbidden == "" {
			continue
		}
		canonical, err := resolveExistingParent(forbidden)
		if err != nil {
			return err
		}
		if within(resolved, canonical) {
			return fmt.Errorf("安装目录不能位于用户数据或 Windows 系统目录中")
		}
	}
	if old := registeredInstallDir(); old != "" {
		oldResolved, err := resolveExistingParent(old)
		if err != nil {
			return err
		}
		if !strings.EqualFold(resolved, oldResolved) {
			return fmt.Errorf("请先卸载旧安装，再更改安装位置；作品会保留")
		}
	}
	entries, err := os.ReadDir(dir)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("无法访问安装目录：%w", err)
	}
	if len(entries) != 0 {
		if info, err := os.Stat(filepath.Join(dir, ".plotkitycat-installed")); err != nil || !info.Mode().IsRegular() {
			return fmt.Errorf("请选择空文件夹，避免覆盖已有文件")
		}
	}
	return nil
}

func within(path, parent string) bool {
	path, parent = strings.ToLower(filepath.Clean(path)), strings.ToLower(filepath.Clean(parent))
	return path == parent || strings.HasPrefix(path, parent+string(filepath.Separator))
}

func resolveExistingParent(path string) (string, error) {
	path = filepath.Clean(path)
	if _, err := os.Lstat(path); err == nil {
		return filepath.EvalSymlinks(path)
	} else if !os.IsNotExist(err) {
		return "", err
	}
	parent := filepath.Dir(path)
	if parent == path {
		return "", fmt.Errorf("安装磁盘不可用")
	}
	resolved, err := resolveExistingParent(parent)
	if err != nil {
		return "", err
	}
	return filepath.Join(resolved, filepath.Base(path)), nil
}

func validateLegacy(dir string) error {
	if !filepath.IsAbs(dir) {
		return fmt.Errorf("请选择含 Scripts 的旧版目录")
	}
	if info, err := os.Stat(filepath.Join(dir, "PlotKityCat.exe")); err != nil || !info.Mode().IsRegular() {
		return fmt.Errorf("请选择含 PlotKityCat.exe 和 Scripts 的旧版目录")
	}
	if info, err := os.Stat(filepath.Join(dir, "Scripts")); err != nil || !info.IsDir() {
		return fmt.Errorf("请选择含 Scripts 的旧版目录")
	}
	if _, err := os.Stat(filepath.Join(dir, ".plotkitycat-installed")); err == nil {
		return fmt.Errorf("请选择旧 ZIP 版目录")
	}
	return nil
}

func installCommand(worker, destination, legacy, progress string) *exec.Cmd {
	cmd := exec.Command(worker)
	// NSIS requires /D to be the final unquoted argument, even with spaces.
	line := syscall.EscapeArg(worker) + " /S /EXTRACTONLY /PROGRESS=" + syscall.EscapeArg(progress)
	if legacy != "" {
		line += " /LEGACY=" + syscall.EscapeArg(legacy)
	}
	line += " /D=" + destination
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CmdLine: line}
	return cmd
}

func applicationCommand(path string) *exec.Cmd {
	cmd := exec.Command(path)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd
}

func readWorkerError(path string) string {
	content, err := os.ReadFile(path)
	if err != nil || len(content) < 2 || len(content)%2 != 0 || content[0] != 0xff || content[1] != 0xfe {
		return ""
	}
	units := make([]uint16, (len(content)-2)/2)
	for i := range units {
		units[i] = binary.LittleEndian.Uint16(content[2+i*2:])
	}
	return strings.TrimSpace(string(utf16.Decode(units)))
}
