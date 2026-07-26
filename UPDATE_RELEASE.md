# PlotKityCat 更新发布说明

应用发布与在线更新流程。runtime 重建见 [RUNTIME_BUILD.md](D:/projects/plotkitycat/RUNTIME_BUILD.md)。
本地开发环境准备见 [DEVELOPMENT.md](D:/projects/plotkitycat/DEVELOPMENT.md)。

当前发布模型：

- 更新客户端只更新 `exe`
- runtime 走整包发布，不走在线更新
- 更新服务器固定为 `https://update.5051001.xyz/plotkitycat`
- 服务端只需要维护：
  - `stable/manifest.json`
  - `releases/PlotKityCat-版本号-windows-amd64.exe`

更新安装安全模型：

- 下载阶段校验 HTTPS、文件大小与 SHA-256
- 安装前再次校验下载文件，并在目标目录生成 Staged EXE
- Installer 完成 Ready Handshake 后，应用通过 Wails Graceful Shutdown 退出
- EXE 使用 Windows `MoveFileEx` Atomic Replace
- 新进程在 Startup Health Window 内退出时，Installer 自动 Rollback 并重启旧版本
- `config/updates/state.json` 使用 Atomic File Write，失败后保留重试状态

runtime 约定：

- `resources/runtime/runtime.7z` 作为 release asset 外部分发
- 当前使用的资产名是 `runtime.7z`
- 从零重建流程见 [RUNTIME_BUILD.md](D:/projects/plotkitycat/RUNTIME_BUILD.md)

## 1. 先改版本号

编辑：

- [version.json](/D:/projects/PlotKityCat/version.json)

把 `appVersion` 改成要发布的版本，例如：

```json
{
  "appVersion": "0.0.3.1"
}
```

相关脚本如果不手动传 `-Version`，都会默认读取这里的 `appVersion`：

- `tools/build-versioned-app.ps1`
- `tools/prepare-update-release.ps1`
- `tools/package-release.ps1`

## 2. 构建应用 exe

在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-versioned-app.ps1
```

或者显式指定版本：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-versioned-app.ps1 -Version 0.0.3.1
```

产物：

- [build/bin/PlotKityCat.exe](/D:/projects/PlotKityCat/build/bin/PlotKityCat.exe)
- `build/bin/build-metadata.json`

后续发布脚本会核对 `build-metadata.json` 与目标版本；版本不一致时直接终止，防止旧 EXE 被包装成新版本。

## 3. 生成在线更新产物

运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\prepare-update-release.ps1
```

或者：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\prepare-update-release.ps1 -Version 0.0.3.1
```

产物目录：

- [build/update](/D:/projects/PlotKityCat/build/update)

对应版本目录里会生成：

- `PlotKityCat-0.0.3.1-windows-amd64.exe`
- `manifest.json`

说明：

- `manifest.json` 会自动写入下载地址和 sha256
- `manifest.json` 会写入 EXE 字节数，客户端下载时同时校验
- 默认下载地址前缀是 `https://update.5051001.xyz/plotkitycat/releases`

## 4. 生成完整下载包

运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\package-release.ps1
```

或者：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\package-release.ps1 -Version 0.0.3.1
```

产物：

- 便携目录：`build/release/PlotKityCat-v0.0.3.1`
- 压缩包：`build/release/PlotKityCat-v0.0.3.1.zip`

说明：

- 这个 zip 会包含 `PlotKityCat.exe`、`resources/runtime/runtime.7z`、`resources/runtime/7zip/` 和 `Scripts/`
- 这个 zip 还会包含 `resources/screeningzoom/zoomit.exe`
- 因此发布完整包前，必须先在本地准备好 `resources/runtime/runtime.7z`
- 并且必须准备好 `zoomit.exe`；推荐固定放在 `resources/screeningzoom/zoomit.exe`
- 当前推荐先按 [RUNTIME_BUILD.md](/D:/projects/plotkitycat/RUNTIME_BUILD.md:1) 用裁剪开关重建 runtime，再执行完整打包
- 在线更新仍只替换 EXE；新增或调整 `Scripts/`、Runtime、ScreeningZoom 时，必须同步发布完整 zip

`package-release.ps1` 对 `zoomit.exe` 的查找顺序固定为：

1. `resources/screeningzoom/zoomit.exe`
2. `thirdparty/screeningzoom/build/Release/zoomit.exe`
3. `thirdparty/screeningzoom/build/zoomit.exe`

如果三处都没有，脚本会直接失败，不再生成缺失放映工具的发布包。

## 5. 上传到更新服务器

服务器：

- `root@149.28.135.102`

更新文件目录：

- `/var/www/update.5051001.xyz/plotkitycat/releases/`
- `/var/www/update.5051001.xyz/plotkitycat/stable/`

先上传版本 exe：

```powershell
scp .\build\update\0.0.3.1\PlotKityCat-0.0.3.1-windows-amd64.exe root@149.28.135.102:/var/www/update.5051001.xyz/plotkitycat/releases/
```

再上传 manifest：

```powershell
scp .\build\update\0.0.3.1\manifest.json root@149.28.135.102:/var/www/update.5051001.xyz/plotkitycat/stable/manifest.json
```

注意：

- 先传 exe，再覆盖 `stable/manifest.json`
- 因为客户端一旦读到新的 manifest，就会按里面的 URL 去下载 exe

## 6. 发布后验证

本机先验证 manifest：

```powershell
curl.exe -I https://update.5051001.xyz/plotkitycat/stable/manifest.json
```

再验证 exe：

```powershell
curl.exe -I https://update.5051001.xyz/plotkitycat/releases/PlotKityCat-0.0.3.1-windows-amd64.exe
```

如果都返回 `200 OK`，说明更新源可用。

## 7. 最短发布流程

仅记录最短发布顺序：

1. 改 [version.json](/D:/projects/PlotKityCat/version.json) 的 `appVersion`
2. 执行 `.\tools\build-versioned-app.ps1`
3. 执行 `.\tools\prepare-update-release.ps1`
4. 执行 `.\tools\package-release.ps1`
5. 上传 `build/update/版本号/` 里的 `exe`
6. 把 `build/update/版本号/manifest.json` 覆盖到服务器 `stable/manifest.json`

### Updater Bootstrap 发布

Updater 修复会从安装了新 Updater 的版本开始生效。旧版本升级到首个修复版本时，安装动作仍由旧 Updater 执行。

安全发布顺序：

1. 首个修复版本优先发布完整 zip
2. 确认用户运行的 EXE 已包含新 Updater
3. 后续版本再验证 Check → Download → Graceful Restart → Health Check → Cleanup
4. 验证成功后更新 `stable/manifest.json`

## 8. 固定约定

- 更新 manifest 地址：`https://update.5051001.xyz/plotkitycat/stable/manifest.json`
- 更新 exe 文件名格式：`PlotKityCat-版本号-windows-amd64.exe`
- 完整发布包目录格式：`build/release/PlotKityCat-v版本号`
- 完整发布包 zip 格式：`build/release/PlotKityCat-v版本号.zip`
- runtime release 页面格式：`https://github.com/Wing900/PlotKityCat/releases/tag/v版本号`
- runtime 下载地址格式：`https://github.com/Wing900/PlotKityCat/releases/download/v版本号/runtime.7z`
- 当前示例：`https://github.com/Wing900/PlotKityCat/releases/download/v0.0.3.1/runtime.7z`

## 9. 只发完整包，不更新在线更新

只需要：

1. 改 `version.json`
2. 执行 `.\tools\build-versioned-app.ps1`
3. 执行 `.\tools\package-release.ps1`

这样会得到完整 zip，但不会更新服务器上的在线更新入口。

## 10. 常见问题

### Q1. 不传 `-Version` 会怎样？

会自动读取 [version.json](/D:/projects/PlotKityCat/version.json) 里的 `appVersion`。

### Q2. 用户点“检查更新”实际读哪里？

固定读：

- `https://update.5051001.xyz/plotkitycat/stable/manifest.json`

### Q3. 为什么一定要最后再传 manifest？

因为 manifest 一更新，旧版本客户端就可能立刻看到新版本；如果这时 exe 还没上传完，下载会失败。

### Q4. 哪些目录不需纳入 Git？

以下产物目录已在 `.gitignore` 中排除：

- `build/bin/`
- `build/release/`
- `build/update/`
