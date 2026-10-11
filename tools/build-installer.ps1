param(
    [string]$Version = "",
    [string]$UpdateManifestURL = "https://update.5051001.xyz/plotkitycat/stable/manifest.json",
    [string]$MakeNSISPath = "",
    [string]$WebViewBootstrapperPath = ""
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
$setupFile = Join-Path $repoRoot "build/release/PlotKityCat-Setup-$Version-windows-amd64.exe"
$scriptFile = Join-Path $repoRoot "build/windows/installer/plotkitycat.nsi"
$arguments = @(
    "/INPUTCHARSET", "UTF8", "/V3",
    "/DAPP_VERSION=$Version",
    "/DPAYLOAD_DIR=$payloadDir",
    "/DSETUP_FILE=$setupFile",
    "/DWEBVIEW_BOOTSTRAPPER=$WebViewBootstrapperPath",
    $scriptFile
)
& $MakeNSISPath @arguments
if ($LASTEXITCODE -ne 0) {
    throw "NSIS build failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $setupFile -PathType Leaf)) {
    throw "NSIS did not produce the expected installer: $setupFile"
}
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
Write-Host "Installer: $setupFile"
Write-Host "SHA256: $hash"
