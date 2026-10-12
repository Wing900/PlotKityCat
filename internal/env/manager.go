package env

import (
	"os"

	"plotkitycat/internal/paths"
	"plotkitycat/internal/workspaces"
)

type Manager struct {
	workspaces *workspaces.Manager
}

type Progress struct {
	Stage   string `json:"stage"`
	Message string `json:"message"`
	Percent int    `json:"percent"`
}

func NewManager(workspaceManager *workspaces.Manager) *Manager {
	return &Manager{workspaces: workspaceManager}
}

func (m *Manager) EnsureReady(onProgress func(Progress)) error {
	reportProgress(onProgress, Progress{
		Stage:   "preparing",
		Message: "Preparing workspace",
		Percent: 6,
	})

	if err := m.workspaces.EnsureReady(); err != nil {
		return err
	}

	return m.ensureRuntimeExtracted(onProgress)
}

func (m *Manager) Status() (Status, error) {
	return EvaluateStatus(DefaultRequirements())
}

func (m *Manager) Rebuild(onProgress func(Progress)) error {
	archivePath, err := paths.RuntimeArchivePath()
	if err != nil {
		return err
	}
	if _, err := os.Stat(archivePath); err != nil {
		return err
	}

	reportProgress(onProgress, Progress{
		Stage:   "rebuilding",
		Message: "Rebuilding runtime",
		Percent: 8,
	})

	return m.ensureRuntime(onProgress, true)
}

func reportProgress(onProgress func(Progress), progress Progress) {
	if onProgress == nil {
		return
	}

	onProgress(progress)
}
