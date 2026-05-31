package env

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"plotkitycat/internal/paths"
	"plotkitycat/internal/processutil"
	"plotkitycat/internal/pythonruntime"
)

type CheckItem struct {
	Key          string `json:"key"`
	Label        string `json:"label"`
	RelativePath string `json:"relativePath"`
	Category     string `json:"category"`
	Status       string `json:"status"`
	Message      string `json:"message"`
	Exists       bool   `json:"exists"`
}

type Status struct {
	Ready                bool        `json:"ready"`
	Code                 string      `json:"code"`
	Severity             string      `json:"severity"`
	RuntimeDir           string      `json:"runtimeDir"`
	Summary              string      `json:"summary"`
	RecommendedAction    string      `json:"recommendedAction"`
	CheckedAt            string      `json:"checkedAt"`
	Items                []CheckItem `json:"items"`
	Missing              []string    `json:"missing"`
	CanRebuild           bool        `json:"canRebuild"`
	RuntimeArchivePath   string      `json:"runtimeArchivePath"`
	RuntimeArchiveExists bool        `json:"runtimeArchiveExists"`
}

func EvaluateStatus(requirements []Requirement) (Status, error) {
	runtimeDir, err := paths.RuntimeDir()
	if err != nil {
		return Status{}, err
	}

	archivePath, err := paths.RuntimeArchivePath()
	if err != nil {
		return Status{}, err
	}

	_, archiveStatErr := os.Stat(archivePath)
	archiveExists := archiveStatErr == nil

	items := make([]CheckItem, 0, len(requirements))
	missing := make([]string, 0)
	pythonPath := filepath.Join(runtimeDir, pythonruntime.PrimaryPythonRelativePath())
	pythonExists := false

	for _, requirement := range requirements {
		targetPath := filepath.Join(runtimeDir, filepath.FromSlash(requirement.RelativePath))
		_, statErr := os.Stat(targetPath)
		exists := statErr == nil

		items = append(items, CheckItem{
			Key:          requirement.Key,
			Label:        requirement.Label,
			RelativePath: requirement.RelativePath,
			Category:     "filesystem",
			Status:       mapCheckStatus(exists),
			Message:      mapFileMessage(exists),
			Exists:       exists,
		})

		if !exists {
			missing = append(missing, requirement.Label)
		}

		if requirement.Key == "python" {
			pythonExists = exists
		}
	}

	status := Status{
		Ready:                len(missing) == 0,
		RuntimeDir:           runtimeDir,
		CheckedAt:            time.Now().Format(time.RFC3339),
		Items:                items,
		Missing:              missing,
		CanRebuild:           archiveExists,
		RuntimeArchivePath:   archivePath,
		RuntimeArchiveExists: archiveExists,
	}

	switch {
	case !archiveExists && len(missing) > 0:
		status.Code = "runtime_archive_missing"
		status.Severity = "error"
		status.Summary = pythonruntime.RuntimeMissingSummary()
		status.RecommendedAction = "请补齐 resources/runtime/runtime.zip 后再重建 Runtime"
	case !pythonExists:
		status.Code = "python_executable_missing"
		status.Severity = "error"
		status.Summary = pythonruntime.PythonExecutableMissingSummary()
		status.RecommendedAction = "可以执行重建 Runtime 修复"
	case len(missing) > 0:
		status.Code = "runtime_incomplete"
		status.Severity = "error"
		status.Summary = pythonruntime.RuntimeIncompleteSummary()
		status.RecommendedAction = "建议重建 Runtime 以补齐缺失组件"
	default:
		importItems, importMissing, importErr := evaluatePythonImports(runtimeDir, pythonPath, requirements)
		status.Items = append(status.Items, importItems...)
		status.Missing = append(status.Missing, importMissing...)

		switch {
		case importErr != nil:
			status.Ready = false
			status.Code = "python_runtime_broken"
			status.Severity = "error"
			status.Summary = pythonruntime.PythonImportFailedSummary()
			status.RecommendedAction = "建议重建 Runtime；若仍失败，再检查打包内容"
		case len(importMissing) > 0:
			status.Ready = false
			status.Code = "python_package_unhealthy"
			status.Severity = "error"
			status.Summary = pythonruntime.PythonPackageUnhealthySummary()
			status.RecommendedAction = "建议重建 Runtime 以修复包依赖"
		default:
			status.Code = "ready"
			status.Severity = "info"
			status.Summary = pythonruntime.RuntimeReadySummary()
			status.RecommendedAction = "无需处理"
		}
	}

	return status, nil
}

func evaluatePythonImports(runtimeDir string, pythonPath string, requirements []Requirement) ([]CheckItem, []string, error) {
	modules := make([]Requirement, 0, len(requirements))
	for _, requirement := range requirements {
		if requirement.ImportName != "" {
			modules = append(modules, requirement)
		}
	}
	if len(modules) == 0 {
		return nil, nil, nil
	}

	script := buildImportCheckScript(modules)
	cmd := exec.Command(pythonPath, "-c", script)
	cmd.Env = buildImportCheckEnv(runtimeDir)
	cmd.SysProcAttr = processutil.WithoutConsoleWindow()
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	output, err := cmd.Output()
	if err != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = strings.TrimSpace(string(output))
		}
		if message == "" {
			message = err.Error()
		}

		return []CheckItem{
			{
				Key:      "python_import_probe",
				Label:    "Python 导入自检",
				Category: "runtime",
				Status:   "failed",
				Message:  message,
				Exists:   false,
			},
		}, nil, err
	}

	statusByKey := map[string]string{}
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, line := range lines {
		parts := strings.SplitN(strings.TrimSpace(line), "|", 2)
		if len(parts) != 2 {
			continue
		}
		statusByKey[parts[0]] = parts[1]
	}

	items := make([]CheckItem, 0, len(modules))
	missing := make([]string, 0)
	for _, requirement := range modules {
		result := statusByKey[requirement.Key]
		exists := result == "ok"
		if !exists {
			missing = append(missing, requirement.Label)
		}

		items = append(items, CheckItem{
			Key:          requirement.Key + "_import",
			Label:        requirement.Label + " 导入检查",
			RelativePath: requirement.RelativePath,
			Category:     "import",
			Status:       mapCheckStatus(exists),
			Message:      mapImportMessage(exists),
			Exists:       exists,
		})
	}

	return items, missing, nil
}

func buildImportCheckScript(requirements []Requirement) string {
	lines := []string{
		"import importlib",
	}
	for _, requirement := range requirements {
		lines = append(lines,
			"try:",
			"    importlib.import_module('"+requirement.ImportName+"')",
			"    print('"+requirement.Key+"|ok')",
			"except Exception:",
			"    print('"+requirement.Key+"|missing')",
		)
	}

	return strings.Join(lines, "\n")
}

func buildImportCheckEnv(runtimeDir string) []string {
	env := append([]string{}, os.Environ()...)
	runtimeLibDir := filepath.Join(runtimeDir, pythonruntime.SharedLibraryRelativeDir())
	env = append(env, "DYLD_LIBRARY_PATH="+runtimeLibDir+string(os.PathListSeparator)+os.Getenv("DYLD_LIBRARY_PATH"))
	return env
}

func mapCheckStatus(exists bool) string {
	if exists {
		return "ok"
	}

	return "missing"
}

func mapFileMessage(exists bool) string {
	if exists {
		return "已找到"
	}

	return "缺失"
}

func mapImportMessage(exists bool) string {
	if exists {
		return "导入成功"
	}

	return "导入失败"
}
