param([Parameter(Mandatory=$true)][string]$PlanPath)
$ErrorActionPreference = 'Stop'
$plan = Get-Content -LiteralPath $PlanPath -Raw -Encoding UTF8 | ConvertFrom-Json
$jobRoot = Split-Path -Parent $PlanPath
$target = [IO.Path]::GetFullPath($plan.target)
$stage = [IO.Path]::GetFullPath($plan.stage)
$transaction = Join-Path $target '.plotkitycat-upgrade'
$journalPath = Join-Path $transaction 'pending.json'
$appReady = Join-Path $transaction 'app.ready'
$launched = $null
$activated = $false
$committed = $false
$mutex = $null
$owned = $false
$registryPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\PlotKityCat'
$registryFields = @('DisplayName','DisplayVersion','Publisher','InstallLocation','DisplayIcon','UninstallString','QuietUninstallString','NoModify','NoRepair')
Add-Type -AssemblyName System.Numerics

function Assert-NoLinks($path) {
  if (Test-Path -LiteralPath $path) {
    $item = Get-Item -LiteralPath $path -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked upgrade path refused: $path" }
    if ($item.PSIsContainer) {
      foreach ($child in Get-ChildItem -LiteralPath $path -Force) { Assert-NoLinks $child.FullName }
    }
  }
}
function Compare-Version($left,$right) {
  if ($left -notmatch '^\d+(\.\d+)*$' -or $right -notmatch '^\d+(\.\d+)*$') { throw 'Invalid release version' }
  $a = $left.Split('.');$b = $right.Split('.')
  for ($i=0;$i -lt [Math]::Max($a.Length,$b.Length);$i++) {
    $x=[System.Numerics.BigInteger]0;$y=[System.Numerics.BigInteger]0
    if ($i -lt $a.Length) { $x=[System.Numerics.BigInteger]::Parse($a[$i]) }
    if ($i -lt $b.Length) { $y=[System.Numerics.BigInteger]::Parse($b[$i]) }
    if ($x -gt $y) {return 1};if ($x -lt $y) {return -1}
  }
  return 0
}
function Save-Journal($journal) {
  $json = $journal | ConvertTo-Json -Depth 8 -Compress
  [IO.File]::WriteAllText($journalPath+'.tmp', $json, [Text.UTF8Encoding]::new($false))
  if (Test-Path -LiteralPath $journalPath) { [IO.File]::Replace($journalPath+'.tmp',$journalPath,$null) }
  else { [IO.File]::Move($journalPath+'.tmp',$journalPath) }
}
function Restore-Journal($journal) {
  if ($journal.committed) { return }
  $restoreEntries = @($journal.entries)
  [Array]::Reverse($restoreEntries)
  # Restore the application last, so a power loss during recovery leaves a
  # recovery-capable executable in place until resources are coherent.
  foreach ($entry in $restoreEntries) {
    if ($entry.name -notin @('PlotKityCat.exe','resources','.plotkitycat-installed','.plotkitycat-legacy-source','uninstall.exe')) { throw 'Invalid journal entry' }
    $live = Join-Path $target $entry.name
    $backup = Join-Path (Join-Path $transaction 'backup') $entry.name
    Assert-NoLinks $live
    Assert-NoLinks $backup
    if (Test-Path -LiteralPath $backup) {
      if ((Test-Path -LiteralPath $backup -PathType Leaf) -and (Test-Path -LiteralPath $live -PathType Leaf)) {
        [IO.File]::Replace($backup,$live,$null)
      } else {
        if (Test-Path -LiteralPath $live) { Remove-Item -LiteralPath $live -Recurse -Force }
        Move-Item -LiteralPath $backup -Destination $live
      }
    } elseif (-not $entry.existed) {
      if (Test-Path -LiteralPath $live) { Remove-Item -LiteralPath $live -Recurse -Force }
    }
  }
  if ($journal.registrationTouched) {
    if ($journal.registrationExisted) {
      New-Item -Path $registryPath -Force | Out-Null
      foreach ($field in $registryFields) {
        $property = $journal.registration.PSObject.Properties[$field]
        if ($property) { Set-ItemProperty -Path $registryPath -Name $field -Value $property.Value }
        else { Remove-ItemProperty -Path $registryPath -Name $field -ErrorAction SilentlyContinue }
      }
    } else {
      Remove-Item -LiteralPath $registryPath -ErrorAction SilentlyContinue
      $desktop = [Environment]::GetFolderPath('Desktop')
      $programs = [Environment]::GetFolderPath('Programs')
      Remove-Item -LiteralPath (Join-Path $desktop 'PlotKityCat.lnk') -ErrorAction SilentlyContinue
      Remove-Item -LiteralPath (Join-Path $programs 'PlotKityCat\PlotKityCat.lnk') -ErrorAction SilentlyContinue
      Remove-Item -LiteralPath (Join-Path $programs 'PlotKityCat\卸载.lnk') -ErrorAction SilentlyContinue
    }
  }
}

try {
  if ($target -eq $stage -or $target -eq [IO.Path]::GetPathRoot($target)) { throw 'Invalid activation directory' }
  # One mutex covers Setup and in-app update, including independent processes.
  $digest = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($target.ToLowerInvariant()))
  $name = 'Local\PlotKityCatUpgrade-' + ([BitConverter]::ToString($digest).Replace('-',''))
  $mutex = [Threading.Mutex]::new($false,$name)
  try { $owned = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owned = $true }
  if (-not $owned) { throw 'Another installer or updater is running' }
  if ($plan.recoverOnly) {
    [IO.File]::WriteAllText((Join-Path $jobRoot 'worker.ready'),$plan.token)
    $oldProcess = Get-Process -Id $plan.mainPid -ErrorAction SilentlyContinue
    if ($oldProcess -and -not $oldProcess.WaitForExit(120000)) { throw 'Recovery application did not exit' }
    Assert-NoLinks $transaction
    if (Test-Path -LiteralPath $journalPath) {
      $old = Get-Content -LiteralPath $journalPath -Raw -Encoding UTF8 | ConvertFrom-Json
      Restore-Journal $old
      Remove-Item -LiteralPath $transaction -Recurse -Force
    }
    Start-Process -FilePath (Join-Path $target 'PlotKityCat.exe') -WorkingDirectory $target
    exit 0
  }
  $existingExe = Join-Path $target 'PlotKityCat.exe'
  if (Test-Path -LiteralPath $existingExe) {
    $oldVersion = $plan.previousVersion
    if (-not $oldVersion) { throw 'Cannot verify installed version; upgrade refused' }
    if ((Compare-Version $oldVersion $plan.version) -gt 0) { throw 'Downgrade refused; installed application is newer' }
    # Opening without sharing rejects an active executable before any changes.
    if ($plan.mainPid -le 0) {
      $probe = [IO.File]::Open($existingExe,[IO.FileMode]::Open,[IO.FileAccess]::Write,[IO.FileShare]::None)
      $probe.Dispose()
    }
  }
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  Assert-NoLinks $transaction
  if (Test-Path -LiteralPath $journalPath) {
    $old = Get-Content -LiteralPath $journalPath -Raw -Encoding UTF8 | ConvertFrom-Json
    Restore-Journal $old
  }
  if (Test-Path -LiteralPath $transaction) { Remove-Item -LiteralPath $transaction -Recurse -Force }
  New-Item -ItemType Directory -Path (Join-Path $transaction 'backup') -Force | Out-Null
  Assert-NoLinks $stage
  $entries = @()
  foreach ($name in $plan.entries) {
    if ($name -notin @('PlotKityCat.exe','resources','.plotkitycat-installed','.plotkitycat-legacy-source','uninstall.exe')) { throw 'Unmanaged upgrade entry' }
    $source = Join-Path $stage $name
    if (Test-Path -LiteralPath $source) {
      $live = Join-Path $target $name
      Assert-NoLinks $live
      $entries += @{name=$name;existed=(Test-Path -LiteralPath $live)}
    }
  }
  if (-not (Test-Path -LiteralPath (Join-Path $stage 'PlotKityCat.exe') -PathType Leaf)) { throw 'Missing staged application' }
  $stagedVersion = $plan.stagedVersion
  if ((Compare-Version $stagedVersion $plan.version) -ne 0) { throw 'Staged executable version mismatch' }
  $registration = @{}
  $registrationExisted = Test-Path -LiteralPath $registryPath
  if ($registrationExisted) {
    $properties = Get-ItemProperty -LiteralPath $registryPath
    foreach ($field in $registryFields) {
      $property = $properties.PSObject.Properties[$field]
      if ($property) { $registration[$field]=$property.Value }
    }
  }
  $journal = @{token=$plan.token;version=$plan.version;entries=$entries;committed=$false;registration=$registration;registrationExisted=$registrationExisted;registrationTouched=$false}
  Save-Journal $journal
  [IO.File]::WriteAllText((Join-Path $jobRoot 'worker.ready'),$plan.token)
  if ($plan.mainPid -gt 0) {
    $oldProcess = Get-Process -Id $plan.mainPid -ErrorAction SilentlyContinue
    if ($oldProcess -and -not $oldProcess.WaitForExit(120000)) { throw 'Application did not exit' }
  }
  if (Test-Path -LiteralPath $existingExe) {
    $probe = [IO.File]::Open($existingExe,[IO.FileMode]::Open,[IO.FileAccess]::Write,[IO.FileShare]::None)
    $probe.Dispose()
  }
  foreach ($entry in $entries) {
    $live = Join-Path $target $entry.name
    $source = Join-Path $stage $entry.name
    $backup = Join-Path (Join-Path $transaction 'backup') $entry.name
    if ($entry.existed -and (Test-Path -LiteralPath $source -PathType Leaf)) {
      # Atomic replacement keeps the EXE present across a power loss.
      [IO.File]::Replace($source,$live,$backup)
    } else {
      if ($entry.existed) { Move-Item -LiteralPath $live -Destination $backup }
      Move-Item -LiteralPath $source -Destination $live
    }
    $activated = $true
  }
  $exe = Join-Path $target 'PlotKityCat.exe'
  $launched = Start-Process -FilePath $exe -WorkingDirectory $target -ArgumentList @('--plotkitycat-upgrade-token',$plan.token) -PassThru
  $deadline = [DateTime]::UtcNow.AddMinutes(5)
  $healthy = $false
  while ([DateTime]::UtcNow -lt $deadline) {
    $launched.Refresh()
    if ($launched.HasExited) { throw 'New application exited before Ready' }
    if (Test-Path -LiteralPath $appReady) {
      $ack = Get-Content -LiteralPath $appReady -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($ack.token -eq $plan.token -and $ack.version -eq $plan.version -and $ack.pid -eq $launched.Id) { $healthy=$true;break }
    }
    Start-Sleep -Milliseconds 200
  }
  if (-not $healthy) { throw 'New application initialization timed out' }
  if ($plan.registerWorker) {
    $journal.registrationTouched = $true
    Save-Journal $journal
    $register = Start-Process -FilePath $plan.registerWorker -ArgumentList ('/S /REGISTERONLY /D='+$target) -WindowStyle Hidden -Wait -PassThru
    if ($register.ExitCode -ne 0) { throw 'Installation registration failed' }
  }
  elseif ($registrationExisted -and $registration.InstallLocation -eq $target) {
    $journal.registrationTouched = $true
    Save-Journal $journal
    Set-ItemProperty -LiteralPath $registryPath -Name DisplayVersion -Value $plan.version
  }
  $journal.committed = $true
  Save-Journal $journal
  $committed = $true
  [IO.File]::WriteAllText((Join-Path $jobRoot 'success'),$plan.token)
  # A cleanup failure after commit must never trigger rollback.
  Remove-Item -LiteralPath $transaction -Recurse -Force -ErrorAction SilentlyContinue
  exit 0
} catch {
  $failure = $_.Exception.Message
  if (-not $committed) {
    if ($launched) { try { if (-not $launched.HasExited) { $launched.Kill();$launched.WaitForExit() } } catch {} }
    if ($owned -and (Test-Path -LiteralPath $journalPath)) {
      try {
        $journal = Get-Content -LiteralPath $journalPath -Raw -Encoding UTF8 | ConvertFrom-Json
        Restore-Journal $journal
        Remove-Item -LiteralPath $transaction -Recurse -Force
        if ($activated -and (Test-Path -LiteralPath (Join-Path $target 'PlotKityCat.exe'))) {
          Start-Process -FilePath (Join-Path $target 'PlotKityCat.exe') -WorkingDirectory $target
        }
      } catch { $failure += '; recovery pending: '+$_.Exception.Message }
    }
  }
  [IO.File]::WriteAllText((Join-Path $jobRoot 'error.txt'),$failure,[Text.UTF8Encoding]::new($false))
  exit 1
} finally {
  if ($owned) { $mutex.ReleaseMutex() }
  if ($mutex) { $mutex.Dispose() }
  # The job owns this generated sibling staging directory only.
  if (-not $plan.recoverOnly -and (Split-Path -Parent $stage) -eq (Split-Path -Parent $target) -and (Split-Path -Leaf $stage).StartsWith('.plotkitycat-stage-')) {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
  }
}
