param(
    [string]$Version = "",
    [string]$UpdateManifestURL = "",
    [ValidateSet("Portable", "Installed")]
    [string]$Layout = "Portable"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$versionFilePath = Join-Path $repoRoot "version.json"
. (Join-Path $PSScriptRoot "release-version.ps1")

function Resolve-ScreeningZoomExecutablePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    $candidates = @(
        (Join-Path $RepoRoot "resources/screeningzoom/zoomit.exe"),
        (Join-Path $RepoRoot "thirdparty/screeningzoom/build/Release/zoomit.exe"),
        (Join-Path $RepoRoot "thirdparty/screeningzoom/build/zoomit.exe")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return $candidate
        }
    }

    $joined = $candidates -join [Environment]::NewLine
    throw "Missing screening zoom executable. Expected one of:`n$joined"
}

function Assert-WorkspaceTemplate {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkspacePath,
        [switch]$RequireNonEmptyNote
    )

    $workspaceName = Split-Path -Leaf $WorkspacePath
    $manifestPath = Join-Path $WorkspacePath ".plotkitycat-scenes.json"
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Missing workspace scene manifest: $manifestPath"
    }

    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $sceneNames = @($manifest.scenes)
    if ($sceneNames.Count -eq 0) {
        throw "Workspace scene manifest has no scenes: $manifestPath"
    }

    foreach ($sceneNameValue in $sceneNames) {
        $sceneName = [string]$sceneNameValue
        if (
            [string]::IsNullOrWhiteSpace($sceneName) -or
            $sceneName -ne [IO.Path]::GetFileName($sceneName)
        ) {
            throw "Invalid scene name in workspace ${workspaceName}: $sceneName"
        }

        $scenePath = Join-Path $WorkspacePath $sceneName
        $mainPath = Join-Path $scenePath "main.py"
        $notePath = Join-Path $scenePath "note.md"
        if (-not (Test-Path -LiteralPath $mainPath -PathType Leaf)) {
            throw "Missing scene code: $mainPath"
        }
        if (-not (Test-Path -LiteralPath $notePath -PathType Leaf)) {
            throw "Missing scene note: $notePath"
        }
        if ($RequireNonEmptyNote -and (Get-Item -LiteralPath $notePath).Length -eq 0) {
            throw "Onboarding scene note is empty: $notePath"
        }
    }
}

function Assert-ScriptsCatalog {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptsPath
    )

    if (-not (Test-Path -LiteralPath $ScriptsPath -PathType Container)) {
        throw "Missing Scripts directory: $ScriptsPath"
    }

    $onboardingWorkspaceName = -join @(
        [char]0x65B0,
        [char]0x624B,
        [char]0x5F15,
        [char]0x5BFC
    )
    $workspaceDirectories = @(Get-ChildItem -LiteralPath $ScriptsPath -Directory)
    if ($workspaceDirectories.Count -eq 0) {
        throw "Scripts directory has no workspaces: $ScriptsPath"
    }

    $hasOnboardingWorkspace = $false
    foreach ($workspaceDirectory in $workspaceDirectories) {
        $isOnboardingWorkspace = $workspaceDirectory.Name -eq $onboardingWorkspaceName
        if ($isOnboardingWorkspace) {
            $hasOnboardingWorkspace = $true
        }
        Assert-WorkspaceTemplate `
            -WorkspacePath $workspaceDirectory.FullName `
            -RequireNonEmptyNote:$isOnboardingWorkspace
    }

    if (-not $hasOnboardingWorkspace) {
        throw "Missing onboarding workspace: $(Join-Path $ScriptsPath $onboardingWorkspaceName)"
    }
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = Get-AppVersionFromFile -Path $versionFilePath
}
$Version = $Version.Trim()
Assert-AppVersion -Version $Version

$releaseName = "PlotKityCat-v$Version"
if ($Layout -eq "Installed") {
    $releaseName = "PlotKityCat-v$Version-installer-payload"
}
$releaseRoot = Join-Path $repoRoot "build/release/$releaseName"
$releaseZip = "$releaseRoot.zip"
$binExe = Join-Path $repoRoot "build/bin/PlotKityCat.exe"
$buildMetadataPath = Join-Path $repoRoot "build/bin/build-metadata.json"
$runtimeArchive = Join-Path $repoRoot "resources/runtime/runtime.7z"
$runtime7ZipDir = Join-Path $repoRoot "tools/7zip/extra/x64"
$screeningZoomExe = Resolve-ScreeningZoomExecutablePath -RepoRoot $repoRoot
$scriptsDir = Join-Path $repoRoot "Scripts"

Assert-BuiltAppVersion `
    -ExecutablePath $binExe `
    -MetadataPath $buildMetadataPath `
    -ExpectedVersion $Version `
    -ExpectedManifestURL $UpdateManifestURL

if ($Layout -eq "Installed") {
    $metadata = Get-Content -LiteralPath $buildMetadataPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($metadata.installedLayoutVersion -ne 1) {
        throw "This executable predates installed data layout support. Rebuild with build-versioned-app.ps1 first."
    }
}

if (-not (Test-Path $runtimeArchive)) {
    throw "Missing runtime archive: $runtimeArchive"
}

if (-not (Test-Path (Join-Path $runtime7ZipDir "7za.exe"))) {
    throw "Missing runtime extractor: $(Join-Path $runtime7ZipDir '7za.exe')"
}

if (-not (Test-Path (Join-Path $runtime7ZipDir "7za.dll"))) {
    throw "Missing runtime extractor DLL: $(Join-Path $runtime7ZipDir '7za.dll')"
}

Assert-ScriptsCatalog -ScriptsPath $scriptsDir

# Recursive cleanup is limited to the named artifact under build/release.
$allowedReleaseRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot "build/release"))
$resolvedReleaseRoot = [IO.Path]::GetFullPath($releaseRoot)
if (-not $resolvedReleaseRoot.StartsWith($allowedReleaseRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Release output escaped build/release: $resolvedReleaseRoot"
}
if (Test-Path $releaseRoot) {
    Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}

if (Test-Path $releaseZip) {
    Remove-Item -LiteralPath $releaseZip -Force
}

New-Item -ItemType Directory -Path (Join-Path $releaseRoot "resources/runtime") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseRoot "resources/runtime/7zip") -Force | Out-Null
Copy-Item -LiteralPath $binExe -Destination (Join-Path $releaseRoot "PlotKityCat.exe") -Force
Copy-Item -LiteralPath $runtimeArchive -Destination (Join-Path $releaseRoot "resources/runtime/runtime.7z") -Force
Copy-Item -LiteralPath (Join-Path $runtime7ZipDir "7za.exe") -Destination (Join-Path $releaseRoot "resources/runtime/7zip/7za.exe") -Force
Copy-Item -LiteralPath (Join-Path $runtime7ZipDir "7za.dll") -Destination (Join-Path $releaseRoot "resources/runtime/7zip/7za.dll") -Force

New-Item -ItemType Directory -Path (Join-Path $releaseRoot "resources/screeningzoom") -Force | Out-Null
Copy-Item -LiteralPath $screeningZoomExe -Destination (Join-Path $releaseRoot "resources/screeningzoom/zoomit.exe") -Force

$packagedScripts = Join-Path $releaseRoot "Scripts"
if ($Layout -eq "Installed") {
    $templateRoot = Join-Path $releaseRoot "resources/templates"
    New-Item -ItemType Directory -Path $templateRoot -Force | Out-Null
    $packagedScripts = Join-Path $templateRoot "Scripts"
    [IO.File]::WriteAllText((Join-Path $releaseRoot ".plotkitycat-installed"), "1", [Text.Encoding]::ASCII)
}
Copy-Item -LiteralPath $scriptsDir -Destination $packagedScripts -Recurse -Force
Assert-ScriptsCatalog -ScriptsPath $packagedScripts

if ($Layout -eq "Portable") {
    Compress-Archive -LiteralPath $releaseRoot -DestinationPath $releaseZip -CompressionLevel Optimal
}

Write-Host "Packaged release:"
Write-Host "  Directory: $releaseRoot"
if ($Layout -eq "Portable") {
    Write-Host "  Zip:       $releaseZip"
}
