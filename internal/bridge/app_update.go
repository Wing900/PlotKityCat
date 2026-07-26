package bridge

import (
	"errors"

	"plotkitycat/internal/updater"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) GetUpdateStatus() (UpdateStatus, error) {
	if a.updateService == nil {
		return UpdateStatus{}, nil
	}

	status, err := a.updateService.Status()
	if err != nil {
		return UpdateStatus{}, err
	}

	return mapUpdateStatus(status), nil
}

func (a *App) CheckForUpdates(force bool) (UpdateStatus, error) {
	if a.updateService == nil {
		return UpdateStatus{}, nil
	}

	status, err := a.updateService.Check(a.ctx, force)
	if err != nil {
		return UpdateStatus{}, err
	}

	return mapUpdateStatus(status), nil
}

func (a *App) DownloadUpdate() (UpdateStatus, error) {
	if a.updateService == nil {
		return UpdateStatus{}, nil
	}

	status, err := a.updateService.Download(a.ctx)
	if err != nil {
		return UpdateStatus{}, err
	}

	return mapUpdateStatus(status), nil
}

func (a *App) InstallUpdateAndRestart() error {
	if err := a.requireContext(); err != nil {
		return err
	}
	if a.runner != nil && a.runner.IsRunning() {
		return errors.New("请先停止当前 Python 进程，再安装更新")
	}
	if a.updateService == nil {
		return errors.New("更新服务未初始化")
	}

	if err := a.updateService.InstallAndRestart(); err != nil {
		return err
	}

	// Installer 已完成 Ready Handshake；通过 Wails 生命周期退出，确保 Shutdown 全部执行。
	runtime.Quit(a.ctx)
	return nil
}

func mapUpdateStatus(status updater.Status) UpdateStatus {
	return UpdateStatus{
		CurrentVersion:  status.CurrentVersion,
		LatestVersion:   status.LatestVersion,
		Notes:           status.Notes,
		PublishedAt:     status.PublishedAt,
		LastCheckedAt:   status.LastCheckedAt,
		Message:         status.Message,
		UpdateAvailable: status.UpdateAvailable,
		Downloaded:      status.Downloaded,
		ReadyToInstall:  status.ReadyToInstall,
	}
}
