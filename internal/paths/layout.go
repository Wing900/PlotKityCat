package paths

import (
	"os"
	"path/filepath"
	"runtime"
)

// InstalledMarker is shipped only in the installer payload. Portable releases
// keep their original directory layout, including after an EXE-only update.
const InstalledMarker = ".plotkitycat-installed"

const LegacySourceFile = ".plotkitycat-legacy-source"

func IsInstalled() (bool, error) {
	root, err := AppRoot()
	if err != nil {
		return false, err
	}
	info, err := os.Stat(filepath.Join(root, InstalledMarker))
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return !info.IsDir(), nil
}

// DataRoot separates writable state from installed resources. Resolve through
// the OS API instead of the current directory or an installer-supplied path.
func DataRoot() (string, error) {
	installed, err := IsInstalled()
	if err != nil {
		return "", err
	}
	if !installed {
		return AppRoot()
	}
	var root string
	if runtime.GOOS == "windows" {
		root, err = os.UserCacheDir() // Windows: LocalAppData, not a temp directory.
	} else {
		root, err = os.UserConfigDir()
	}
	if err != nil {
		return "", err
	}
	return filepath.Join(root, "PlotKityCat"), nil
}

func TemplatesDir() (string, error) {
	root, err := AppRoot()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, "resources", "templates", "Scripts"), nil
}
