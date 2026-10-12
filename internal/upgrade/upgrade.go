// Package upgrade owns the recoverable activation protocol shared by Setup and
// the in-app updater. User documents are never part of its managed entries.
package upgrade

import (
	"crypto/rand"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"plotkitycat/internal/processutil"
	"plotkitycat/internal/version"
)

//go:embed activate.ps1
var activationScript []byte

const Directory = ".plotkitycat-upgrade"

type Plan struct {
	Target          string   `json:"target"`
	Stage           string   `json:"stage"`
	Version         string   `json:"version"`
	MainPID         int      `json:"mainPid"`
	RegisterWorker  string   `json:"registerWorker,omitempty"`
	Token           string   `json:"token"`
	Entries         []string `json:"entries"`
	RecoverOnly     bool     `json:"recoverOnly,omitempty"`
	PreviousVersion string   `json:"previousVersion,omitempty"`
	StagedVersion   string   `json:"stagedVersion,omitempty"`
}

type Job struct {
	Cmd   *exec.Cmd
	Root  string
	Token string
}

func Start(plan Plan) (*Job, error) {
	var err error
	plan.Target, err = canonicalRoot(plan.Target)
	if err != nil {
		return nil, err
	}
	if !plan.RecoverOnly {
		plan.Stage, err = filepath.EvalSymlinks(plan.Stage)
		if err != nil {
			return nil, err
		}
	}
	if !plan.RecoverOnly {
		var err error
		plan.StagedVersion, err = ReadVersion(filepath.Join(plan.Stage, "PlotKityCat.exe"))
		if err != nil {
			return nil, err
		}
		old := filepath.Join(plan.Target, "PlotKityCat.exe")
		if _, err := os.Stat(old); err == nil {
			plan.PreviousVersion, err = ReadVersion(old)
			if err != nil {
				return nil, err
			}
		} else if !os.IsNotExist(err) {
			return nil, err
		}
	}
	root, err := os.MkdirTemp("", "plotkitycat-activation-")
	if err != nil {
		return nil, err
	}
	failed := true
	defer func() {
		if failed {
			_ = os.RemoveAll(root)
		}
	}()
	var token [32]byte
	if _, err := rand.Read(token[:]); err != nil {
		return nil, err
	}
	plan.Token = hex.EncodeToString(token[:])
	plan.Entries = []string{"PlotKityCat.exe", "resources", ".plotkitycat-installed", ".plotkitycat-legacy-source", "uninstall.exe"}
	data, err := json.Marshal(plan)
	if err != nil {
		return nil, err
	}
	if err := os.WriteFile(filepath.Join(root, "plan.json"), data, 0600); err != nil {
		return nil, err
	}
	script := append([]byte{0xef, 0xbb, 0xbf}, activationScript...)
	if err := os.WriteFile(filepath.Join(root, "activate.ps1"), script, 0600); err != nil {
		return nil, err
	}
	cmd := exec.Command("powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", filepath.Join(root, "activate.ps1"), "-PlanPath", filepath.Join(root, "plan.json"))
	cmd.SysProcAttr = processutil.WithoutConsoleWindow()
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	failed = false
	return &Job{Cmd: cmd, Root: root, Token: plan.Token}, nil
}

func canonicalRoot(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if _, err := os.Stat(abs); err == nil {
		return filepath.EvalSymlinks(abs)
	} else if !os.IsNotExist(err) {
		return "", err
	}
	parent, err := filepath.EvalSymlinks(filepath.Dir(abs))
	if err != nil {
		return "", err
	}
	return filepath.Join(parent, filepath.Base(abs)), nil
}

func (j *Job) WaitReady(timeout time.Duration) error {
	until := time.Now().Add(timeout)
	for time.Now().Before(until) {
		if data, err := os.ReadFile(filepath.Join(j.Root, "worker.ready")); err == nil && string(data) == j.Token {
			return nil
		}
		if data, err := os.ReadFile(filepath.Join(j.Root, "error.txt")); err == nil {
			return fmt.Errorf("升级准备失败：%s", data)
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("升级准备超时")
}

// ReportReady is called only after the frontend's initialization succeeds.
// The nonce binds the acknowledgement to this activation, version and process.
func ReportReady() error {
	args := os.Args
	for i := 1; i+1 < len(args); i++ {
		if args[i] != "--plotkitycat-upgrade-token" {
			continue
		}
		exe, err := os.Executable()
		if err != nil {
			return err
		}
		root := filepath.Join(filepath.Dir(exe), Directory)
		var pending struct {
			Token   string `json:"token"`
			Version string `json:"version"`
		}
		data, err := os.ReadFile(filepath.Join(root, "pending.json"))
		if err != nil {
			return err
		}
		if err := json.Unmarshal(data, &pending); err != nil {
			return err
		}
		if pending.Token != args[i+1] || pending.Version != version.Current() {
			return fmt.Errorf("升级启动身份不匹配")
		}
		ready, _ := json.Marshal(map[string]any{"token": pending.Token, "version": version.Current(), "pid": os.Getpid()})
		path := filepath.Join(root, "app.ready")
		if err := os.WriteFile(path+".tmp", ready, 0600); err != nil {
			return err
		}
		return os.Rename(path+".tmp", path)
	}
	return nil
}

// RecoverStartup delegates recovery to an external process so Windows can
// release this executable before its backup is restored after a power loss.
func RecoverStartup() (bool, error) {
	for _, arg := range os.Args {
		if arg == "--plotkitycat-upgrade-token" {
			return false, nil
		}
	}
	exe, err := os.Executable()
	if err != nil {
		return false, err
	}
	root := filepath.Dir(exe)
	if _, err := os.Stat(filepath.Join(root, Directory, "pending.json")); os.IsNotExist(err) {
		return false, nil
	} else if err != nil {
		return false, err
	}
	job, err := Start(Plan{Target: root, Stage: root + ".unused", MainPID: os.Getpid(), RecoverOnly: true})
	if err != nil {
		return false, err
	}
	if err := job.WaitReady(30 * time.Second); err != nil {
		_ = job.Cmd.Process.Kill()
		_ = job.Cmd.Wait()
		return false, err
	}
	return true, job.Cmd.Process.Release()
}
