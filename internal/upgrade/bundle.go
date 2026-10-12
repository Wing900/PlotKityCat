package upgrade

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// ExtractBundle only accepts managed application files, with bounded expansion
// and no symlinks, drive paths, device names, alternate streams or ZIP traversal.
func ExtractBundle(archive, stage string, installed bool) error {
	reader, err := zip.OpenReader(archive)
	if err != nil {
		return err
	}
	defer reader.Close()
	if len(reader.File) > 10000 {
		return fmt.Errorf("更新包文件数量超限")
	}
	var total uint64
	seen := map[string]bool{}
	for _, entry := range reader.File {
		name := strings.ReplaceAll(entry.Name, "\\", "/")
		if strings.HasPrefix(name, "/") || strings.ContainsAny(name, ":\x00") || entry.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("更新包包含不安全路径")
		}
		parts := strings.Split(strings.TrimSuffix(name, "/"), "/")
		for _, part := range parts {
			base := strings.ToUpper(strings.Split(part, ".")[0])
			if part == "" || part == "." || part == ".." || strings.HasSuffix(part, ".") || strings.HasSuffix(part, " ") || base == "CON" || base == "PRN" || base == "AUX" || base == "NUL" || (len(base) == 4 && (strings.HasPrefix(base, "COM") || strings.HasPrefix(base, "LPT")) && base[3] >= '0' && base[3] <= '9') {
				return fmt.Errorf("更新包包含无效路径")
			}
		}
		if name != "PlotKityCat.exe" && name != ".plotkitycat-installed" && name != "resources/" && !strings.HasPrefix(name, "resources/") {
			return fmt.Errorf("更新包包含非程序文件：%s", name)
		}
		if name == ".plotkitycat-installed" && !installed {
			continue
		}
		key := strings.ToLower(strings.TrimSuffix(name, "/"))
		if seen[key] {
			return fmt.Errorf("更新包包含重复路径")
		}
		seen[key] = true
		total += entry.UncompressedSize64
		if total > 2<<30 {
			return fmt.Errorf("更新包解压大小超限")
		}
		destination := filepath.Join(stage, filepath.FromSlash(name))
		if entry.FileInfo().IsDir() {
			if err := os.MkdirAll(destination, 0700); err != nil {
				return err
			}
			continue
		}
		if !entry.Mode().IsRegular() {
			return fmt.Errorf("更新包文件类型无效")
		}
		if err := os.MkdirAll(filepath.Dir(destination), 0700); err != nil {
			return err
		}
		source, err := entry.Open()
		if err != nil {
			return err
		}
		target, err := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0700)
		if err != nil {
			source.Close()
			return err
		}
		_, copyErr := io.Copy(target, io.LimitReader(source, int64(entry.UncompressedSize64)+1))
		closeErr := target.Close()
		source.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
	}
	for _, name := range []string{"PlotKityCat.exe", "resources/runtime/runtime.7z", "resources/runtime/7zip/7za.exe", "resources/runtime/7zip/7za.dll"} {
		if info, err := os.Stat(filepath.Join(stage, filepath.FromSlash(name))); err != nil || !info.Mode().IsRegular() {
			return fmt.Errorf("更新包缺少组件：%s", name)
		}
	}
	return nil
}
