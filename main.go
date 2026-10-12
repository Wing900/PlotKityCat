package main

import (
	"embed"
	"fmt"
	"os"

	"plotkitycat/internal/bridge"
	"plotkitycat/internal/installeddata"
	"plotkitycat/internal/instancelock"
	"plotkitycat/internal/startupdiag"
	"plotkitycat/internal/upgrade"
	"plotkitycat/internal/windowmetrics"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	defer func() {
		if recovered := recover(); recovered != nil {
			err := fmt.Errorf("%v", recovered)
			startupdiag.ShowStartupError("PlotKityCat Startup Error", startupdiag.StartupErrorMessage(err))
			os.Exit(1)
		}
	}()

	if recovering, err := upgrade.RecoverStartup(); err != nil {
		startupdiag.ShowStartupError("PlotKityCat Upgrade Recovery", startupdiag.StartupErrorMessage(err))
		return
	} else if recovering {
		return
	}

	lock, err := instancelock.Acquire()
	if err != nil {
		startErr := fmt.Errorf("failed to acquire single-instance lock on 127.0.0.1:49152: %w", err)
		startupdiag.ShowStartupError("PlotKityCat Startup Error", startupdiag.StartupErrorMessage(startErr))
		panic(startErr)
	}
	defer lock.Release()

	if err := installeddata.Initialize(); err != nil {
		startupdiag.ShowStartupError("PlotKityCat Data Initialization Error", startupdiag.StartupErrorMessage(err))
		return
	}

	app := bridge.NewApp()
	initialWindowSize := windowmetrics.InitialWindowSize()
	minimumWindowSize := windowmetrics.MinimumWindowSize()

	err = wails.Run(&options.App{
		Title:     "PlotKityCat",
		Width:     initialWindowSize.Width,
		Height:    initialWindowSize.Height,
		Frameless: true,
		MinWidth:  minimumWindowSize.Width,
		MinHeight: minimumWindowSize.Height,
		Assets:    assets,
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop: true,
		},
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			IsZoomControlEnabled: false,
			ZoomFactor:           1.0,
			DisablePinchZoom:     true,
		},
		OnStartup:  app.Startup,
		OnShutdown: app.Shutdown,
	})
	if err != nil {
		startupdiag.ShowStartupError("PlotKityCat Startup Error", startupdiag.StartupErrorMessage(err))
		os.Exit(1)
	}
}
