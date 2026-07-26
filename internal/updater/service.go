package updater

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"plotkitycat/internal/paths"
	"plotkitycat/internal/processutil"
	"plotkitycat/internal/version"
)

const (
	defaultManifestURL = "https://update.5051001.xyz/plotkitycat/stable/manifest.json"
	checkTTL           = 12 * time.Hour
	maxManifestSize    = 1 << 20
	maxUpdateSize      = 512 << 20
	installerReadyTTL  = 30 * time.Second
)

var releaseManifestURL = defaultManifestURL

type Service struct {
	client         *http.Client
	downloadClient *http.Client
	manifestURL    string
	mu             sync.Mutex
	store          *Store
}

func NewService() *Service {
	manifestURL := strings.TrimSpace(releaseManifestURL)
	if err := validateHTTPSURL(manifestURL); err != nil {
		manifestURL = defaultManifestURL
	}
	return &Service{
		client: &http.Client{
			Timeout: 20 * time.Second,
		},
		downloadClient: &http.Client{
			Timeout: 10 * time.Minute,
		},
		manifestURL: manifestURL,
		store:       NewStore(),
	}
}

func (s *Service) Status() (Status, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, err := s.loadState()
	if err != nil {
		return Status{}, err
	}

	return s.statusFromState(state), nil
}

func (s *Service) Check(ctx context.Context, force bool) (Status, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if ctx == nil {
		ctx = context.Background()
	}

	state, err := s.loadState()
	if err != nil {
		return Status{}, err
	}

	if !force && canReuseCheck(state.LastCheckedAt) {
		return s.statusFromState(state), nil
	}

	manifest, err := s.fetchManifest(ctx)
	if err != nil {
		return Status{}, err
	}

	now := time.Now().UTC().Format(time.RFC3339)
	state.LastCheckedAt = now
	state.LatestVersion = strings.TrimSpace(manifest.Version)
	state.LatestNotes = strings.TrimSpace(manifest.Notes)
	state.LatestPublishedAt = strings.TrimSpace(manifest.PublishedAt)
	state.LastKnownArtifact = strings.TrimSpace(manifest.Windows.URL)
	state.LastKnownAvailable = compareVersions(manifest.Version, version.Current()) > 0
	if state.DownloadedVersion != state.LatestVersion {
		previousDownload := state.DownloadedPath
		clearDownloadedState(&state, "")
		if safePath, ok := safeDownloadedPath(previousDownload); ok {
			_ = os.Remove(safePath)
		}
	}
	state.LastKnownMessage = buildMessage(state.LastKnownAvailable, state.DownloadedVersion == state.LatestVersion, manifest.Version)
	if err := s.store.Save(state); err != nil {
		return Status{}, err
	}

	return s.statusFromState(state), nil
}

func (s *Service) Download(ctx context.Context) (Status, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if ctx == nil {
		ctx = context.Background()
	}

	state, err := s.loadState()
	if err != nil {
		return Status{}, err
	}

	manifest, err := s.fetchManifest(ctx)
	if err != nil {
		return Status{}, err
	}
	if compareVersions(manifest.Version, version.Current()) <= 0 {
		state.LatestVersion = strings.TrimSpace(manifest.Version)
		state.LastKnownAvailable = false
		state.LastKnownMessage = "当前已经是最新版本"
		if err := s.store.Save(state); err != nil {
			return Status{}, err
		}
		return s.statusFromState(state), nil
	}

	updatesDir, err := paths.UpdatesDir()
	if err != nil {
		return Status{}, err
	}
	if err := os.MkdirAll(updatesDir, 0o755); err != nil {
		return Status{}, err
	}

	targetName := fmt.Sprintf("PlotKityCat-%s-windows-amd64.exe.new", strings.TrimSpace(manifest.Version))
	targetPath := filepath.Join(updatesDir, targetName)
	partPath := targetPath + ".part"
	for _, entry := range staleUpdateCandidates(updatesDir, targetName) {
		_ = os.Remove(entry)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, manifest.Windows.URL, nil)
	if err != nil {
		return Status{}, err
	}
	resp, err := s.downloadClient.Do(req)
	if err != nil {
		return Status{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Status{}, fmt.Errorf("下载更新失败: %s", resp.Status)
	}
	if resp.Request == nil || resp.Request.URL == nil ||
		!strings.EqualFold(resp.Request.URL.Scheme, "https") {
		return Status{}, fmt.Errorf("更新下载发生了不安全的重定向")
	}
	if manifest.Windows.Size > maxUpdateSize {
		return Status{}, fmt.Errorf("更新包超过大小限制")
	}
	if resp.ContentLength > maxUpdateSize {
		return Status{}, fmt.Errorf("更新包超过大小限制")
	}

	file, err := os.OpenFile(partPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return Status{}, err
	}

	hash := sha256.New()
	written, copyErr := io.Copy(
		io.MultiWriter(file, hash),
		io.LimitReader(resp.Body, maxUpdateSize+1),
	)
	if copyErr == nil && written > maxUpdateSize {
		copyErr = fmt.Errorf("更新包超过大小限制")
	}
	if copyErr == nil && manifest.Windows.Size > 0 && written != manifest.Windows.Size {
		copyErr = fmt.Errorf("更新包大小与 Manifest 不一致")
	}
	syncErr := file.Sync()
	closeErr := file.Close()
	if copyErr != nil {
		_ = os.Remove(partPath)
		return Status{}, copyErr
	}
	if syncErr != nil {
		_ = os.Remove(partPath)
		return Status{}, syncErr
	}
	if closeErr != nil {
		_ = os.Remove(partPath)
		return Status{}, closeErr
	}

	sum := hex.EncodeToString(hash.Sum(nil))
	if !strings.EqualFold(sum, strings.TrimSpace(manifest.Windows.SHA256)) {
		_ = os.Remove(partPath)
		return Status{}, fmt.Errorf("更新包校验失败")
	}

	if err := os.Remove(targetPath); err != nil && !os.IsNotExist(err) {
		_ = os.Remove(partPath)
		return Status{}, err
	}
	if err := os.Rename(partPath, targetPath); err != nil {
		_ = os.Remove(partPath)
		return Status{}, err
	}

	state.LastCheckedAt = time.Now().UTC().Format(time.RFC3339)
	state.LatestVersion = strings.TrimSpace(manifest.Version)
	state.LatestNotes = strings.TrimSpace(manifest.Notes)
	state.LatestPublishedAt = strings.TrimSpace(manifest.PublishedAt)
	state.LastKnownArtifact = strings.TrimSpace(manifest.Windows.URL)
	state.DownloadedVersion = state.LatestVersion
	state.DownloadedPath = targetPath
	state.DownloadedSHA256 = sum
	state.LastKnownAvailable = true
	state.LastKnownDownloaded = true
	state.LastKnownMessage = "更新已下载完成，重启后即可安装"
	if err := s.store.Save(state); err != nil {
		return Status{}, err
	}

	return s.statusFromState(state), nil
}

func (s *Service) InstallAndRestart() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, err := s.loadState()
	if err != nil {
		return err
	}

	newExe, expectedSHA256, err := validateDownloadedUpdate(state)
	if err != nil {
		validationErr := err
		downloadedPath := state.DownloadedPath
		clearDownloadedState(&state, "更新包无效，请重新下载")
		if err := s.store.Save(state); err != nil {
			return fmt.Errorf("%v；清理下载状态失败: %w", validationErr, err)
		}
		if safePath, ok := safeDownloadedPath(downloadedPath); ok {
			_ = os.Remove(safePath)
		}
		return validationErr
	}

	targetExe, err := os.Executable()
	if err != nil {
		return err
	}
	targetExe, err = filepath.Abs(targetExe)
	if err != nil {
		return err
	}

	stagedExe := targetExe + ".update-new"
	if err := stageExecutable(newExe, stagedExe, expectedSHA256); err != nil {
		return fmt.Errorf("准备更新文件失败: %w", err)
	}

	scriptPath, readyPath, err := writeUpdateScript(
		targetExe,
		stagedExe,
		newExe,
		expectedSHA256,
		os.Getpid(),
	)
	if err != nil {
		_ = os.Remove(stagedExe)
		return err
	}

	cmd := exec.Command(
		"powershell.exe",
		"-NoLogo",
		"-NoProfile",
		"-NonInteractive",
		"-ExecutionPolicy",
		"Bypass",
		"-File",
		scriptPath,
	)
	cmd.SysProcAttr = processutil.WithoutConsoleWindow()
	if err := cmd.Start(); err != nil {
		_ = os.Remove(stagedExe)
		_ = os.Remove(scriptPath)
		_ = os.Remove(readyPath)
		return err
	}

	if err := waitForInstallerReady(readyPath, installerReadyTTL); err != nil {
		_ = cmd.Process.Kill()
		_, _ = cmd.Process.Wait()
		_ = os.Remove(stagedExe)
		_ = os.Remove(scriptPath)
		_ = os.Remove(readyPath)
		return err
	}
	if err := cmd.Process.Release(); err != nil {
		return fmt.Errorf("释放更新安装器进程句柄失败: %w", err)
	}

	return nil
}

func writeUpdateScript(
	targetExe string,
	stagedExe string,
	downloadedExe string,
	expectedSHA256 string,
	mainPid int,
) (string, string, error) {
	tmpDir := os.TempDir()
	suffix := fmt.Sprintf("%d-%d", mainPid, time.Now().UnixNano())
	scriptPath := filepath.Join(tmpDir, "plotkitycat-update-"+suffix+".ps1")
	readyPath := filepath.Join(tmpDir, "plotkitycat-update-"+suffix+".ready")

	script := fmt.Sprintf(`$ErrorActionPreference = 'Stop'
$target = %s
$staged = %s
$downloaded = %s
$expectedSha256 = %s
$readyFile = %s
$mainPid = %d
$logFile = Join-Path $env:TEMP 'plotkitycat-update.log'
function Log($msg) {
  try {
    Add-Content -LiteralPath $logFile -Value ("[" + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + "] " + $msg)
  } catch {}
}

Add-Type @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class PlotKityCatAtomicFile {
    private const int MOVEFILE_REPLACE_EXISTING = 0x1;
    private const int MOVEFILE_WRITE_THROUGH = 0x8;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool MoveFileEx(string existingName, string newName, int flags);

    public static void Replace(string source, string target) {
        if (!MoveFileEx(source, target, MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)) {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
    }
}
'@

function Replace-File($source, $destination) {
  [PlotKityCatAtomicFile]::Replace($source, $destination)
}

$backup = $target + '.old'
$mainExited = $false
$swapped = $false

try {
  if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
    throw "target executable is missing"
  }
  if (-not (Test-Path -LiteralPath $staged -PathType Leaf)) {
    throw "staged executable is missing"
  }
  $actualSha256 = (Get-FileHash -LiteralPath $staged -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualSha256 -ne $expectedSha256) {
    throw "staged executable hash mismatch"
  }

  Set-Content -LiteralPath $readyFile -Value $PID -Encoding ASCII
  Log "installer ready target=$target mainPid=$mainPid"

  for ($i = 0; $i -lt 600; $i++) {
    $mainProcess = Get-Process -Id $mainPid -ErrorAction SilentlyContinue
    if (-not $mainProcess) {
      $mainExited = $true
      Log "main process exited"
      break
    }
    Start-Sleep -Milliseconds 200
  }
  if (-not $mainExited) {
    throw "main process did not exit within 120 seconds"
  }

  Start-Sleep -Milliseconds 300
  Remove-Item -LiteralPath $backup -Force -ErrorAction SilentlyContinue
  Copy-Item -LiteralPath $target -Destination $backup -Force
  Replace-File $staged $target
  $swapped = $true
  Log "atomic replacement completed"

  $workingDirectory = Split-Path -Parent $target
  $launched = Start-Process -FilePath $target -WorkingDirectory $workingDirectory -PassThru
  Start-Sleep -Seconds 5
  $launched.Refresh()
  if ($launched.HasExited) {
    throw "updated process exited during startup health window"
  }

  Remove-Item -LiteralPath $backup -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $downloaded -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $readyFile -Force -ErrorAction SilentlyContinue
  Log "update succeeded and application relaunched"
  Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue
  exit 0
} catch {
  Log ("update failed: " + $_.Exception.Message)
  Remove-Item -LiteralPath $readyFile -Force -ErrorAction SilentlyContinue

  if ($mainExited) {
    $canRelaunch = -not $swapped
    if ($swapped -and (Test-Path -LiteralPath $backup -PathType Leaf)) {
      try {
        Replace-File $backup $target
        $swapped = $false
        $canRelaunch = $true
        Log "rollback completed"
      } catch {
        Log ("rollback failed: " + $_.Exception.Message)
      }
    }

    if ($canRelaunch -and (Test-Path -LiteralPath $target -PathType Leaf)) {
      try {
        $workingDirectory = Split-Path -Parent $target
        Start-Process -FilePath $target -WorkingDirectory $workingDirectory
        Log "previous application relaunched"
      } catch {
        Log ("previous application relaunch failed: " + $_.Exception.Message)
      }
    }
  }

  Remove-Item -LiteralPath $staged -Force -ErrorAction SilentlyContinue
  exit 1
}
`,
		psQuote(targetExe),
		psQuote(stagedExe),
		psQuote(downloadedExe),
		psQuote(expectedSHA256),
		psQuote(readyPath),
		mainPid,
	)

	// Windows PowerShell 5.1 requires a BOM to decode non-ASCII paths reliably.
	content := append([]byte{0xef, 0xbb, 0xbf}, []byte(script)...)
	if err := os.WriteFile(scriptPath, content, 0o600); err != nil {
		return "", "", err
	}
	return scriptPath, readyPath, nil
}

func psQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

func (s *Service) loadState() (State, error) {
	state, err := s.store.Load()
	if err != nil {
		return State{}, err
	}

	available := compareVersions(state.LatestVersion, version.Current()) > 0
	changed := state.LastKnownAvailable != available
	state.LastKnownAvailable = available

	if state.DownloadedVersion != "" &&
		compareVersions(state.DownloadedVersion, version.Current()) <= 0 {
		downloadedPath := state.DownloadedPath
		clearDownloadedState(&state, "更新已安装")
		changed = true

		if changed {
			if err := s.store.Save(state); err != nil {
				return State{}, err
			}
		}
		if safePath, ok := safeDownloadedPath(downloadedPath); ok {
			_ = os.Remove(safePath)
		}
		return state, nil
	}

	if state.DownloadedVersion != "" {
		downloadedPath, safePath := safeDownloadedPath(state.DownloadedPath)
		if !safePath ||
			!fileExists(downloadedPath) ||
			!isValidSHA256(strings.TrimSpace(state.DownloadedSHA256)) {
			clearDownloadedState(&state, buildMessage(
				state.LastKnownAvailable,
				false,
				state.LatestVersion,
			))
			changed = true
		}
	}

	if changed {
		state.LastKnownMessage = buildMessage(
			state.LastKnownAvailable,
			state.LastKnownDownloaded,
			state.LatestVersion,
		)
		if err := s.store.Save(state); err != nil {
			return State{}, err
		}
	}

	return state, nil
}

func clearDownloadedState(state *State, message string) {
	if state == nil {
		return
	}
	state.DownloadedVersion = ""
	state.DownloadedPath = ""
	state.DownloadedSHA256 = ""
	state.LastKnownDownloaded = false
	state.LastKnownMessage = strings.TrimSpace(message)
}

func validateDownloadedUpdate(state State) (string, string, error) {
	versionValue := strings.TrimSpace(state.DownloadedVersion)
	if !isValidVersion(versionValue) {
		return "", "", fmt.Errorf("没有可安装的更新包")
	}

	expectedName := fmt.Sprintf(
		"PlotKityCat-%s-windows-amd64.exe.new",
		versionValue,
	)
	safePath, ok := safeDownloadedPath(state.DownloadedPath)
	if !ok || filepath.Base(safePath) != expectedName {
		return "", "", fmt.Errorf("下载的更新包路径无效")
	}

	info, err := os.Lstat(safePath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", "", fmt.Errorf("下载的更新包不存在")
		}
		return "", "", err
	}
	if !info.Mode().IsRegular() {
		return "", "", fmt.Errorf("下载的更新包类型无效")
	}

	expectedSHA256 := strings.ToLower(strings.TrimSpace(state.DownloadedSHA256))
	if !isValidSHA256(expectedSHA256) {
		return "", "", fmt.Errorf("下载的更新包缺少有效 SHA-256")
	}
	actualSHA256, err := hashFile(safePath)
	if err != nil {
		return "", "", err
	}
	if actualSHA256 != expectedSHA256 {
		return "", "", fmt.Errorf("安装前校验失败，更新包可能已被修改")
	}

	return safePath, expectedSHA256, nil
}

func safeDownloadedPath(value string) (string, bool) {
	updatesDir, err := paths.UpdatesDir()
	if err != nil {
		return "", false
	}
	updatesDir, err = filepath.Abs(updatesDir)
	if err != nil {
		return "", false
	}
	candidate, err := filepath.Abs(strings.TrimSpace(value))
	if err != nil {
		return "", false
	}
	relative, err := filepath.Rel(updatesDir, candidate)
	if err != nil ||
		relative == "." ||
		filepath.IsAbs(relative) ||
		relative == ".." ||
		strings.HasPrefix(relative, ".."+string(filepath.Separator)) ||
		filepath.Dir(relative) != "." {
		return "", false
	}
	return candidate, true
}

func stageExecutable(source string, destination string, expectedSHA256 string) error {
	sourceFile, err := os.Open(source)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	_ = os.Remove(destination)
	destinationFile, err := os.OpenFile(
		destination,
		os.O_CREATE|os.O_EXCL|os.O_WRONLY,
		0o700,
	)
	if err != nil {
		return err
	}

	hash := sha256.New()
	_, copyErr := io.Copy(io.MultiWriter(destinationFile, hash), sourceFile)
	syncErr := destinationFile.Sync()
	closeErr := destinationFile.Close()
	if copyErr != nil {
		_ = os.Remove(destination)
		return copyErr
	}
	if syncErr != nil {
		_ = os.Remove(destination)
		return syncErr
	}
	if closeErr != nil {
		_ = os.Remove(destination)
		return closeErr
	}

	actualSHA256 := hex.EncodeToString(hash.Sum(nil))
	if actualSHA256 != expectedSHA256 {
		_ = os.Remove(destination)
		return fmt.Errorf("暂存文件 SHA-256 校验失败")
	}
	return nil
}

func hashFile(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func waitForInstallerReady(path string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if fileExists(path) {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("更新安装器启动超时，应用保持运行")
}

func isValidSHA256(value string) bool {
	if len(value) != sha256.Size*2 {
		return false
	}
	decoded, err := hex.DecodeString(value)
	return err == nil && len(decoded) == sha256.Size
}

func isValidVersion(value string) bool {
	value = strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(value, "v"), "V"))
	if value == "" || len(value) > 64 {
		return false
	}
	for _, part := range strings.Split(value, ".") {
		if part == "" {
			return false
		}
		for _, char := range part {
			if char < '0' || char > '9' {
				return false
			}
		}
	}
	return true
}

func validateHTTPSURL(value string) error {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return err
	}
	if !strings.EqualFold(parsed.Scheme, "https") || parsed.Host == "" {
		return fmt.Errorf("更新地址必须使用 HTTPS")
	}
	return nil
}

func (s *Service) fetchManifest(ctx context.Context) (Manifest, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.manifestURL, nil)
	if err != nil {
		return Manifest{}, err
	}
	req.Header.Set("User-Agent", "PlotKityCat-Updater/"+version.Current())

	resp, err := s.client.Do(req)
	if err != nil {
		return Manifest{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Manifest{}, fmt.Errorf("检查更新失败: %s", resp.Status)
	}
	if resp.Request == nil || resp.Request.URL == nil ||
		!strings.EqualFold(resp.Request.URL.Scheme, "https") {
		return Manifest{}, fmt.Errorf("更新描述发生了不安全的重定向")
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxManifestSize+1))
	if err != nil {
		return Manifest{}, err
	}
	if len(body) > maxManifestSize {
		return Manifest{}, fmt.Errorf("更新描述超过大小限制")
	}
	body = bytes.TrimPrefix(body, []byte("\xef\xbb\xbf"))

	var manifest Manifest
	if err := json.Unmarshal(body, &manifest); err != nil {
		return Manifest{}, err
	}
	if !isValidVersion(manifest.Version) {
		return Manifest{}, fmt.Errorf("更新描述包含无效版本号")
	}
	if err := validateHTTPSURL(manifest.Windows.URL); err != nil {
		return Manifest{}, err
	}
	manifest.Windows.SHA256 = strings.ToLower(strings.TrimSpace(manifest.Windows.SHA256))
	if !isValidSHA256(manifest.Windows.SHA256) {
		return Manifest{}, fmt.Errorf("更新描述包含无效 SHA-256")
	}
	if manifest.Windows.Size < 0 || manifest.Windows.Size > maxUpdateSize {
		return Manifest{}, fmt.Errorf("更新描述包含无效文件大小")
	}

	return manifest, nil
}

func (s *Service) statusFromState(state State) Status {
	downloadedPath, safePath := safeDownloadedPath(state.DownloadedPath)
	downloaded := safePath &&
		state.DownloadedVersion != "" &&
		state.DownloadedVersion == state.LatestVersion &&
		fileExists(downloadedPath)
	available := compareVersions(state.LatestVersion, version.Current()) > 0

	message := strings.TrimSpace(state.LastKnownMessage)
	if message == "" {
		message = buildMessage(available, downloaded, state.LatestVersion)
	}

	return Status{
		CurrentVersion:  version.Current(),
		LatestVersion:   strings.TrimSpace(state.LatestVersion),
		Notes:           strings.TrimSpace(state.LatestNotes),
		PublishedAt:     strings.TrimSpace(state.LatestPublishedAt),
		LastCheckedAt:   strings.TrimSpace(state.LastCheckedAt),
		Message:         message,
		UpdateAvailable: available,
		Downloaded:      downloaded,
		ReadyToInstall:  downloaded,
	}
}

func buildMessage(available bool, downloaded bool, latest string) string {
	switch {
	case downloaded:
		return "更新已下载完成，重启后即可安装"
	case available && strings.TrimSpace(latest) != "":
		return "发现新版本 " + strings.TrimSpace(latest)
	case available:
		return "发现新版本"
	default:
		return "当前已经是最新版本"
	}
}

func canReuseCheck(lastCheckedAt string) bool {
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(lastCheckedAt))
	if err != nil {
		return false
	}

	return time.Since(parsed) < checkTTL
}

func staleUpdateCandidates(updatesDir string, keep string) []string {
	entries, err := os.ReadDir(updatesDir)
	if err != nil {
		return nil
	}

	pathsToRemove := make([]string, 0)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasPrefix(name, "PlotKityCat-") {
			continue
		}
		if name == keep || name == keep+".part" {
			continue
		}
		pathsToRemove = append(pathsToRemove, filepath.Join(updatesDir, name))
	}

	return pathsToRemove
}

func fileExists(path string) bool {
	if strings.TrimSpace(path) == "" {
		return false
	}
	_, err := os.Stat(path)
	return err == nil
}

func compareVersions(left string, right string) int {
	la := parseVersion(left)
	ra := parseVersion(right)
	for i := 0; i < len(la) || i < len(ra); i++ {
		lv := 0
		if i < len(la) {
			lv = la[i]
		}
		rv := 0
		if i < len(ra) {
			rv = ra[i]
		}
		if lv > rv {
			return 1
		}
		if lv < rv {
			return -1
		}
	}
	return 0
}

func parseVersion(value string) []int {
	trimmed := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(value, "v"), "V"))
	if trimmed == "" {
		return []int{0}
	}

	parts := strings.Split(trimmed, ".")
	parsed := make([]int, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			parsed = append(parsed, 0)
			continue
		}
		digits := strings.Builder{}
		for _, r := range part {
			if r < '0' || r > '9' {
				break
			}
			digits.WriteRune(r)
		}
		if digits.Len() == 0 {
			parsed = append(parsed, 0)
			continue
		}
		number, err := strconv.Atoi(digits.String())
		if err != nil {
			parsed = append(parsed, 0)
			continue
		}
		parsed = append(parsed, number)
	}

	return parsed
}
