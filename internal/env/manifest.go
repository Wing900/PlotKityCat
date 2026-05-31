package env

import "plotkitycat/internal/pythonruntime"

type Requirement struct {
	Key          string `json:"key"`
	RelativePath string `json:"relativePath"`
	Label        string `json:"label"`
	ImportName   string `json:"importName"`
}

func DefaultRequirements() []Requirement {
	return []Requirement{
		{
			Key:          "python",
			RelativePath: pythonruntime.PrimaryPythonRelativePath(),
			Label:        "Python 解释器",
			ImportName:   "",
		},
		{
			Key:          "numpy",
			RelativePath: pythonruntime.PackageRelativePath("numpy"),
			Label:        "NumPy",
			ImportName:   "numpy",
		},
		{
			Key:          "matplotlib",
			RelativePath: pythonruntime.PackageRelativePath("matplotlib"),
			Label:        "Matplotlib",
			ImportName:   "matplotlib",
		},
		{
			Key:          "scipy",
			RelativePath: pythonruntime.PackageRelativePath("scipy"),
			Label:        "SciPy",
			ImportName:   "scipy",
		},
		{
			Key:          "pyqt5",
			RelativePath: pythonruntime.PackageRelativePath("PyQt5"),
			Label:        "PyQt5",
			ImportName:   "PyQt5",
		},
		{
			Key:          "mpl_surface_fastpath",
			RelativePath: pythonruntime.PackageRelativePath("mpl_surface_fastpath"),
			Label:        "Matplotlib Surface Fastpath",
			ImportName:   "mpl_surface_fastpath",
		},
	}
}
