param(
    [string]$Version = "",
    [string]$BaseURL = "https://update.5051001.xyz/plotkitycat/releases",
    [string]$UpdateManifestURL = ""
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
$targetName = "PlotKityCat-$Version-windows-amd64.exe"
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

if (Test-Path $outputDir) {
    Remove-Item -LiteralPath $outputDir -Recurse -Force
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Copy-Item -LiteralPath $sourceExe -Destination $targetExe -Force

$hash = (Get-FileHash -LiteralPath $targetExe -Algorithm SHA256).Hash.ToLowerInvariant()
$size = (Get-Item -LiteralPath $targetExe).Length
$publishedAt = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")

$manifest = [ordered]@{
    version = $Version
    notes = ""
    publishedAt = $publishedAt
    windows = [ordered]@{
        url = ($BaseURL.TrimEnd('/') + "/" + $targetName)
        sha256 = $hash
        size = $size
    }
}

$manifestJson = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "Prepared update artifacts:"
Write-Host "  EXE:      $targetExe"
Write-Host "  Manifest: $manifestPath"
Write-Host "  SHA256:   $hash"
Write-Host "  Size:     $size bytes"
