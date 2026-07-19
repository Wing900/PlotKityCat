package store

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubResolver struct{ root string }

func (s stubResolver) CurrentDir() (string, error)              { return s.root, nil }
func (s stubResolver) WorkspaceDir(name string) (string, error) { return filepath.Join(s.root, name), nil }
func (s stubResolver) ReserveWorkspaceImport(name string) (string, string, error) {
	return name, filepath.Join(s.root, name), nil
}

func newTestStore(t *testing.T) *Store {
	t.Helper()
	dir := t.TempDir()
	require.NoError(t, os.MkdirAll(dir, 0o755))
	return NewStore(stubResolver{root: dir})
}

func TestListScripts_EmptyDir(t *testing.T) {
	s := newTestStore(t)
	scenes, err := s.ListScripts()
	require.NoError(t, err)
	assert.Empty(t, scenes)
}

func TestCreateScript_CreatesMainAndNote(t *testing.T) {
	s := newTestStore(t)
	name, err := s.CreateScript("scene-a")
	require.NoError(t, err)
	assert.Equal(t, "scene-a", name)

	// main.py + note.md 存在
	dir := filepath.Join(s.workspaces.(stubResolver).root, "scene-a")
	_, err = os.Stat(filepath.Join(dir, "main.py"))
	assert.NoError(t, err)
	_, err = os.Stat(filepath.Join(dir, "note.md"))
	assert.NoError(t, err)
}

func TestCreateScript_IdempotentIfExists(t *testing.T) {
	s := newTestStore(t)
	_, err := s.CreateScript("scene-a")
	require.NoError(t, err)
	name, err := s.CreateScript("scene-a")
	require.NoError(t, err)
	assert.Equal(t, "scene-a", name)
}

func TestListScripts_ReturnsCreatedOrder(t *testing.T) {
	s := newTestStore(t)
	_, _ = s.CreateScript("scene-b")
	_, _ = s.CreateScript("scene-a")
	scenes, err := s.ListScripts()
	require.NoError(t, err)
	// 按保存顺序 (b 先 a 后), 不是字母序
	assert.Equal(t, []string{"scene-b", "scene-a"}, scenes)
}

func TestReadScript_ReturnsContent(t *testing.T) {
	s := newTestStore(t)
	_, _ = s.SaveScript("scene-a", "print('hi')")
	code, err := s.ReadScript("scene-a")
	require.NoError(t, err)
	assert.Equal(t, "print('hi')", code)
}

func TestReadScript_NotExistErrors(t *testing.T) {
	s := newTestStore(t)
	_, err := s.ReadScript("nope")
	assert.Error(t, err)
}

func TestSaveScript_ThenReadBack(t *testing.T) {
	s := newTestStore(t)
	name, err := s.SaveScript("scene-x", "x = 1")
	require.NoError(t, err)
	assert.Equal(t, "scene-x", name)
	code, err := s.ReadScript("scene-x")
	require.NoError(t, err)
	assert.Equal(t, "x = 1", code)
}

func TestRenameScript_MovesDirAndUpdatesOrder(t *testing.T) {
	s := newTestStore(t)
	_, _ = s.CreateScript("old-name")
	newName, err := s.RenameScript("old-name", "new-name")
	require.NoError(t, err)
	assert.Equal(t, "new-name", newName)

	root := s.workspaces.(stubResolver).root
	_, err = os.Stat(filepath.Join(root, "old-name"))
	assert.True(t, os.IsNotExist(err))
	_, err = os.Stat(filepath.Join(root, "new-name", "main.py"))
	assert.NoError(t, err)

	scenes, err := s.ListScripts()
	require.NoError(t, err)
	assert.Equal(t, []string{"new-name"}, scenes)
}

func TestRenameScript_TargetExistsErrors(t *testing.T) {
	s := newTestStore(t)
	_, _ = s.CreateScript("a")
	_, _ = s.CreateScript("b")
	_, err := s.RenameScript("a", "b")
	assert.ErrorContains(t, err, "already exists")
}

func TestDeleteScript_RemovesDirAndOrder(t *testing.T) {
	s := newTestStore(t)
	_, _ = s.CreateScript("scene-a")
	require.NoError(t, s.DeleteScript("scene-a"))

	root := s.workspaces.(stubResolver).root
	_, err := os.Stat(filepath.Join(root, "scene-a"))
	assert.True(t, os.IsNotExist(err))

	scenes, err := s.ListScripts()
	require.NoError(t, err)
	assert.Empty(t, scenes)
}

func TestReorderScripts_PersistsOrder(t *testing.T) {
	s := newTestStore(t)
	_, _ = s.CreateScript("a")
	_, _ = s.CreateScript("b")
	_, _ = s.CreateScript("c")
	require.NoError(t, s.ReorderScripts([]string{"c", "a", "b"}))
	scenes, err := s.ListScripts()
	require.NoError(t, err)
	assert.Equal(t, []string{"c", "a", "b"}, scenes)
}

func TestSceneMainPath_JoinsDirAndMain(t *testing.T) {
	s := newTestStore(t)
	path, err := s.SceneMainPath("scene-a")
	require.NoError(t, err)
	assert.Contains(t, path, "scene-a")
	assert.Contains(t, path, "main.py")
}

func TestSceneDir_EmptyNameFallsBackToUntitled(t *testing.T) {
	s := newTestStore(t)
	path, err := s.SceneDir("   ")
	require.NoError(t, err)
	assert.Contains(t, path, "untitled")
}