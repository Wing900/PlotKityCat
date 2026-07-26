param(
    [string]$Version = "",
    [string]$UpdateManifestURL = "https://update.5051001.xyz/plotkitycat/stable/manifest.json"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$versionFilePath = Join-Path $repoRoot "version.json"
$binExe = Join-Path $repoRoot "build/bin/PlotKityCat.exe"
$buildMetadataPath = Join-Path $repoRoot "build/bin/build-metadata.json"
. (Join-Path $PSScriptRoot "release-version.ps1")

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = Get-AppVersionFromFile -Path $versionFilePath
}
$Version = $Version.Trim()
Assert-AppVersion -Version $Version
$manifestUri = $null
if (
    -not [Uri]::TryCreate($UpdateManifestURL, [UriKind]::Absolute, [ref]$manifestUri) -or
    $manifestUri.Scheme -ne [Uri]::UriSchemeHttps
) {
    throw "Update Manifest URL must use HTTPS: $UpdateManifestURL"
}
$UpdateManifestURL = $UpdateManifestURL.Trim()

$ldflags = (
    "-X plotkitycat/internal/version.appVersion=$Version " +
    "-X plotkitycat/internal/updater.releaseManifestURL=$UpdateManifestURL"
)

Write-Host "Building PlotKityCat with version $Version and update channel $UpdateManifestURL"
wails build -clean -ldflags $ldflags
if ($LASTEXITCODE -ne 0) {
    throw "Wails build failed with exit code $LASTEXITCODE"
}

Write-BuiltAppVersionMetadata `
    -Path $buildMetadataPath `
    -Version $Version `
    -UpdateManifestURL $UpdateManifestURL
Assert-BuiltAppVersion `
    -ExecutablePath $binExe `
    -MetadataPath $buildMetadataPath `
    -ExpectedVersion $Version `
    -ExpectedManifestURL $UpdateManifestURL
