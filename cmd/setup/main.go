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
		// 高度按真机实测反推，取“绝对不会出滚动条”的值。
		// 本机（2560x1600，150% 缩放）Wails 按 150% 建窗，而 WebView2 渲染器按
		// devicePixelRatio 1.755 换算 CSS 像素，CSS 视口 = 请求高 × 0.855，比设计值小 15%。
		// 真机量得内容最高 588px（展开安装选项 + 已选旧版目录 + 状态折两行），
		// 需求请求高 = 588 × 1.05 / 0.855 ≈ 722，取 730 → CSS 视口 624px，余 36px。
		// 探针在真机 8 种状态下实测溢出均为 0。
		Title: "PlotKityCat 安装", Width: 620, Height: 730,
		MinWidth: 620, MinHeight: 730, DisableResize: true, Frameless: true,
		BackgroundColour: options.NewRGB(255, 255, 255),
		AssetServer:      &assetserver.Options{Assets: ui},
		Bind:             []interface{}{app}, OnStartup: app.Startup, OnBeforeClose: app.BeforeClose,
		Windows: &windows.Options{DisablePinchZoom: true},
	})
	if err != nil {
		startupdiag.ShowStartupError("PlotKityCat 安装", startupdiag.StartupErrorMessage(err))
	}
}
