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
		// 最高内容是「展开安装选项 + 已选旧版目录 + 状态折两行」，实测 625px；
		// main 底 padding 由 56 收到 20 后再减 36px，得 589px。取 600 留 11px 余量，
		// 兼顾滚动条不出现与窗口不过长。
		Title: "PlotKityCat 安装", Width: 620, Height: 600,
		MinWidth: 620, MinHeight: 600, DisableResize: true, Frameless: true,
		BackgroundColour: options.NewRGB(255, 255, 255),
		AssetServer:      &assetserver.Options{Assets: ui},
		Bind:             []interface{}{app}, OnStartup: app.Startup, OnBeforeClose: app.BeforeClose,
		Windows: &windows.Options{DisablePinchZoom: true},
	})
	if err != nil {
		startupdiag.ShowStartupError("PlotKityCat 安装", startupdiag.StartupErrorMessage(err))
	}
}
