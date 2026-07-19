package scriptsafety

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAnalyze_CleanCodeNoViolations(t *testing.T) {
	assert.Empty(t, Analyze("print('hello')\nx = 1\n"))
}

func TestAnalyze_SkipsBlankAndCommentLines(t *testing.T) {
	// 注释行即使含危险关键字也不报
	assert.Empty(t, Analyze("# import os\n\n   # os.system('rm')\n"))
}

func TestAnalyze_DetectsImportOS(t *testing.T) {
	v := Analyze("import os\nfrom os import path\n")
	assert.Len(t, v, 2)
	assert.Equal(t, "import.os", v[0].RuleID)
	assert.Equal(t, 1, v[0].Line)
	assert.Equal(t, 2, v[1].Line)
}

func TestAnalyze_DetectsImportSubprocess(t *testing.T) {
	v := Analyze("import subprocess\n")
	assert.Len(t, v, 1)
	assert.Equal(t, "import.subprocess", v[0].RuleID)
}

func TestAnalyze_DetectsOSSystemCall(t *testing.T) {
	v := Analyze("os.system('rm -rf /')\n")
	assert.Len(t, v, 1)
	assert.Equal(t, "call.os.system", v[0].RuleID)
}

func TestAnalyze_DetectsDynamicExec(t *testing.T) {
	v := Analyze("exec('code')\n__import__('x')\n")
	// 2 行, 每行 1 个 violation (exec / __import__)
	ruleIDs := []string{v[0].RuleID, v[1].RuleID}
	assert.Contains(t, ruleIDs, "call.dynamic")
}

func TestAnalyze_DedupesSameRuleSameLine(t *testing.T) {
	// 同一行多次匹配同规则只报一次
	v := Analyze("eval(1) + eval(2)\n")
	assert.Len(t, v, 1)
}

func TestAnalyze_SortsByLineThenRule(t *testing.T) {
	v := Analyze("os.system('x')\nimport os\n")
	assert.Equal(t, 1, v[0].Line)
	assert.Equal(t, 2, v[1].Line)
}

func TestValidate_NoViolationsReturnsNil(t *testing.T) {
	assert.NoError(t, Validate("print('safe')\n"))
}

func TestValidate_WithViolationsReturnsError(t *testing.T) {
	err := Validate("import os\n")
	require.Error(t, err)
	ve, ok := err.(*ValidationError)
	require.True(t, ok)
	assert.Len(t, ve.Violations, 1)
}

func TestValidationError_ErrorString(t *testing.T) {
	err := Validate("import os\nos.system('x')\n")
	require.Error(t, err)
	msg := err.Error()
	assert.Contains(t, msg, "已拦截危险 Python 代码")
	assert.Contains(t, msg, "不允许导入 os 模块")
	assert.Contains(t, msg, "不允许调用 os.system")
}

func TestValidateFile_ReadsAndValidates(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "scene.py")
	require.NoError(t, os.WriteFile(path, []byte("import os\n"), 0o644))
	err := ValidateFile(path)
	assert.Error(t, err)
}

func TestValidateFile_MissingFileErrors(t *testing.T) {
	assert.Error(t, ValidateFile("/nope/missing.py"))
}