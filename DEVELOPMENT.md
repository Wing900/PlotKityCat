# PlotKityCat Development

本地开发启动、runtime 与构建发布、Git 仓库约定。

## 环境

- Windows
- Go 1.22+
- Node.js 18+
- Wails v2

首次准备：

```powershell
cd frontend
npm install
cd ..
```

开发启动：

```powershell
wails dev
```

## 版本

应用版本唯一来源为 `version.json` 中的 `appVersion`。构建与发布脚本默认都读取这里的值。

## 本地状态

- `config/app-state.json` 保存版本化的应用状态，新手引导使用 `onboarding` 字段。
- 新发布包不携带 `config/`；应用创建 Store 时先检查既有 `config/`，早于本次启动写入状态。
- 历史用户写入 `suppressed / existing-user`，不自动显示教程。
- 教程模板缺失时写入 `suppressed / template-missing`，后续启动不再重复尝试。
- 新用户依次记录 `unseen`、`started`、`dismissed`、`completed`；后三者均停止自动启动。
- `Scripts/新手引导/` 保存教程内容，状态与内容采用独立生命周期。

## Runtime

项目运行依赖便携 Python runtime。约定如下：

- 占位目录：`resources/runtime/`
- 本地发布输入：`resources/runtime/runtime.7z`
- 本地展开目录：`runtime/`
- 临时展开目录：`runtime.tmp/`
- 元数据文件：`runtime.version.json`
- runtime 通过 GitHub Release asset 分发
- 仓库仅跟踪 runtime 脚本和元数据

准备 runtime 压缩包：

```powershell
.\tools\prepare-runtime.ps1 -SourceRuntimeDir <你的 runtime 目录>
```

默认核心库：

- Python 标准库
- numpy
- matplotlib
- scipy
- PyQt5

`runtime.version.json` 必须填写真实版本，`pending` 仅为占位值。

从零重建 runtime 的完整说明见 [RUNTIME_BUILD.md](D:/projects/plotkitycat/RUNTIME_BUILD.md)。

## 构建与打包

构建 exe：

```powershell
.\tools\build-versioned-app.ps1
```

构建成功会同时生成 `build/bin/build-metadata.json`。打包与在线更新产物脚本会强制核对其中的版本，禁止复用旧 EXE。

生成完整发布包：

```powershell
.\tools\package-release.ps1
```

生成在线更新产物：

```powershell
.\tools\prepare-update-release.ps1
```

如果要覆盖默认版本：

```powershell
.\tools\build-versioned-app.ps1 -Version 0.0.3.5
.\tools\package-release.ps1 -Version 0.0.3.5
.\tools\prepare-update-release.ps1 -Version 0.0.3.5
```

## 发布前检查

- 确认 `version.json` 版本正确
- 确认 `resources/runtime/runtime.7z` 存在
- 确认 `zoomit.exe` 已经准备好，优先放在 `resources/screeningzoom/zoomit.exe`
- 如果还没放到 `resources/screeningzoom/zoomit.exe`，至少确认存在开发构建产物 `thirdparty/screeningzoom/build/Release/zoomit.exe`
- 确认 `runtime.version.json` 已填写真实版本
- 确认 `Scripts/` 中示例内容就是准备随包分发的内容
- 确认 `config/` 没有本机账号、缓存、更新状态等脏数据

## 仓库约定

应跟踪：

- `internal/`
- `frontend/`
- `tools/`
- `build/windows/`
- `resources/` 下需要随项目维护的静态资源与占位文件
- `resources/runtime/.gitkeep`
- `resources/screeningzoom/.gitkeep`
- `README.md`
- `DEVELOPMENT.md`
- `UPDATE_RELEASE.md`
- `RUNTIME_BUILD.md`
- `version.json`
- `runtime.version.json`
- `Scripts/` 下随产品发布的预制工作区

不应跟踪：

- `config/`
- `runtime/`
- `runtime.tmp/`
- `build/bin/`
- `build/release/`
- `build/update/`
- `packaging/`

发布服务器更新步骤见 [UPDATE_RELEASE.md](D:/projects/plotkitycat/UPDATE_RELEASE.md)。
