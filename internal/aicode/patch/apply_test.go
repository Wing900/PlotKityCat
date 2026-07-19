package patch

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseRepairPatch_ValidBlocks(t *testing.T) {
	patchText := ">>>Acode\nold line\n<<<Acode\n>>>Bcode\nnew line\n<<<Bcode"
	blocks, err := ParseRepairPatch(patchText)
	require.NoError(t, err)
	require.Len(t, blocks, 1)
	assert.Equal(t, "old line", blocks[0].Before)
	assert.Equal(t, "new line", blocks[0].After)
}

func TestParseRepairPatch_NoBlocksErrors(t *testing.T) {
	_, err := ParseRepairPatch("just text, no markers")
	assert.ErrorContains(t, err, "没有返回有效补丁")
}

func TestParseRepairPatch_ExtraContentErrors(t *testing.T) {
	patchText := "random text\n>>>Acode\nold\n<<<Acode\n>>>Bcode\nnew\n<<<Bcode\nmore random"
	_, err := ParseRepairPatch(patchText)
	assert.ErrorContains(t, err, "无法识别的内容")
}

func TestParseRepairPatch_MultipleBlocks(t *testing.T) {
	patchText := ">>>Acode\na\n<<<Acode\n>>>Bcode\nA\n<<<Bcode\n>>>Acode\nb\n<<<Acode\n>>>Bcode\nB\n<<<Bcode"
	blocks, err := ParseRepairPatch(patchText)
	require.NoError(t, err)
	assert.Len(t, blocks, 2)
}

func TestApplyRepairPatch_ReplacesBeforeWithAfter(t *testing.T) {
	current := "line1\nold\nline3"
	patchText := ">>>Acode\nold\n<<<Acode\n>>>Bcode\nnew\n<<<Bcode"
	res, err := ApplyRepairPatch(current, patchText)
	require.NoError(t, err)
	assert.Equal(t, "line1\nnew\nline3", res.Code)
	require.Len(t, res.ChangedRanges, 1)
}

func TestApplyRepairPatch_MissingBeforeErrors(t *testing.T) {
	current := "line1\nline3"
	patchText := ">>>Acode\nold\n<<<Acode\n>>>Bcode\nnew\n<<<Bcode"
	_, err := ApplyRepairPatch(current, patchText)
	assert.ErrorContains(t, err, "未能定位")
}

func TestApplyRepairPatch_DuplicateBeforeErrors(t *testing.T) {
	current := "dup\ndup\n"
	patchText := ">>>Acode\ndup\n<<<Acode\n>>>Bcode\nx\n<<<Bcode"
	_, err := ApplyRepairPatch(current, patchText)
	assert.ErrorContains(t, err, "匹配到多处")
}

func TestApplyRepairPatch_OverlappingBlocksErrors(t *testing.T) {
	current := "overlap\nrest"
	patchText := ">>>Acode\nover\n<<<Acode\n>>>Bcode\nX\n<<<Bcode\n>>>Acode\nerlap\n<<<Acode\n>>>Bcode\nY\n<<<Bcode"
	_, err := ApplyRepairPatch(current, patchText)
	assert.ErrorContains(t, err, "重叠")
}

func TestApplyRepairPatch_EmptyResultErrors(t *testing.T) {
	// Before 占满全文, After 空 -> 替换后全空
	current := "x"
	patchText := ">>>Acode\nx\n<<<Acode\n>>>Bcode\n\n<<<Bcode"
	_, err := ApplyRepairPatch(current, patchText)
	assert.ErrorContains(t, err, "为空")
}

func TestApplyGeneratedCode_PrependsToCurrent(t *testing.T) {
	res := ApplyGeneratedCode("line1\nline2", "new code")
	assert.Equal(t, "line1\nline2\n\n\nnew code", res.Code)
	require.Len(t, res.ChangedRanges, 1)
}

func TestApplyGeneratedCode_EmptyCurrentNoPrefix(t *testing.T) {
	res := ApplyGeneratedCode("", "new code")
	assert.Equal(t, "new code", res.Code)
}

func TestApplyGeneratedCode_EmptyGeneratedKeepsCurrent(t *testing.T) {
	res := ApplyGeneratedCode("keep me", "  ")
	assert.Equal(t, "keep me", res.Code)
	assert.Empty(t, res.ChangedRanges)
}

func TestNormalizeNewlines(t *testing.T) {
	assert.Equal(t, "a\nb\n", normalizeNewlines("a\r\nb\r\n"))
}

func TestBuildGenerationPrefix(t *testing.T) {
	assert.Equal(t, "", buildGenerationPrefix(""))
	assert.Equal(t, "x\n\n\n", buildGenerationPrefix("x"))
	assert.Equal(t, "x\n\n\n", buildGenerationPrefix("x\n\n"))
}