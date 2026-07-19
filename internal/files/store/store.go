package store

import (
	"plotkitycat/internal/workspaces"
)

const (
	sceneMainFile   = "main.py"
	sceneNoteFile   = "note.md"
	sceneAssetsDir  = "assets"
	sceneOrderFile  = ".plotkitycat-scenes.json"
	defaultMimeType = "application/octet-stream"
)

// WorkspaceResolver 抽出 workspaces.Manager 中 filestore 用到的 3 个方法,
// 便于测试注入 fake (返回 t.TempDir()), 不影响 *workspaces.Manager 作为生产实现。
type WorkspaceResolver interface {
	CurrentDir() (string, error)
	WorkspaceDir(name string) (string, error)
	ReserveWorkspaceImport(name string) (string, string, error)
}

type NoteImage struct {
	Alt          string
	DataURL      string
	Name         string
	RelativePath string
}

type NoteDocument struct {
	Images   []NoteImage
	Markdown string
}

type Store struct {
	workspaces WorkspaceResolver
}

type sceneOrderManifest struct {
	Scenes []string `json:"scenes"`
}

func NewStore(workspaceManager WorkspaceResolver) *Store {
	return &Store{workspaces: workspaceManager}
}

// 编译期断言: *workspaces.Manager 满足 WorkspaceResolver 接口
var _ WorkspaceResolver = (*workspaces.Manager)(nil)
