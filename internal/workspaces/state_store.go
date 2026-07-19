package workspaces

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"plotkitycat/internal/paths"
)

type stateFile struct {
	CurrentWorkspace string `json:"current_workspace"`
}

// statePathProvider 默认指向 paths.WorkspaceStatePath, 测试可经 WithWorkspaceStatePath 注入临时文件。
var statePathProvider = func() (string, error) { return paths.WorkspaceStatePath() }

// WithWorkspaceStatePath 覆盖 statePathProvider, 返回 restore (测试用 t.Cleanup)。
func WithWorkspaceStatePath(path string) func() {
	orig := statePathProvider
	statePathProvider = func() (string, error) { return path, nil }
	return func() { statePathProvider = orig }
}

type StateStore struct{}

func NewStateStore() *StateStore {
	return &StateStore{}
}

func (s *StateStore) LoadCurrentWorkspace() (string, error) {
	path, err := statePathProvider()
	if err != nil {
		return "", err
	}

	content, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}

	var state stateFile
	if err := json.Unmarshal(content, &state); err != nil {
		return "", err
	}

	return strings.TrimSpace(state.CurrentWorkspace), nil
}

func (s *StateStore) SaveCurrentWorkspace(name string) error {
	path, err := statePathProvider()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	content, err := json.MarshalIndent(stateFile{
		CurrentWorkspace: strings.TrimSpace(name),
	}, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, append(content, '\n'), 0o644)
}