package workspaces

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestManager(t *testing.T) *Manager {
	t.Helper()
	root := t.TempDir()
	statePath := filepath.Join(t.TempDir(), "state.json")
	t.Cleanup(WithScriptsRoot(root))
	t.Cleanup(WithWorkspaceStatePath(statePath))
	return NewManager()
}

func makeWorkspaceDir(t *testing.T, root, name string) string {
	t.Helper()
	p := filepath.Join(root, name)
	require.NoError(t, os.MkdirAll(p, 0o755))
	return p
}

func TestNormalizeName_StripsInvalidChars(t *testing.T) {
	assert.Equal(t, "name", NormalizeName("na<me>:/\\|?*"))
	assert.Equal(t, "trimmed", NormalizeName("  trimmed  "))
	assert.Equal(t, "", NormalizeName("<<>>"))
}

func TestContains(t *testing.T) {
	assert.True(t, contains([]string{"a", "b"}, "b"))
	assert.False(t, contains([]string{"a", "b"}, "c"))
	assert.False(t, contains(nil, "x"))
}

func TestChooseInitialWorkspace_PrefersDefault(t *testing.T) {
	assert.Equal(t, DefaultName, chooseInitialWorkspace([]string{"other", DefaultName}))
}

func TestChooseInitialWorkspace_FallsBackToFirst(t *testing.T) {
	assert.Equal(t, "first", chooseInitialWorkspace([]string{"first", "second"}))
}

func TestList_EmptyRootCreatesDefault(t *testing.T) {
	m := newTestManager(t)
	ws, err := m.List()
	require.NoError(t, err)
	// CurrentDir 在空 root 下创建 DefaultName
	assert.NotEmpty(t, ws)
	assert.Equal(t, DefaultName, ws[0].Name)
}

func TestCreate_CreatesWorkspaceAndSetsActive(t *testing.T) {
	m := newTestManager(t)
	ws, err := m.Create("新空间")
	require.NoError(t, err)
	assert.Equal(t, "新空间", ws.Name)
	assert.Equal(t, 0, ws.SceneCount)
	assert.Equal(t, "新空间", m.active)
}

func TestCreate_DuplicateErrors(t *testing.T) {
	m := newTestManager(t)
	_, err := m.Create("dup")
	require.NoError(t, err)
	_, err = m.Create("dup")
	assert.ErrorContains(t, err, "already exists")
}

func TestCreate_EmptyNameErrors(t *testing.T) {
	m := newTestManager(t)
	_, err := m.Create("")
	assert.ErrorContains(t, err, "empty")
}

func TestSwitch_SetsActiveAndPersists(t *testing.T) {
	m := newTestManager(t)
	makeWorkspaceDir(t, t.TempDir(), "ignored") // 占位, 确保 root 已知
	// 用真实注入的 root
	root := t.TempDir()
	t.Cleanup(WithScriptsRoot(root))
	statePath := filepath.Join(t.TempDir(), "state.json")
	t.Cleanup(WithWorkspaceStatePath(statePath))

	makeWorkspaceDir(t, root, "ws-a")
	require.NoError(t, m.Switch("ws-a"))
	assert.Equal(t, "ws-a", m.active)

	// 重新 Load 验证持久化
	m2 := NewManager()
	_, err := m2.CurrentDir()
	require.NoError(t, err)
	assert.Equal(t, "ws-a", m2.active)
}

func TestSwitch_UnknownWorkspaceErrors(t *testing.T) {
	m := newTestManager(t)
	assert.Error(t, m.Switch("nope"))
}

func TestSwitch_EmptyNameErrors(t *testing.T) {
	m := newTestManager(t)
	assert.ErrorContains(t, m.Switch(""), "empty")
}

func TestWorkspaceDir_ReturnsPath(t *testing.T) {
	m := newTestManager(t)
	makeWorkspaceDir(t, t.TempDir(), "ignored")
	root := t.TempDir()
	t.Cleanup(WithScriptsRoot(root))
	statePath := filepath.Join(t.TempDir(), "state.json")
	t.Cleanup(WithWorkspaceStatePath(statePath))

	makeWorkspaceDir(t, root, "ws-x")
	p, err := m.WorkspaceDir("ws-x")
	require.NoError(t, err)
	assert.Contains(t, p, "ws-x")
}

func TestWorkspaceDir_UnknownErrors(t *testing.T) {
	m := newTestManager(t)
	_, err := m.WorkspaceDir("nope")
	assert.Error(t, err)
}

func TestWorkspaceDir_EmptyNameErrors(t *testing.T) {
	m := newTestManager(t)
	_, err := m.WorkspaceDir("")
	assert.ErrorContains(t, err, "empty")
}

func TestReserveWorkspaceImport_CreatesUniquePath(t *testing.T) {
	m := newTestManager(t)
	root := t.TempDir()
	t.Cleanup(WithScriptsRoot(root))
	statePath := filepath.Join(t.TempDir(), "state.json")
	t.Cleanup(WithWorkspaceStatePath(statePath))

	name1, path1, err := m.ReserveWorkspaceImport("导入空间")
	require.NoError(t, err)
	require.DirExists(t, path1)
	name2, path2, err := m.ReserveWorkspaceImport("导入空间")
	require.NoError(t, err)
	assert.NotEqual(t, path1, path2) // 第二次去重 "导入空间 副本2"
	assert.Equal(t, "导入空间", name1)
	assert.Contains(t, name2, "副本")
}

func TestReserveWorkspaceImport_EmptyNameUsesDefault(t *testing.T) {
	m := newTestManager(t)
	root := t.TempDir()
	t.Cleanup(WithScriptsRoot(root))
	statePath := filepath.Join(t.TempDir(), "state.json")
	t.Cleanup(WithWorkspaceStatePath(statePath))

	name, _, err := m.ReserveWorkspaceImport("")
	require.NoError(t, err)
	assert.Equal(t, DefaultName, name)
}

func TestRename_MovesDir(t *testing.T) {
	m := newTestManager(t)
	root := t.TempDir()
	t.Cleanup(WithScriptsRoot(root))
	statePath := filepath.Join(t.TempDir(), "state.json")
	t.Cleanup(WithWorkspaceStatePath(statePath))

	makeWorkspaceDir(t, root, "old")
	ws, err := m.Rename("old", "new")
	require.NoError(t, err)
	assert.Equal(t, "new", ws.Name)
	assert.NoDirExists(t, filepath.Join(root, "old"))
	assert.DirExists(t, filepath.Join(root, "new"))
}

func TestRename_TargetExistsErrors(t *testing.T) {
	m := newTestManager(t)
	root := t.TempDir()
	t.Cleanup(WithScriptsRoot(root))
	statePath := filepath.Join(t.TempDir(), "state.json")
	t.Cleanup(WithWorkspaceStatePath(statePath))

	makeWorkspaceDir(t, root, "a")
	makeWorkspaceDir(t, root, "b")
	_, err := m.Rename("a", "b")
	assert.ErrorContains(t, err, "already exists")
}

func TestRename_EmptyNameErrors(t *testing.T) {
	m := newTestManager(t)
	_, err := m.Rename("", "x")
	assert.ErrorContains(t, err, "empty")
}

func TestDelete_RemovesDir(t *testing.T) {
	m := newTestManager(t)
	root := t.TempDir()
	t.Cleanup(WithScriptsRoot(root))
	statePath := filepath.Join(t.TempDir(), "state.json")
	t.Cleanup(WithWorkspaceStatePath(statePath))

	makeWorkspaceDir(t, root, "doomed")
	require.NoError(t, m.Delete("doomed"))
	assert.NoDirExists(t, filepath.Join(root, "doomed"))
}

func TestDelete_ActiveWorkspaceErrors(t *testing.T) {
	m := newTestManager(t)
	root := t.TempDir()
	t.Cleanup(WithScriptsRoot(root))
	statePath := filepath.Join(t.TempDir(), "state.json")
	t.Cleanup(WithWorkspaceStatePath(statePath))

	makeWorkspaceDir(t, root, "active")
	require.NoError(t, m.Switch("active"))
	err := m.Delete("active")
	assert.ErrorContains(t, err, "不能删除")
}

func TestDelete_EmptyNameErrors(t *testing.T) {
	m := newTestManager(t)
	assert.ErrorContains(t, m.Delete(""), "empty")
}

func TestNextAvailablePath_FirstChoiceIfFree(t *testing.T) {
	root := t.TempDir()
	assert.Equal(t, filepath.Join(root, "free"), nextAvailablePath(root, "free"))
}

func TestNextAvailablePath_AppendsCopyNumber(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, "name"), 0o755))
	p := nextAvailablePath(root, "name")
	assert.Contains(t, p, "副本2")
}