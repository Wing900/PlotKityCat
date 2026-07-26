function Assert-AppVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Version
    )

    $value = $Version.Trim()
    if ($value -notmatch '^\d+(\.\d+)+$' -or $value.Length -gt 64) {
        throw "Invalid app version: $Version"
    }
}

function Get-AppVersionFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Missing version file: $Path"
    }

    $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    $value = [string]$raw.appVersion
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "version.json appVersion is empty"
    }

    $value = $value.Trim()
    Assert-AppVersion -Version $value
    return $value
}

function Write-BuiltAppVersionMetadata {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Version,
        [Parameter(Mandatory = $true)]
        [string]$UpdateManifestURL
    )

    $Version = $Version.Trim()
    Assert-AppVersion -Version $Version
    $metadata = [ordered]@{
        appVersion = $Version
        updateManifestURL = $UpdateManifestURL.Trim()
        builtAt = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    $json = $metadata | ConvertTo-Json
    $parent = Split-Path -Parent $Path
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    [System.IO.File]::WriteAllText($Path, $json, [System.Text.UTF8Encoding]::new($false))
}

function Assert-BuiltAppVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ExecutablePath,
        [Parameter(Mandatory = $true)]
        [string]$MetadataPath,
        [Parameter(Mandatory = $true)]
        [string]$ExpectedVersion,
        [string]$ExpectedManifestURL = ""
    )

    $ExpectedVersion = $ExpectedVersion.Trim()
    Assert-AppVersion -Version $ExpectedVersion
    if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
        throw "Missing built executable: $ExecutablePath"
    }
    if (-not (Test-Path -LiteralPath $MetadataPath -PathType Leaf)) {
        throw "Missing build metadata: $MetadataPath. Rebuild the application first."
    }

    $metadata = Get-Content -LiteralPath $MetadataPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $actualVersion = ([string]$metadata.appVersion).Trim()
    Assert-AppVersion -Version $actualVersion
    if ($actualVersion -ne $ExpectedVersion) {
        throw "Built executable version mismatch. Expected $ExpectedVersion, metadata has $actualVersion."
    }
    if (-not [string]::IsNullOrWhiteSpace($ExpectedManifestURL)) {
        $actualManifestURL = ([string]$metadata.updateManifestURL).Trim()
        if ($actualManifestURL -ne $ExpectedManifestURL.Trim()) {
            throw "Built executable update channel mismatch. Expected $ExpectedManifestURL, metadata has $actualManifestURL."
        }
    }
}
