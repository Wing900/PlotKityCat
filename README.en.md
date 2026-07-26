[简体中文](./README.md) | English

<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=6B5446&height=120&section=header" alt="" />

<br>

<a href="https://github.com/Wing900/PlotKityCat">
  <img src="logoandapp.svg" width="180" alt="PlotKityCat Logo" />
</a>

<div>
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Paw%20Prints.png" width="38" alt="Cat paws" />
</div>

<h1>
  <picture>
    <img
      src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=38&duration=2800&pause=900&color=6B5446&center=true&vCenter=true&width=680&lines=PlotKityCat+%F0%9F%90%BE;Plot+it+%C2%B7+Note+it+%C2%B7+Teach+it"
      alt="PlotKityCat — Plot it, Note it, Teach it"
    />
  </picture>
</h1>

<p>
  ∫ &nbsp; ∑ &nbsp; ∂ &nbsp; π &nbsp; ∞
</p>

<p>
  <strong>An AI-native visualization tool for mathematics teachers</strong>
</p>

<p>
  Generate Matplotlib visuals from natural language, and keep formulas, code, figures, and teaching notes in one workspace.
</p>

<div>◆ &nbsp; ◆ &nbsp; ◆</div>

<br>

<p>
  <img src="https://img.shields.io/badge/Release-v0.0.5.0-6B5446?style=for-the-badge" alt="Release v0.0.5.0" />
  <img src="https://img.shields.io/badge/Windows-AMD64-6B5446?style=for-the-badge&logo=windows&logoColor=white" alt="Windows AMD64" />
  <img src="https://img.shields.io/badge/AI-Native-6B5446?style=for-the-badge&logo=openai&logoColor=white" alt="AI Native" />
  <img src="https://img.shields.io/badge/License-GPL--3.0-8B7364?style=for-the-badge" alt="GPL-3.0" />
</p>

<p>
  <img src="https://img.shields.io/badge/Wails-v2-8B7364?style=for-the-badge&logo=go&logoColor=white" alt="Wails v2" />
  <img src="https://img.shields.io/badge/Vue-3-8B7364?style=for-the-badge&logo=vuedotjs&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Python-3.13+-8B7364?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.13+" />
</p>

<p>
  <a href="#downloads-for-windows"><strong>Download</strong></a>
  &nbsp;•&nbsp;
  <a href="#video"><strong>Video</strong></a>
  &nbsp;•&nbsp;
  <a href="#features"><strong>Features</strong></a>
  &nbsp;•&nbsp;
  <a href="#quick-start"><strong>Quick Start</strong></a>
  &nbsp;•&nbsp;
  <a href="#documentation"><strong>Documentation</strong></a>
</p>

<br>

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=6B5446&height=90&section=footer" alt="" />

</div>

## What is PlotKityCat?

PlotKityCat provides a natural-language-driven visualization workflow for middle-school and high-school mathematics. A teacher can describe a mathematical concept, diagram, or interactive scene; AI generates Matplotlib code that can then be edited, documented, refined, and reused inside the application.

The application ships with an independent WinPython Runtime, making it suitable for USB drives, classroom computers, and portable working directories. Python code, Markdown, LaTeX formulas, and visualization output are organized around the same scene, reducing the need to jump between separate tools.

## Video

https://github.com/user-attachments/assets/ff90ac18-5fcf-42d4-85f3-be09b3309ed4

## Features

### AI visualization

- Generate Matplotlib plotting code from natural-language instructions.
- Generate, optimize, and repair code.
- Use prompts designed specifically for mathematics teaching and visual quality.
- Follow generation progress through the in-app animated cat.

### Flexible AI integration

- Connect to custom OpenAI-compatible APIs.
- Configure the Base URL, API Key, and Model.
- Keep the AI Provider decoupled from the generation workflow, making compatible services easier to integrate.

### Teaching workspaces

- Manage Python code, Markdown notes, and visualization output in one scene.
- Render LaTeX mathematics inside Markdown notes.
- Create, switch, rename, and organize multiple workspaces and scenes.
- Switch between note-only, code-only, and combined Layout Modes.
- Import and export `.pkcw` workspace packages.

### Design Card

- Generate visual design cards from selected note content.
- Refine a generated card with further instructions.
- Keep design versions for comparison and retrieval.

### First-run guidance

- Guide new users through the main workflow on first launch.
- Use a bundled onboarding workspace as the tutorial environment.
- Cover the main regions, essential interactions, and the basic generation flow.

### Portable runtime and updates

- Ship a complete package with WinPython Runtime, Matplotlib, NumPy, SciPy, and PyQt5.
- Run from a USB drive or an extracted portable directory.
- Check for updates, download them, and restart to install from Settings.
- Verify update files with both Size and SHA256 checks.
- Integrate ScreeningZoom for classroom presentation and focused explanation.

## Downloads for Windows

### Full package

Recommended for first-time users. It includes the application, Runtime, bundled workspaces, and presentation component.

**[Download PlotKityCat v0.0.5.0 full package](https://1820614751.cdn.123clouddisk.com/1820614751/44761845?v=332b4a2982f63f1e0a65285928ed58f6)**

File:

```text
PlotKityCat-v0.0.5.0.zip
```

### Application-only package

For users who already have a complete PlotKityCat environment and only need to replace the application executable.

**[Download PlotKityCat v0.0.5.0 application-only package](https://1820614751.cdn.123clouddisk.com/1820614751/44686802?v=6520da4b1fffa08ad1800deb574343ce)**

File:

```text
PlotKityCat-0.0.5.0-windows-amd64.zip
```

Existing users can check for later updates directly from Settings.

> The current release target is Windows AMD64. macOS and Linux packages are not available yet.

## Quick Start

1. Download and extract the full package.
2. Run `PlotKityCat.exe`.
3. Follow the onboarding tour to learn the workspace.
4. Describe the mathematical visual you want to generate.
5. Continue refining the result in the code, note, and visualization regions.

```text
  /\_/\
 ( •ω•)  "Draw a quadratic function with a parameter slider,
 / >📐    and mark its vertex and axis of symmetry."

       ↓ AI

  y
  │       ╭─╮
  │     ╭─╯ ╰─╮
  └────────────── x
```

In AI Settings, switch to Custom Mode and enter a service endpoint compatible with the OpenAI Chat Completions protocol.

## What is inside a workspace?

```text
Workspace
├─ Scene A
│  ├─ main.py       # Matplotlib code
│  └─ note.md       # Markdown / LaTeX teaching notes
├─ Scene B
│  ├─ main.py
│  └─ note.md
└─ .plotkitycat-scenes.json
```

Multiple workspaces can be packaged into a `.pkcw` file for backup, exchange, and migration.

## Why I built it

PlotKityCat began with a frustrating experience while I was building GGBPuppy.

One day, I was digging through the GeoGebra Web API. AI kept producing GGB code that could not run, and I gradually realized that the model was only part of the problem: the available GGB API was incomplete. I wrote to their team as a developer to confirm what I had found. The response I received was a request for payment.

> That night, I closed the window with its dull lines and colors. Later, I dreamed of Jobs.

The experience made me rethink mathematical teaching software. Why should teachers be constrained by a closed interface? Why should AI keep guessing against an incomplete API? Why should the visual language of a mathematical figure always surrender to the habits of an old tool?

So I turned to Matplotlib. Its Python ecosystem is open, mature, and inspectable, and it gives AI a much clearer space in which to express mathematical intent. That is where PlotKityCat began: teachers describe the teaching idea, code provides precision, and the image carries the explanation.

Three principles guide the project:

1. **Openness**: teaching tools should be inspectable, extensible, and shareable.
2. **Visual quality**: mathematical figures should be clear, restrained, and expressive.
3. **AI-native workflow**: teachers describe their intent, and the tool turns it into code and images.

```text
   /\_/\
  ( -.- )  Mathematics keeps it rigorous.
  / >☕    The cat keeps you company while it renders.
```

## Technology

| Layer | Technology |
| --- | --- |
| Desktop Shell | Wails v2 |
| Frontend | Vue 3, TypeScript, Vite, CodeMirror |
| Backend | Go |
| Visualization | Python 3.13, Matplotlib, NumPy, SciPy |
| Interactive Runtime | WinPython, PyQt5 |
| Notes | Markdown, MathJax / LaTeX |
| AI | OpenAI-compatible API |

## Local Development

### Requirements

- Windows
- Go 1.22+; the Toolchain declared in `go.mod` is recommended
- Node.js 20+
- Wails v2

### Run

```powershell
cd frontend
npm install
cd ..
wails dev
```

### Runtime

Prepare or rebuild the portable Runtime:

```powershell
.\tools\prepare-runtime.ps1 -SourceRuntimeDir <your Runtime directory>
```

See [RUNTIME_BUILD.md](./RUNTIME_BUILD.md) for details.

### Release build

```powershell
.\tools\build-versioned-app.ps1
.\tools\prepare-update-release.ps1
.\tools\package-release.ps1
```

For versioning, the update server, and the complete release flow, see [UPDATE_RELEASE.md](./UPDATE_RELEASE.md).

## Documentation

- [Development and build](./DEVELOPMENT.md)
- [Runtime distribution and rebuild](./RUNTIME_BUILD.md)
- [Online updates and releases](./UPDATE_RELEASE.md)

## Acknowledgements

- [Matplotlib](https://matplotlib.org/): the core visualization engine.
- [ManimCat](https://github.com/Wing900/ManimCat): an early technical foundation and source of inspiration.
- [Wails](https://wails.io/): the desktop application framework joining Go and web technologies.
- [ZoomIt / PowerToys](https://github.com/microsoft/PowerToys/tree/main/src/modules/ZoomIt): the foundation of the classroom presentation helper.

## Vision

I hope more mathematical visualization resources can be developed, opened, and shared, making teaching clearer and high-quality educational resources easier to circulate.

I also hope PlotKityCat can one day become a mathematical visualization community maintained by teachers, students, and creators together.

```text
        /\_/\
       ( ^.^ )
       / づ づ  Let us draw mathematics clearly.
```

## License

[GNU General Public License v3.0](./LICENSE)
