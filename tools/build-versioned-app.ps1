param(
    [string]$Version = "",
    [string]$UpdateManifestURL = "https://update.5051001.xyz/plotkitycat/stable-v2/manifest.json",
    [switch]$SkipBindings
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
$wailsConfigPath = Join-Path $repoRoot "wails.json"
$wailsConfig = Get-Content -LiteralPath $wailsConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$wailsConfig.info.productVersion = $Version
[IO.File]::WriteAllText($wailsConfigPath, ($wailsConfig | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))

$ldflags = (
    "-X plotkitycat/internal/version.appVersion=$Version " +
    "-X plotkitycat/internal/updater.releaseManifestURL=$UpdateManifestURL"
)

Write-Host "Building PlotKityCat with version $Version and update channel $UpdateManifestURL"
$buildArgs = @("build", "-clean", "-ldflags", $ldflags)
if ($SkipBindings) {
    $buildArgs += "-skipbindings"
}
& wails @buildArgs
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
