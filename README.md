<p align="center">
  <a href="https://github.com/Wingflow/PlotKityCat">
    <img src="logoandapp.svg" alt="PlotKityCat Logo" width="180">
  </a>
</p>

<h1 align="center">PlotKityCat</h1>

<p align="center">
  一款专为数学老师打造的 AI-native 可视化教学工具。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Wails-v2-red?style=flat-square" alt="Wails">
  <img src="https://img.shields.io/badge/Vue-3-4fc08d?style=flat-square" alt="Vue">
  <img src="https://img.shields.io/badge/Go-1.21+-00add8?style=flat-square" alt="Go">
  <img src="https://img.shields.io/badge/Python-3.13+-3776ab?style=flat-square" alt="Python">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License">
</p>

## 简介

请允许我为你介绍这只可爱的，小猫！
PlotKityCat 是一个开源的数学可视化工具，支持运行 Matplotlib 代码并生成交互式图形。集成 AI 功能，支持通过自然语言提示词生成绘图代码。软件采用便携式设计，支持优盘即插即用，方便在教室等不同环境下快速部署与演示。

## 视频介绍

https://github.com/user-attachments/assets/df8167a7-d1e9-4f6a-a42d-de15596a4456

## 开发初衷

PlotKityCat 源于对 GGBPuppy 开发过程中 GGB Web API 封闭性的反思。我们转向 Matplotlib，为初高中数学可视化提供 AI-native 方案。

> 那天，我在研究GGB的webapi，AI总是写下错误的GGB代码，让我的另外一个项目GGBpuppy很受挫折。我突然发现一个GGB的api接口不完整，于是以开发者的口吻发了一封信给他们团队，结果收到了他们希望我付钱的要求......好吧，那天晚上关掉它肮脏线条和色彩的窗口，我梦见了Jobs.....

1. **开源**：好的工具应该像太阳一样，太阳是闭源的吗？
2. **美**：拒绝 GGB 沉闷的色彩与线条。
3. **AI 原生**：通过 AI 直接生成可视化代码，无需老师学习编程。

PlotKityCat 支持优盘便携，旨在让老师将其带入教室、讲台及学生手中。

## 功能特性

- **AI 绘图**：通过自然语言描述数学概念，由 AI 生成 Matplotlib 绘图代码。支持设计和生成代码双流程。

- **笔记系统**：集成 Markdown 与 LaTeX 公式渲染，绑定代码，看到可视化的结果，更看到可视化的设计。
- **便携运行**：内置 Python 运行时，支持U盘即插即用，让小猫真的可以在课堂中一展身手。
- **.pck导入导出** ： 支持导出和导入场景包，希望用户之间可以交流自己的可视化成果。

## 技术栈

- **前端**: Vue 3, TypeScript, Vite
- **后端**: Go, Wails Framework
- **运行时**: Python runtime (Matplotlib, NumPy, SciPy, PyQt5)
- **AI 接口**: OpenAI API / 自定义兼容接口

## 快速开始

1. **下载**：获取便携版压缩包。
2. **配置**：设置 AI 服务商 API Key。
3. **运行**：新建场景，笔记区输入描述，右键点击可视化或可视化设计运行。

## 开发者指南

### 环境要求
- **Windows / macOS**
- **Go**: 1.21+
- **Node.js**: 18+
- **Wails**: v2.x

### 开发启动
```powershell
cd frontend
npm install
cd ..
wails dev
```

### 版本来源

应用版本唯一来源：

- `version.json`

### Runtime

项目运行依赖便携 Python runtime：

- runtime 占位目录：`resources/runtime/`
- 发布输入：本地放置的 `resources/runtime/runtime.zip`
- 本地展开目录：`runtime/`
- 临时展开目录：`runtime.tmp/`
- 元数据文件：`runtime.version.json`

注意：

- `resources/runtime/runtime.zip` 默认不提交到 Git
- 这个文件应作为 release asset 或外部制品分发

准备 Windows runtime 压缩包：

```powershell
.\tools\prepare-runtime.ps1 -SourceRuntimeDir <你的 runtime 目录>
```

准备 macOS arm64 runtime 压缩包：

```bash
./tools/prepare-runtime-macos.sh
```

当前默认核心库：

- Python 标准库
- numpy
- matplotlib
- scipy
- PyQt5

如何从零重建 runtime，见 [RUNTIME_BUILD.md](D:/projects/plotkitycat/RUNTIME_BUILD.md)。

### 打包入口

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

更详细的开发与发布说明见 [DEVELOPMENT.md](D:/projects/PlotKityCat/DEVELOPMENT.md)。

## 致谢

- [Matplotlib](https://matplotlib.org/): 本项目核心渲染引擎。
- [ManimCat](https://github.com/Wing900/ManimCat): 提供了开发的基础和灵感。



## 期待

期待更多的可视化资源可以被开发，开源，开放，打破教育资源长期以来的垄断，让我们的教育越来越清晰，越来越公平！

希望有一天，我的用户足够多，我们可以开一个PlotKityCat交流社区！
