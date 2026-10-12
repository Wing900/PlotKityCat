//go:build setup && windows

package main

import (
	"embed"
	"io/fs"

	"plotkitycat/internal/setup"
	"plotkitycat/internal/startupdiag"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed ui/index.html ui/logo.png ui/setup.js
var assets embed.FS

//go:embed payload/install-engine.exe
var engine []byte

func main() {
	ui, err := fs.Sub(assets, "ui")
	if err != nil {
		panic(err)
	}
	app := setup.New(engine)
	err = wails.Run(&options.App{
		// 高度由前端实测内容高驱动（见 setup.js fitWindow 与 Installer.FitWindow）：
		// 折叠时窗口矮，展开安装选项时自动长高，永不出现滚动条。
		// 初始高度只需容纳折叠态；本机 WebView2 渲染缩放 1.755 与建窗 DPI 1.5 不一致，
		// 因此不能把 Wails 的尺寸等同于 CSS 像素，换算交给前端按实测量。
		Title: "PlotKityCat 安装", Width: setup.WindowWidth, Height: setup.InitialWindowHeight,
		MinWidth: setup.WindowWidth, MinHeight: 420, DisableResize: true, Frameless: true,
		BackgroundColour: options.NewRGB(255, 255, 255),
		AssetServer:      &assetserver.Options{Assets: ui},
		Bind:             []interface{}{app}, OnStartup: app.Startup, OnBeforeClose: app.BeforeClose,
		Windows: &windows.Options{DisablePinchZoom: true},
	})
	if err != nil {
		startupdiag.ShowStartupError("PlotKityCat 安装", startupdiag.StartupErrorMessage(err))
	}
}
