# PlotKityCat Development

## 环境

- Windows / macOS
- Go 1.21+
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

应用版本唯一来源：

- `version.json`

相关脚本都会默认读取这里的 `appVersion`。

## Runtime

项目运行依赖便携 Python runtime：

- runtime 占位目录：`resources/runtime/`
- 发布输入：本地放置的 `resources/runtime/runtime.zip`
- 本地展开目录：`runtime/`
- 临时展开目录：`runtime.tmp/`
- 元数据文件：`runtime.version.json`

约定：

- `resources/runtime/runtime.zip` 默认不提交到 Git
- 该文件应通过 GitHub Release asset 或其他制品存储分发
- 仓库仅跟踪 runtime 脚本、元数据和第三方补丁源码

准备 Windows runtime 压缩包：

```powershell
.\tools\prepare-runtime.ps1 -SourceRuntimeDir <你的 runtime 目录>
```

准备 macOS arm64 runtime 压缩包：

```bash
./tools/prepare-runtime-macos.sh
```

当前默认应保留的核心库：

- Python 标准库
- numpy
- matplotlib
- scipy
- PyQt5

`runtime.version.json` 应同步填写实际 Python 与核心库版本，不要长期保留 `pending`。

从零重建 runtime 的完整说明见 [RUNTIME_BUILD.md](D:/projects/plotkitycat/RUNTIME_BUILD.md)。

## 打包入口

构建 Windows exe：

```powershell
.\tools\build-versioned-app.ps1
```

构建 macOS app：

```bash
./tools/build-versioned-app.sh
```

生成 Windows 发布 zip：

```powershell
.\tools\package-release.ps1
```

生成 macOS 发布 zip：

```bash
./tools/package-release-macos.sh
```

生成自动更新发布物：

```powershell
.\tools\prepare-update-release.ps1
```

如果要覆盖默认版本：

```powershell
.\tools\build-versioned-app.ps1 -Version 0.0.2.1
.\tools\package-release.ps1 -Version 0.0.2.1
.\tools\prepare-update-release.ps1 -Version 0.0.2.1
```

## 发布前检查

- 确认 `version.json` 版本正确
- 确认 `resources/runtime/runtime.zip` 存在
- 确认 `runtime.version.json` 已填写真实版本
- 确认 `Scripts/` 中示例内容就是准备随包分发的内容
- 确认 `config/` 没有本机账号、缓存、更新状态等脏数据

## 仓库约定

应跟踪：

- `internal/`
- `frontend/`
- `tools/`
- `build/windows/`
- `resources/` 下需要随项目维护的静态资源
- `resources/runtime/.gitkeep`
- `README.md`
- `DEVELOPMENT.md`
- `RUNTIME_BUILD.md`
- `version.json`
- `runtime.version.json`

不应跟踪：

- `config/`
- `runtime/`
- `runtime.tmp/`
- `Scripts/`
- `build/bin/`
- `build/release/`
- `build/update/`
- `packaging/`
