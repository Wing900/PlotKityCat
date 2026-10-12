package upgrade

import (
	"debug/buildinfo"
	"fmt"
	"strings"
)

// ReadVersion also works for older Wails releases without PE version resources.
// The linker build settings were already included in their Go executable.
func ReadVersion(path string) (string, error) {
	info, err := buildinfo.ReadFile(path)
	if err != nil {
		return "", err
	}
	if info.Path != "plotkitycat" {
		return "", fmt.Errorf("invalid application executable")
	}
	const prefix = "plotkitycat/internal/version.appVersion="
	for _, setting := range info.Settings {
		if setting.Key != "-ldflags" {
			continue
		}
		for _, word := range strings.Fields(setting.Value) {
			if strings.HasPrefix(word, prefix) {
				return strings.TrimPrefix(word, prefix), nil
			}
		}
	}
	return "", fmt.Errorf("无法识别旧版本，请先卸载旧安装；作品会保留")
}
