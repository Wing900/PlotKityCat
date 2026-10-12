param(
    [string]$Version = "",
    [string]$BaseURL = "https://update.5051001.xyz/plotkitycat/releases",
    [string]$UpdateManifestURL = "",
    [string]$SigningKeyPath = $env:PLOTKITYCAT_RELEASE_KEY
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$versionFilePath = Join-Path $repoRoot "version.json"
$sourceExe = Join-Path $repoRoot "build/bin/PlotKityCat.exe"
$buildMetadataPath = Join-Path $repoRoot "build/bin/build-metadata.json"

. (Join-Path $PSScriptRoot "release-version.ps1")

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = Get-AppVersionFromFile -Path $versionFilePath
}
$Version = $Version.Trim()
Assert-AppVersion -Version $Version
$outputDir = Join-Path $repoRoot "build/update/$Version"
$targetName = "PlotKityCat-$Version-windows-amd64.zip"
$targetExe = Join-Path $outputDir $targetName
$manifestPath = Join-Path $outputDir "manifest.json"

$baseUri = $null
if (
    -not [Uri]::TryCreate($BaseURL, [UriKind]::Absolute, [ref]$baseUri) -or
    $baseUri.Scheme -ne [Uri]::UriSchemeHttps
) {
    throw "Update BaseURL must use HTTPS: $BaseURL"
}

Assert-BuiltAppVersion `
    -ExecutablePath $sourceExe `
    -MetadataPath $buildMetadataPath `
    -ExpectedVersion $Version `
    -ExpectedManifestURL $UpdateManifestURL

if (-not [IO.Path]::GetFullPath($outputDir).StartsWith([IO.Path]::GetFullPath((Join-Path $repoRoot "build/update")) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe update output directory." }
if (Test-Path $outputDir) {
    Remove-Item -LiteralPath $outputDir -Recurse -Force
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

if ([string]::IsNullOrWhiteSpace($SigningKeyPath)) {
    throw "PLOTKITYCAT_RELEASE_KEY is required. The private key must stay outside the repository."
}
$resolvedKey = [IO.Path]::GetFullPath($SigningKeyPath)
if ($resolvedKey.StartsWith([IO.Path]::GetFullPath($repoRoot) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "The release private key must stay outside the repository."
}
# Build one flat application bundle. Scripts and configuration stay out of it.
& (Join-Path $PSScriptRoot "package-release.ps1") -Version $Version -UpdateManifestURL $UpdateManifestURL -Layout Installed
$payload = Join-Path $repoRoot "build/release/PlotKityCat-v$Version-installer-payload"
$children = @(Get-ChildItem -LiteralPath $payload -Force | ForEach-Object { $_.FullName })
Compress-Archive -LiteralPath $children -DestinationPath $targetExe -CompressionLevel Optimal
& go run ./cmd/release-sign -key $resolvedKey -artifact $targetExe -version $Version `
    -url ($BaseURL.TrimEnd('/') + "/" + $targetName) -format zip -output $manifestPath
if ($LASTEXITCODE -ne 0) { throw "Release signing failed." }
# The old updater understands EXE only. Keep this migration manifest separate
# from stable-v2; publishing it to stable is an explicit operator action.
$legacyName = "PlotKityCat-$Version-windows-amd64.exe"
$legacyExe = Join-Path $outputDir $legacyName
Copy-Item -LiteralPath $sourceExe -Destination $legacyExe
& go run ./cmd/release-sign -key $resolvedKey -artifact $legacyExe -version $Version `
    -url ($BaseURL.TrimEnd('/') + "/" + $legacyName) -format exe -output (Join-Path $outputDir "manifest-legacy.json")
if ($LASTEXITCODE -ne 0) { throw "Migration manifest signing failed." }
$hash = (Get-FileHash -LiteralPath $targetExe -Algorithm SHA256).Hash.ToLowerInvariant()
$size = (Get-Item -LiteralPath $targetExe).Length

Write-Host "Prepared update artifacts:"
Write-Host "  Bundle:   $targetExe"
Write-Host "  Manifest: $manifestPath"
Write-Host "  SHA256:   $hash"
Write-Host "  Size:     $size bytes"
