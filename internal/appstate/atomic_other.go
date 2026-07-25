//go:build !windows

package appstate

import "os"

func replaceFile(source string, target string) error {
	return os.Rename(source, target)
}
