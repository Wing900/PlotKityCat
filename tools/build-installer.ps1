param(
    [string]$Version = "",
    [string]$UpdateManifestURL = "https://update.5051001.xyz/plotkitycat/stable-v2/manifest.json",
    [string]$MakeNSISPath = "",
    [string]$WebViewBootstrapperPath = "",
    [ValidatePattern('^[a-zA-Z0-9-]*$')]
    [string]$BuildLabel = "",
    [string]$SigningKeyPath = $env:PLOTKITYCAT_RELEASE_KEY
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "release-version.ps1")
if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = Get-AppVersionFromFile -Path (Join-Path $repoRoot "version.json")
}
$Version = $Version.Trim()
Assert-AppVersion -Version $Version

if ([string]::IsNullOrWhiteSpace($MakeNSISPath)) {
    $compiler = Get-Command makensis.exe -ErrorAction SilentlyContinue
    if ($compiler) {
        $MakeNSISPath = $compiler.Source
    } else {
        $candidates = @(
            (Join-Path ${env:ProgramFiles(x86)} "NSIS/makensis.exe"),
            (Join-Path $env:ProgramFiles "NSIS/makensis.exe"),
            (Join-Path $repoRoot ".cache/nsis/nsis-3.11/makensis.exe")
        )
        $MakeNSISPath = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    }
}
if (-not $MakeNSISPath -or -not (Test-Path -LiteralPath $MakeNSISPath -PathType Leaf)) {
    throw "NSIS compiler missing. Install NSIS or pass -MakeNSISPath pointing to makensis.exe."
}
$MakeNSISPath = (Resolve-Path -LiteralPath $MakeNSISPath).Path

if ([string]::IsNullOrWhiteSpace($WebViewBootstrapperPath)) {
    $bootstrapperDir = Join-Path $repoRoot ".cache/installer"
    New-Item -ItemType Directory -Path $bootstrapperDir -Force | Out-Null
    $WebViewBootstrapperPath = Join-Path $bootstrapperDir "MicrosoftEdgeWebview2Setup.exe"
    if (-not (Test-Path -LiteralPath $WebViewBootstrapperPath -PathType Leaf)) {
        $download = "$WebViewBootstrapperPath.download"
        Invoke-WebRequest -Uri "https://go.microsoft.com/fwlink/p/?LinkId=2124703" -OutFile $download
        Move-Item -LiteralPath $download -Destination $WebViewBootstrapperPath -Force
    }
}
$WebViewBootstrapperPath = (Resolve-Path -LiteralPath $WebViewBootstrapperPath).Path
$signature = Get-AuthenticodeSignature -LiteralPath $WebViewBootstrapperPath
if ($signature.Status -ne "Valid" -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation(?:,|$)') {
    throw "WebView2 bootstrapper must have a valid Microsoft Authenticode signature."
}

# Packaging validates version metadata and rejects pre-layout executables.
& (Join-Path $PSScriptRoot "package-release.ps1") `
    -Version $Version -UpdateManifestURL $UpdateManifestURL -Layout Installed

$payloadDir = Join-Path $repoRoot "build/release/PlotKityCat-v$Version-installer-payload"
$setupSuffix = ""
if ($BuildLabel) { $setupSuffix = "-$BuildLabel" }
$setupFile = Join-Path $repoRoot "build/release/PlotKityCat-Setup-$Version$setupSuffix-windows-amd64.exe"
$setupProject = Join-Path $repoRoot "cmd/setup"
$engineDir = Join-Path $setupProject "payload"
New-Item -ItemType Directory -Path $engineDir -Force | Out-Null
$engineFile = Join-Path $engineDir "install-engine.exe"
$scriptFile = Join-Path $repoRoot "build/windows/installer/plotkitycat.nsi"
$arguments = @(
    "/INPUTCHARSET", "UTF8", "/V3",
    "/DAPP_VERSION=$Version",
    "/DPAYLOAD_DIR=$payloadDir",
    "/DSETUP_FILE=$engineFile",
    "/DWEBVIEW_BOOTSTRAPPER=$WebViewBootstrapperPath",
    $scriptFile
)
& $MakeNSISPath @arguments
if ($LASTEXITCODE -ne 0) {
    throw "NSIS build failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $engineFile -PathType Leaf)) {
    throw "NSIS did not produce the installation engine: $engineFile"
}

# Build the branded Wails UI around the installation engine. Keep its assets
# and build output separate from the application's frontend and binaries.
$setupWindowsAssets = Join-Path $setupProject "build/windows"
New-Item -ItemType Directory -Path $setupWindowsAssets -Force | Out-Null
foreach ($assetName in @("icon.ico", "info.json", "wails.exe.manifest")) {
    Copy-Item -LiteralPath (Join-Path $repoRoot "build/windows/$assetName") -Destination (Join-Path $setupWindowsAssets $assetName) -Force
}
$setupConfigPath = Join-Path $setupProject "wails.json"
$setupConfig = Get-Content -LiteralPath $setupConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$setupConfig.info.productVersion = $Version
[IO.File]::WriteAllText($setupConfigPath, ($setupConfig | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
Push-Location $setupProject
try {
    & wails build -s -skipbindings -skipembedcreate -m -nosyncgomod -tags setup -webview2 embed `
        -o "PlotKityCatSetup.exe" -ldflags "-X plotkitycat/internal/version.appVersion=$Version"
    if ($LASTEXITCODE -ne 0) { throw "Installer UI build failed with exit code $LASTEXITCODE" }
} finally { Pop-Location }
Copy-Item -LiteralPath (Join-Path $setupProject "build/bin/PlotKityCatSetup.exe") -Destination $setupFile -Force
$artifact = Get-Item -LiteralPath $setupFile
$hash = (Get-FileHash -LiteralPath $setupFile -Algorithm SHA256).Hash.ToLowerInvariant()
$metadata = [ordered]@{
    appVersion = $Version
    installedLayoutVersion = 1
    platform = "windows-amd64"
    file = $artifact.Name
    size = $artifact.Length
    sha256 = $hash
    signed = $false
    builtAt = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
}
[IO.File]::WriteAllText("$setupFile.json", ($metadata | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
if (-not [string]::IsNullOrWhiteSpace($SigningKeyPath)) {
    & go run ./cmd/release-sign -key $SigningKeyPath -artifact $setupFile -version $Version `
        -url ("https://update.5051001.xyz/plotkitycat/releases/" + $artifact.Name) -format exe `
        -output (Join-Path $repoRoot "build/release/setup-manifest.json")
    if ($LASTEXITCODE -ne 0) { throw "Installer release signing failed." }
}
Write-Host "Installer: $setupFile"
Write-Host "SHA256: $hash"
