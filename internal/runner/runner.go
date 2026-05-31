package runner

import (
	"bytes"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"

	"plotkitycat/internal/paths"
	"plotkitycat/internal/processutil"
	"plotkitycat/internal/pythonruntime"
	"plotkitycat/internal/workspaces"
)

type Request struct {
	OnError  func(error)
	OnFinish func()
	OnStart  func()
	OnStop   func()
}

type RunError struct {
	Type      string
	Traceback string
	Err       error
}

func (e *RunError) Error() string {
	if e.Traceback != "" {
		return e.Type + "\n" + e.Traceback
	}

	if e.Err != nil {
		return e.Type + ": " + e.Err.Error()
	}

	return e.Type
}

type Runner struct {
	mu         sync.Mutex
	running    bool
	stopping   bool
	cmd        *exec.Cmd
	workspaces *workspaces.Manager
}

func New(workspaceManager *workspaces.Manager) *Runner {
	return &Runner{workspaces: workspaceManager}
}

func (r *Runner) Run(sceneName string, req Request) error {
	r.mu.Lock()
	if r.running {
		r.mu.Unlock()
		return errors.New("a python script is already running")
	}

	python, args, err := resolvePythonCommand()
	if err != nil {
		r.mu.Unlock()
		return err
	}

	runtimeDir, err := paths.RuntimeDir()
	if err != nil {
		r.mu.Unlock()
		return err
	}

	scriptsDir, err := r.workspaces.CurrentDir()
	if err != nil {
		r.mu.Unlock()
		return err
	}

	sceneDir := filepath.Join(scriptsDir, sceneName)
	scriptPath := filepath.Join(sceneDir, "main.py")
	absScriptPath, err := filepath.Abs(scriptPath)
	if err != nil {
		r.mu.Unlock()
		return err
	}

	cmd := exec.Command(python, append(args, absScriptPath)...)
	cmd.Dir = sceneDir
	cmd.Env = buildPythonEnv(runtimeDir)
	cmd.SysProcAttr = processutil.WithoutConsoleWindow()

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	r.cmd = cmd
	r.running = true
	r.mu.Unlock()

	if err := cmd.Start(); err != nil {
		r.finish()
		return err
	}

	if req.OnStart != nil {
		req.OnStart()
	}

	go func() {
		waitErr := cmd.Wait()
		output := strings.TrimSpace(stderr.String())
		stopped := r.finish()

		if stopped {
			if req.OnStop != nil {
				req.OnStop()
			}
			return
		}

		if waitErr != nil && req.OnError != nil {
			req.OnError(&RunError{
				Type:      detectPythonErrorType(output, waitErr),
				Traceback: tail(output, 15),
				Err:       waitErr,
			})
		}

		if waitErr == nil && req.OnFinish != nil {
			req.OnFinish()
		}
	}()

	return nil
}

func (r *Runner) Shutdown() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.cmd != nil && r.cmd.Process != nil {
		_ = killProcessTree(r.cmd.Process.Pid)
	}
}

func (r *Runner) Stop() (bool, error) {
	r.mu.Lock()
	if !r.running || r.cmd == nil || r.cmd.Process == nil {
		r.mu.Unlock()
		return false, nil
	}

	pid := r.cmd.Process.Pid
	r.stopping = true
	r.mu.Unlock()

	if err := killProcessTree(pid); err != nil {
		r.mu.Lock()
		r.stopping = false
		r.mu.Unlock()
		return false, err
	}

	return true, nil
}

func (r *Runner) IsRunning() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.running
}

func (r *Runner) finish() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	wasStopping := r.stopping
	r.running = false
	r.stopping = false
	r.cmd = nil
	return wasStopping
}

func resolvePythonCommand() (string, []string, error) {
	runtimeDir, err := paths.RuntimeDir()
	if err != nil {
		return "", nil, err
	}

	for _, relativePath := range pythonruntime.PythonCandidates() {
		pythonPath := filepath.Join(runtimeDir, relativePath)
		if _, err := os.Stat(pythonPath); err == nil {
			return pythonPath, nil, nil
		}
	}

	return "", nil, errors.New(pythonruntime.PythonNotFoundMessage())
}

func buildPythonEnv(runtimeDir string) []string {
	env := append([]string{}, os.Environ()...)
	qtRoot := filepath.Join(runtimeDir, pythonruntime.PackageRelativePath("PyQt5"), "Qt5")
	qtBinDir := filepath.Join(qtRoot, "bin")
	qtPluginsDir := filepath.Join(qtRoot, "plugins")
	qtPlatformsDir := filepath.Join(qtPluginsDir, "platforms")
	runtimeLibDir := filepath.Join(runtimeDir, pythonruntime.SharedLibraryRelativeDir())

	env = append(env,
		"MPLBACKEND=Qt5Agg",
		"QT_QPA_PLATFORM_PLUGIN_PATH="+qtPlatformsDir,
		"QT_PLUGIN_PATH="+qtPluginsDir,
		"PATH="+qtBinDir+string(os.PathListSeparator)+os.Getenv("PATH"),
		"DYLD_LIBRARY_PATH="+runtimeLibDir+string(os.PathListSeparator)+os.Getenv("DYLD_LIBRARY_PATH"),
	)

	return env
}

func killProcessTree(pid int) error {
	if pid <= 0 {
		return nil
	}

	if runtime.GOOS == "windows" {
		cmd := exec.Command("taskkill", "/T", "/F", "/PID", strconv.Itoa(pid))
		cmd.SysProcAttr = processutil.WithoutConsoleWindow()
		return cmd.Run()
	}

	process, err := os.FindProcess(pid)
	if err != nil {
		return err
	}

	return process.Kill()
}

func detectPythonErrorType(stderr string, fallback error) string {
	lines := strings.Split(strings.TrimSpace(stderr), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		if index := strings.Index(line, ":"); index > 0 {
			candidate := strings.TrimSpace(line[:index])
			if strings.HasSuffix(candidate, "Error") || strings.HasSuffix(candidate, "Exception") {
				return candidate
			}
		}
	}

	if fallback != nil {
		return fallback.Error()
	}

	return "PythonError"
}

func tail(input string, lines int) string {
	if input == "" {
		return ""
	}

	parts := strings.Split(input, "\n")
	if len(parts) <= lines {
		return input
	}

	return strings.Join(parts[len(parts)-lines:], "\n")
}
