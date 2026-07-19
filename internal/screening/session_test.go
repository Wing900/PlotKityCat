package screening

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeSceneNames_DedupesAndDropsEmpty(t *testing.T) {
	got := normalizeSceneNames([]string{"a", "", "b", "a", "c", ""})
	assert.Equal(t, []string{"a", "b", "c"}, got)
}

func TestNormalizeSceneNames_AllEmptyReturnsEmpty(t *testing.T) {
	assert.Empty(t, normalizeSceneNames([]string{"", ""}))
}

func TestNormalizeStartRequest_EmptyScenesErrors(t *testing.T) {
	_, _, _, _, err := normalizeStartRequest(StartRequest{})
	assert.ErrorContains(t, err, "至少选择一个场景")
}

func TestNormalizeStartRequest_Defaults(t *testing.T) {
	names, start, pool, anim, err := normalizeStartRequest(StartRequest{SceneNames: []string{"a", "b"}})
	require.NoError(t, err)
	assert.Equal(t, []string{"a", "b"}, names)
	assert.Equal(t, 0, start)
	assert.Equal(t, 3, pool)
	assert.Equal(t, AnimationCrossfade, anim)
}

func TestNormalizeStartRequest_PreservesCustomValues(t *testing.T) {
	names, start, pool, anim, err := normalizeStartRequest(StartRequest{
		SceneNames: []string{"a", "b", "c"},
		StartIndex: 1,
		PoolSize:   2,
		Animation:  AnimationSlideLeft,
	})
	require.NoError(t, err)
	assert.Equal(t, []string{"a", "b", "c"}, names)
	assert.Equal(t, 1, start)
	assert.Equal(t, 2, pool)
	assert.Equal(t, AnimationSlideLeft, anim)
}

func TestNormalizeStartRequest_StartIndexOutOfRangeClamped(t *testing.T) {
	_, start, _, _, err := normalizeStartRequest(StartRequest{SceneNames: []string{"a"}, StartIndex: 99})
	require.NoError(t, err)
	assert.Equal(t, 0, start)

	_, start, _, _, err = normalizeStartRequest(StartRequest{SceneNames: []string{"a"}, StartIndex: -1})
	require.NoError(t, err)
	assert.Equal(t, 0, start)
}

func TestSceneNameOf_NilSafe(t *testing.T) {
	assert.Equal(t, "", sceneNameOf(nil))
	assert.Equal(t, "scene-1", sceneNameOf(&poolEntry{sceneName: "scene-1"}))
}

func TestEntryWindow_NilSafe(t *testing.T) {
	assert.Equal(t, uintptr(0), entryWindow(nil))
	assert.Equal(t, uintptr(42), entryWindow(&poolEntry{hwnd: 42}))
}

func TestOrderedStackEntries_FiltersCurrentAndSortsByIndex(t *testing.T) {
	entries := []*poolEntry{
		{sceneName: "b", index: 2},
		{sceneName: "a", index: 0},
		{sceneName: "c", index: 1},
		nil,
	}
	ordered := orderedStackEntries(entries, "b") // 排除 b + nil
	require.Len(t, ordered, 2)
	assert.Equal(t, "a", ordered[0].sceneName)
	assert.Equal(t, "c", ordered[1].sceneName)
}

func TestOrderedStackEntries_EmptyInputSafe(t *testing.T) {
	assert.Empty(t, orderedStackEntries(nil, ""))
}

func TestTargetIndicesLocked_ReturnsFromCurrentToPoolLimit(t *testing.T) {
	s := &Service{currentIndex: 1, poolSize: 2, sceneNames: []string{"a", "b", "c", "d"}}
	got := s.targetIndicesLocked()
	assert.Equal(t, []int{1, 2}, got)
}

func TestTargetIndicesLocked_ClampsToScenesLength(t *testing.T) {
	s := &Service{currentIndex: 2, poolSize: 5, sceneNames: []string{"a", "b", "c"}}
	got := s.targetIndicesLocked()
	assert.Equal(t, []int{2}, got)
}

func TestStateLocked_ReflectsActiveFields(t *testing.T) {
	s := &Service{
		active:       true,
		sceneNames:   []string{"a", "b", "c"},
		currentIndex: 1,
		poolSize:     2,
		animation:    AnimationCrossfade,
	}
	state := s.stateLocked()
	assert.True(t, state.Active)
	assert.Equal(t, []string{"a", "b", "c"}, state.SceneNames)
	assert.Equal(t, 1, state.CurrentIndex)
	assert.Equal(t, "b", state.CurrentSceneName)
	assert.Equal(t, 2, state.PoolSize)
	assert.Equal(t, "crossfade", state.Animation)
}

func TestStateLocked_InactiveOmitsCurrentSceneName(t *testing.T) {
	s := &Service{active: false, sceneNames: []string{"a"}, currentIndex: 0}
	state := s.stateLocked()
	assert.False(t, state.Active)
	assert.Equal(t, "", state.CurrentSceneName)
}