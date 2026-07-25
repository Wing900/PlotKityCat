param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$versionFilePath = Join-Path $repoRoot "version.json"

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

function Get-AppVersionFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Missing version file: $Path"
    }

    $raw = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    $value = [string]$raw.appVersion
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "version.json appVersion is empty"
    }

    return $value.Trim()
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

    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
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

    $workspaceDirectories = @(Get-ChildItem -LiteralPath $ScriptsPath -Directory)
    if ($workspaceDirectories.Count -eq 0) {
        throw "Scripts directory has no workspaces: $ScriptsPath"
    }

    $hasOnboardingWorkspace = $false
    foreach ($workspaceDirectory in $workspaceDirectories) {
        $isOnboardingWorkspace = $workspaceDirectory.Name -eq "新手引导"
        if ($isOnboardingWorkspace) {
            $hasOnboardingWorkspace = $true
        }
        Assert-WorkspaceTemplate `
            -WorkspacePath $workspaceDirectory.FullName `
            -RequireNonEmptyNote:$isOnboardingWorkspace
    }

    if (-not $hasOnboardingWorkspace) {
        throw "Missing onboarding workspace: $(Join-Path $ScriptsPath '新手引导')"
    }
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = Get-AppVersionFromFile -Path $versionFilePath
}

$releaseName = "PlotKityCat-v$Version"
$releaseRoot = Join-Path $repoRoot "build/release/$releaseName"
$releaseZip = "$releaseRoot.zip"
$binExe = Join-Path $repoRoot "build/bin/PlotKityCat.exe"
$runtimeArchive = Join-Path $repoRoot "resources/runtime/runtime.7z"
$runtime7ZipDir = Join-Path $repoRoot "tools/7zip/extra/x64"
$screeningZoomExe = Resolve-ScreeningZoomExecutablePath -RepoRoot $repoRoot
$scriptsDir = Join-Path $repoRoot "Scripts"

if (-not (Test-Path $binExe)) {
    throw "Missing built executable: $binExe"
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

Copy-Item -LiteralPath $scriptsDir -Destination (Join-Path $releaseRoot "Scripts") -Recurse -Force
Assert-ScriptsCatalog -ScriptsPath (Join-Path $releaseRoot "Scripts")

Compress-Archive -LiteralPath $releaseRoot -DestinationPath $releaseZip -CompressionLevel Optimal

Write-Host "Packaged release:"
Write-Host "  Directory: $releaseRoot"
Write-Host "  Zip:       $releaseZip"
