//go:build !windows

package setup

import (
	"fmt"
	"os/exec"
)

func registeredInstallDir() string     { return "" }
func validateDestination(string) error { return fmt.Errorf("安装器仅支持 Windows") }
func validateLegacy(string) error      { return fmt.Errorf("安装器仅支持 Windows") }
func installCommand(worker, destination, legacy, progress string) *exec.Cmd {
	return exec.Command(worker)
}
func applicationCommand(path string) *exec.Cmd { return exec.Command(path) }
func readWorkerError(string) string            { return "" }
