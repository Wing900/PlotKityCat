package pythonruntime

import (
	"fmt"
	"path/filepath"
	"runtime"
)

const pythonMajorMinor = "3.13"

func DistributionName() string {
	if runtime.GOOS == "windows" {
		return "WinPython"
	}

	return "Python runtime"
}

func PythonCandidates() []string {
	if runtime.GOOS == "windows" {
		return []string{"python.exe", "pythonw.exe"}
	}

	return []string{
		filepath.Join("bin", "python3"),
		filepath.Join("bin", "python"),
		filepath.Join("bin", "python"+pythonMajorMinor),
	}
}

func PrimaryPythonRelativePath() string {
	candidates := PythonCandidates()
	if len(candidates) == 0 {
		return "python"
	}

	return candidates[0]
}

func SitePackagesRelativeDir() string {
	if runtime.GOOS == "windows" {
		return filepath.Join("Lib", "site-packages")
	}

	return filepath.Join("lib", "python"+pythonMajorMinor, "site-packages")
}

func PackageRelativePath(packageDir string) string {
	return filepath.Join(SitePackagesRelativeDir(), packageDir)
}

func SharedLibraryRelativeDir() string {
	if runtime.GOOS == "windows" {
		return "DLLs"
	}

	return "lib"
}

func PythonNotFoundMessage() string {
	return fmt.Sprintf("python runtime not found; expected one of: %v", PythonCandidates())
}

func RuntimeMissingSummary() string {
	return fmt.Sprintf("缺少 resources/runtime/runtime.zip，无法自动修复内置 %s", DistributionName())
}

func RuntimeIncompleteSummary() string {
	return DistributionName() + " 环境不完整"
}

func PythonExecutableMissingSummary() string {
	return DistributionName() + " 主程序缺失"
}

func PythonImportFailedSummary() string {
	return DistributionName() + " 可执行但导入自检失败"
}

func PythonPackageUnhealthySummary() string {
	return DistributionName() + " 已启动，但核心包导入失败"
}

func RuntimeReadySummary() string {
	return DistributionName() + " ready"
}
