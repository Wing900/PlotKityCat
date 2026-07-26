//go:build !windows

package atomicfile

import (
	"os"
	"path/filepath"
)

func replaceFile(source string, target string) error {
	if err := os.Rename(source, target); err != nil {
		return err
	}

	dir, err := os.Open(filepath.Dir(target))
	if err != nil {
		return err
	}
	defer dir.Close()
	return dir.Sync()
}
