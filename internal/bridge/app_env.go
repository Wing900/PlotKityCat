package bridge

import (
	"errors"

	"plotkitycat/internal/env"
)

func (a *App) GetEnvironmentStatus() (EnvironmentStatus, error) {
	status, err := a.envManager.Status()
	if err != nil {
		return EnvironmentStatus{}, err
	}

	items := make([]EnvironmentCheckItem, 0, len(status.Items))
	for _, item := range status.Items {
		items = append(items, EnvironmentCheckItem{
			Key:          item.Key,
			Label:        item.Label,
			RelativePath: item.RelativePath,
			Category:     item.Category,
			Status:       item.Status,
			Message:      item.Message,
			Exists:       item.Exists,
		})
	}

	return EnvironmentStatus{
		Ready:                status.Ready,
		Code:                 status.Code,
		Severity:             status.Severity,
		RuntimeDir:           status.RuntimeDir,
		Summary:              status.Summary,
		RecommendedAction:    status.RecommendedAction,
		CheckedAt:            status.CheckedAt,
		Items:                items,
		Missing:              status.Missing,
		CanRebuild:           status.CanRebuild,
		RuntimeArchivePath:   status.RuntimeArchivePath,
		RuntimeArchiveExists: status.RuntimeArchiveExists,
	}, nil
}

func (a *App) InitializeApp() (InitSnapshot, error) {
	if err := a.requireContext(); err != nil {
		return InitSnapshot{}, err
	}

	err := a.envManager.EnsureReady(func(progress env.Progress) {
		a.emit(EventEnvironmentProgress, InitProgress{
			Stage:   progress.Stage,
			Message: progress.Message,
			Percent: progress.Percent,
		})
	})
	if err != nil {
		a.emit(EventAppError, EventPayload{
			Message: err.Error(),
		})
		return InitSnapshot{}, err
	}

	environment, err := a.GetEnvironmentStatus()
	if err != nil {
		return InitSnapshot{}, err
	}
	a.emit(EventEnvironmentStatus, environment)
	a.emit(EventAppReady, EventPayload{
		Message: "runtime ready",
	})

	workspace, err := a.BootstrapWorkspace()
	if err != nil {
		return InitSnapshot{}, err
	}

	return InitSnapshot{
		Environment: environment,
		Workspace:   workspace,
	}, nil
}

func (a *App) RebuildRuntime() (EnvironmentStatus, error) {
	if err := a.requireContext(); err != nil {
		return EnvironmentStatus{}, err
	}
	if a.runner.IsRunning() {
		return EnvironmentStatus{}, errors.New("请先停止当前 Python 进程，再重建 Runtime")
	}

	err := a.envManager.Rebuild(func(progress env.Progress) {
		a.emit(EventEnvironmentProgress, InitProgress{
			Stage:   progress.Stage,
			Message: progress.Message,
			Percent: progress.Percent,
		})
	})
	if err != nil {
		a.emit(EventAppError, EventPayload{
			Message: err.Error(),
		})
		return EnvironmentStatus{}, err
	}

	environment, err := a.GetEnvironmentStatus()
	if err != nil {
		return EnvironmentStatus{}, err
	}

	a.emit(EventEnvironmentStatus, environment)
	return environment, nil
}