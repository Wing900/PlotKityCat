param(
    [string]$Version = "",
    [string]$SigningKeyPath = $env:PLOTKITYCAT_RELEASE_KEY,
    [string]$TargetCommit = "",
    [switch]$Publish
)
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "release-version.ps1")
if (-not $Version) { $Version = Get-AppVersionFromFile -Path (Join-Path $repoRoot "version.json") }
Assert-AppVersion -Version $Version
if (-not $SigningKeyPath) { throw "PLOTKITYCAT_RELEASE_KEY must point to the private key outside the repository." }
if (-not $TargetCommit) { $TargetCommit = (& git rev-parse HEAD).Trim() }
& (Join-Path $PSScriptRoot "prepare-update-release.ps1") -Version $Version -SigningKeyPath $SigningKeyPath
& (Join-Path $PSScriptRoot "build-installer.ps1") -Version $Version -SigningKeyPath $SigningKeyPath
$releaseDir = Join-Path $repoRoot "build/release"
$updateDir = Join-Path $repoRoot "build/update/$Version"
$assets = @(
    (Join-Path $releaseDir "PlotKityCat-Setup-$Version-windows-amd64.exe"),
    (Join-Path $releaseDir "setup-manifest.json"),
    (Join-Path $updateDir "PlotKityCat-$Version-windows-amd64.zip"),
    (Join-Path $updateDir "PlotKityCat-$Version-windows-amd64.exe"),
    (Join-Path $updateDir "manifest.json"),
    (Join-Path $updateDir "manifest-legacy.json")
)
# Only Setup is an end-user package. ZIP/EXE artifacts are protocol payloads
# for the signed updater and the one-time migration of older clients.
$notes = Join-Path $repoRoot ".tmp/release-notes-$Version.txt"
New-Item -ItemType Directory -Path (Split-Path -Parent $notes) -Force | Out-Null
[IO.File]::WriteAllText($notes, "Windows 10/11 x64 请下载安装 Setup.exe。`n升级保留作品与配置，支持失败回退。", [Text.UTF8Encoding]::new($false))
$cli = Get-Command gh -ErrorAction SilentlyContinue
$gh = if ($cli) { $cli.Source } else { Join-Path $repoRoot ".cache/gh/bin/gh.exe" }
$args = @("release", "create", "v$Version", "--repo", "Wing900/PlotKityCat", "--target", $TargetCommit, "--title", "v$Version", "--notes-file", $notes)
if (-not $Publish) { $args += "--draft" }
& $gh @args @assets
if ($LASTEXITCODE -ne 0) { throw "GitHub release creation failed." }
