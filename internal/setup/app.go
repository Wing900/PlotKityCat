// Package setup connects the branded installer UI to the NSIS installation
// engine. It does not own application data or implement a second updater.
package setup

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"plotkitycat/internal/upgrade"
	"plotkitycat/internal/version"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Configuration struct {
	InstallDir string `json:"installDir"`
	HasData    bool   `json:"hasData"`
	Version    string `json:"version"`
	// WindowHeight lets the frontend translate CSS pixels into the logical
	// pixels Wails passes to the window, which can differ (see FitWindow).
	WindowHeight int `json:"windowHeight"`
}

// WindowWidth and InitialWindowHeight are the logical-pixel size the window is
// created with. The options panel changes the content height by ~150px, so the
// frontend keeps the window fitted to its content through FitWindow; the
// initial height only has to hold the collapsed state.
const (
	WindowWidth         = 620
	InitialWindowHeight = 520
)

// Bounds for FitWindow, in the same logical pixels. A collapsed installer needs
// about 433 CSS pixels of content; renderer scale can make the fitting request
// larger than the CSS height, so the floor stays below it.
const (
	minWindowHeight = 420
	maxWindowHeight = 1100
)

type Progress struct {
	Message string `json:"message"`
	Percent int    `json:"percent"` // -1 means the stage has no byte-level progress.
}

type Installer struct {
	mu        sync.Mutex
	ctx       context.Context
	payload   []byte
	running   bool
	installed string
}

func New(payload []byte) *Installer { return &Installer{payload: payload} }

func (a *Installer) Startup(ctx context.Context) { a.ctx = ctx }

func (a *Installer) BeforeClose(ctx context.Context) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.running
}

func (a *Installer) Configuration() (Configuration, error) {
	root, err := os.UserCacheDir()
	if err != nil {
		return Configuration{}, err
	}
	install := registeredInstallDir()
	if install == "" {
		install = filepath.Join(root, "Programs", "PlotKityCat")
	}
	_, err = os.Stat(filepath.Join(root, "PlotKityCat", ".initialized-v1"))
	return Configuration{
		InstallDir:   install,
		HasData:      err == nil,
		Version:      version.Current(),
		WindowHeight: InitialWindowHeight,
	}, nil
}

// FitWindow resizes the window to a height the frontend measured from its own
// content, in the logical pixels Wails converts with the window DPI. WebView2
// can lay content out at a renderer scale that disagrees with that DPI, so the
// frontend scales the last request by the measured content instead of trusting
// the CSS viewport to equal the window height.
func (a *Installer) FitWindow(height int) {
	if height < minWindowHeight {
		height = minWindowHeight
	}
	if height > maxWindowHeight {
		height = maxWindowHeight
	}
	runtime.WindowSetSize(a.ctx, WindowWidth, height)
}

func (a *Installer) SelectInstallDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{Title: "选择安装位置"})
	if err != nil || dir == "" {
		return dir, err
	}
	if !strings.EqualFold(filepath.Base(dir), "PlotKityCat") {
		dir = filepath.Join(dir, "PlotKityCat")
	}
	return dir, validateDestination(dir)
}

func (a *Installer) SelectLegacyDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{Title: "选择含 Scripts 的旧版目录"})
	if err != nil || dir == "" {
		return dir, err
	}
	return dir, validateLegacy(dir)
}

func (a *Installer) Install(destination, legacy string) error {
	a.mu.Lock()
	if a.running {
		a.mu.Unlock()
		return fmt.Errorf("安装正在进行")
	}
	a.running = true
	a.mu.Unlock()
	defer func() { a.mu.Lock(); a.running = false; a.mu.Unlock() }()

	destination = filepath.Clean(os.ExpandEnv(strings.TrimSpace(destination)))
	if err := validateDestination(destination); err != nil {
		return err
	}
	if legacy != "" {
		if err := validateLegacy(legacy); err != nil {
			return err
		}
	}
	a.emit("准备安装", 0)
	if err := os.MkdirAll(filepath.Dir(destination), 0700); err != nil {
		return err
	}
	payloadStage, err := os.MkdirTemp(filepath.Dir(destination), ".plotkitycat-stage-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(payloadStage)
	stage, err := os.MkdirTemp("", "PlotKityCat-setup-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(stage) // Only the private directory created by this call.
	worker := filepath.Join(stage, "install-engine.exe")
	if err := os.WriteFile(worker, a.payload, 0o600); err != nil {
		return err
	}
	progressFile := filepath.Join(stage, "progress.txt")
	cmd := installCommand(worker, payloadStage, legacy, progressFile)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("无法启动安装程序：%w", err)
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()
	lastStage := ""
	for {
		select {
		case err := <-done:
			if err != nil {
				if message := readWorkerError(progressFile + ".error"); message != "" {
					return fmt.Errorf("%s", message)
				}
				return fmt.Errorf("安装未完成，请检查权限和剩余空间：%w", err)
			}
			if _, err := os.Stat(filepath.Join(payloadStage, "PlotKityCat.exe")); err != nil {
				return fmt.Errorf("安装文件不完整，请重试")
			}
			a.emit("正在确认新版启动", -1)
			job, err := upgrade.Start(upgrade.Plan{Target: destination, Stage: payloadStage, Version: version.Current(), RegisterWorker: worker})
			if err != nil {
				return err
			}
			defer os.RemoveAll(job.Root)
			if err := job.Cmd.Wait(); err != nil {
				if message, readErr := os.ReadFile(filepath.Join(job.Root, "error.txt")); readErr == nil {
					return fmt.Errorf("安装未完成：%s", message)
				}
				return fmt.Errorf("安装未完成，已尝试恢复旧版：%w", err)
			}
			a.mu.Lock()
			a.installed = destination
			a.mu.Unlock()
			a.emit("安装完成", 100)
			return nil
		case <-ticker.C:
			content, err := os.ReadFile(progressFile)
			if err != nil {
				continue
			}
			stage := strings.TrimSpace(string(content))
			if stage == lastStage {
				continue
			}
			lastStage = stage
			switch stage {
			case "10":
				a.emit("准备安装", 10)
			case "20":
				a.emit("准备 WebView2", -1)
			case "40":
				a.emit("正在安装", -1)
			case "90":
				a.emit("创建快捷方式", 90)
			default:
				if percent, err := strconv.Atoi(stage); err == nil && percent < 100 {
					a.emit("正在安装", percent)
				}
			}
		}
	}
}

func (a *Installer) OpenApplication() error {
	a.mu.Lock()
	dir := a.installed
	a.mu.Unlock()
	if dir == "" {
		return fmt.Errorf("请先完成安装")
	}
	// Activation already launched and acknowledged the application.
	runtime.Quit(a.ctx)
	return nil
}

func (a *Installer) Minimize() { runtime.WindowMinimise(a.ctx) }
func (a *Installer) Close()    { runtime.Quit(a.ctx) }

func (a *Installer) emit(message string, percent int) {
	runtime.EventsEmit(a.ctx, "setup:progress", Progress{Message: message, Percent: percent})
}
