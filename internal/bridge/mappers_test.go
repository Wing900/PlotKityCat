package bridge

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"plotkitycat/internal/ai"
	"plotkitycat/internal/screening"
	"plotkitycat/internal/updater"
)

func TestMapScreeningState_CopiesAllFields(t *testing.T) {
	state := screening.SessionState{
		Active:           true,
		SceneNames:       []string{"a", "b", "c"},
		CurrentIndex:     1,
		CurrentSceneName: "b",
		PoolSize:         3,
		Animation:        "crossfade",
	}
	got := mapScreeningState(state)
	assert.True(t, got.Active)
	assert.Equal(t, []string{"a", "b", "c"}, got.SceneNames)
	assert.Equal(t, 1, got.CurrentIndex)
	assert.Equal(t, "b", got.CurrentSceneName)
	assert.Equal(t, 3, got.PoolSize)
	assert.Equal(t, "crossfade", got.Animation)
}

func TestMapScreeningState_CopiesSliceIndependently(t *testing.T) {
	state := screening.SessionState{SceneNames: []string{"x"}}
	got := mapScreeningState(state)
	// 改原 slice 不影响映射结果
	state.SceneNames[0] = "mutated"
	assert.Equal(t, "x", got.SceneNames[0])
}

func TestMapScreeningState_EmptySceneNamesSafe(t *testing.T) {
	got := mapScreeningState(screening.SessionState{})
	assert.Empty(t, got.SceneNames)
}

func TestMapUpdateStatus_CopiesAllFields(t *testing.T) {
	status := updater.Status{
		CurrentVersion:  "1.2.3",
		LatestVersion:   "1.2.4",
		Notes:           "fixes",
		PublishedAt:     "2026-01-01",
		LastCheckedAt:   "2026-07-19",
		Message:         "new version",
		UpdateAvailable: true,
		Downloaded:      false,
		ReadyToInstall:  false,
	}
	got := mapUpdateStatus(status)
	assert.Equal(t, "1.2.3", got.CurrentVersion)
	assert.Equal(t, "1.2.4", got.LatestVersion)
	assert.Equal(t, "fixes", got.Notes)
	assert.True(t, got.UpdateAvailable)
}

func TestMapAISelectionItems_MapsAllFields(t *testing.T) {
	items := []AISelectionItem{
		{Kind: "text", Text: "hi"},
		{Kind: "image", Name: "a.png", Alt: "alt", DataURL: "data:x", RelativePath: "rel/a.png"},
	}
	got := mapAISelectionItems(items)
	assert.Len(t, got, 2)
	assert.Equal(t, ai.SelectionItem{Kind: "text", Text: "hi"}, got[0])
	assert.Equal(t, "image", got[1].Kind)
	assert.Equal(t, "a.png", got[1].Name)
	assert.Equal(t, "alt", got[1].Alt)
	assert.Equal(t, "data:x", got[1].DataURL)
	assert.Equal(t, "rel/a.png", got[1].RelativePath)
}

func TestMapAISelectionItems_NilReturnsEmpty(t *testing.T) {
	assert.Empty(t, mapAISelectionItems(nil))
}