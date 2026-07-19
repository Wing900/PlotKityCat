package prompting

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildSystemPrompt_Trims(t *testing.T) {
	assert.Equal(t, "sys", BuildSystemPrompt("  sys\n"))
	assert.Equal(t, "", BuildSystemPrompt("   "))
}

func TestBuildUserPrompt_SceneOnly(t *testing.T) {
	got := BuildUserPrompt(Request{SceneName: "scene.py"})
	assert.Equal(t, "场景名：scene.py", got)
}

func TestBuildUserPrompt_TextSelectionNumbered(t *testing.T) {
	got := BuildUserPrompt(Request{SceneName: "s", Selection: []SelectionItem{
		{Kind: "text", Text: "first"},
		{Kind: "text", Text: "  second  "},
	}})
	assert.Contains(t, got, "选中的文本：")
	assert.Contains(t, got, "1. first")
	assert.Contains(t, got, "2. second")
}

func TestBuildUserPrompt_ImageSelectionUsesAltThenNameThenIndex(t *testing.T) {
	got := BuildUserPrompt(Request{SceneName: "s", Selection: []SelectionItem{
		{Kind: "image", Alt: "alt-text", RelativePath: "rel/a.png"},
		{Kind: "image", Name: "name.png", RelativePath: "rel/b.png"},
		{Kind: "image", RelativePath: "rel/c.png"},
	}})
	assert.Contains(t, got, "alt-text (rel/a.png)")
	assert.Contains(t, got, "name.png (rel/b.png)")
	assert.Contains(t, got, "图片 3 (rel/c.png)")
}

func TestBuildUserPrompt_EmptyTextSkipped(t *testing.T) {
	got := BuildUserPrompt(Request{SceneName: "s", Selection: []SelectionItem{
		{Kind: "text", Text: "   "},
		{Kind: "text", Text: "keep"},
	}})
	assert.NotContains(t, got, "1.    ")
	assert.Contains(t, got, "1. keep")
}

func TestExtractImageDataURLs_OnlyImagesWithDataURL(t *testing.T) {
	got := ExtractImageDataURLs([]SelectionItem{
		{Kind: "text", DataURL: "skip-text"},
		{Kind: "image", DataURL: "  data1  "},
		{Kind: "image", DataURL: ""},
		{Kind: "image", DataURL: "data2"},
	})
	assert.Equal(t, []string{"data1", "data2"}, got)
}