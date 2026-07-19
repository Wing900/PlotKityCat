package codeversions

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubSceneDirResolver struct{ root string }

func (s stubSceneDirResolver) SceneDir(sceneName string) (string, error) {
	return filepath.Join(s.root, sceneName), nil
}

func newTestStore(t *testing.T) *Store {
	t.Helper()
	return NewStore(stubSceneDirResolver{root: t.TempDir()})
}

func TestList_EmptySceneReturnsEmpty(t *testing.T) {
	store := newTestStore(t)
	versions, err := store.List("scene-a")
	require.NoError(t, err)
	assert.Empty(t, versions)
}

func TestCreate_EmptyCodeErrors(t *testing.T) {
	store := newTestStore(t)
	_, err := store.Create("scene-a", "note", "  ")
	assert.ErrorContains(t, err, "版本代码为空")
}

func TestCreate_EmptyNoteUsesDefault(t *testing.T) {
	store := newTestStore(t)
	v, err := store.Create("scene-a", "  ", "code")
	require.NoError(t, err)
	assert.Equal(t, "AI 优化版本", v.Note)
}

func TestCreate_LabelsIncrement(t *testing.T) {
	store := newTestStore(t)
	v1, err := store.Create("scene-a", "n1", "c1")
	require.NoError(t, err)
	assert.Equal(t, "版本01", v1.Label)
	v2, err := store.Create("scene-a", "n2", "c2")
	require.NoError(t, err)
	assert.Equal(t, "版本02", v2.Label)
}

func TestCreate_PersistsAndListReads(t *testing.T) {
	store := newTestStore(t)
	_, err := store.Create("scene-a", "n", "c")
	require.NoError(t, err)
	versions, err := store.List("scene-a")
	require.NoError(t, err)
	assert.Len(t, versions, 1)
	assert.Equal(t, "c", versions[0].Code)
}

func TestDelete_RemovesAndRelabels(t *testing.T) {
	store := newTestStore(t)
	v1, _ := store.Create("scene-a", "n1", "c1")
	v2, _ := store.Create("scene-a", "n2", "c2")
	v3, _ := store.Create("scene-a", "n3", "c3")

	remaining, err := store.Delete("scene-a", v2.ID)
	require.NoError(t, err)
	assert.Len(t, remaining, 2)
	// 删除中间一个后 relabel: v1->版本01, v3->版本02
	assert.Equal(t, "版本01", remaining[0].Label)
	assert.Equal(t, "版本02", remaining[1].Label)
	assert.Equal(t, v1.ID, remaining[0].ID)
	assert.Equal(t, v3.ID, remaining[1].ID)
}

func TestDelete_UnknownIdKeepsAll(t *testing.T) {
	store := newTestStore(t)
	store.Create("scene-a", "n", "c")
	remaining, err := store.Delete("scene-a", "nope")
	require.NoError(t, err)
	assert.Len(t, remaining, 1)
}

func TestCreate_DifferentScenesAreIsolated(t *testing.T) {
	store := newTestStore(t)
	store.Create("scene-a", "n", "c-a")
	store.Create("scene-b", "n", "c-b")
	a, _ := store.List("scene-a")
	b, _ := store.List("scene-b")
	assert.Len(t, a, 1)
	assert.Len(t, b, 1)
	assert.Equal(t, "c-a", a[0].Code)
	assert.Equal(t, "c-b", b[0].Code)
}