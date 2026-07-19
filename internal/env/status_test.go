package env

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMapCheckStatus(t *testing.T) {
	assert.Equal(t, "ok", mapCheckStatus(true))
	assert.Equal(t, "missing", mapCheckStatus(false))
}

func TestMapFileMessage(t *testing.T) {
	assert.Equal(t, "已找到", mapFileMessage(true))
	assert.Equal(t, "缺失", mapFileMessage(false))
}

func TestMapImportMessage(t *testing.T) {
	assert.Equal(t, "导入成功", mapImportMessage(true))
	assert.Equal(t, "导入失败", mapImportMessage(false))
}

func TestBuildImportCheckScript_EmptyRequirements(t *testing.T) {
	script := buildImportCheckScript(nil)
	assert.Contains(t, script, "import importlib")
}

func TestBuildImportCheckScript_IncludesImportNames(t *testing.T) {
	reqs := DefaultRequirements()
	script := buildImportCheckScript(reqs)
	assert.Contains(t, script, "importlib.import_module('numpy')")
	assert.Contains(t, script, "importlib.import_module('matplotlib')")
}

func TestBuildImportCheckScript_SkipsEmptyImportName(t *testing.T) {
	reqs := []Requirement{{Key: "python", ImportName: ""}}
	script := buildImportCheckScript(reqs)
	// python 没指定 ImportName, 不应生成 import_module
	assert.NotContains(t, script, "importlib.import_module(\"\")")
}

func TestDefaultRequirements_HasCoreLibs(t *testing.T) {
	keys := []string{}
	for _, r := range DefaultRequirements() {
		keys = append(keys, r.Key)
	}
	assert.Contains(t, keys, "python")
	assert.Contains(t, keys, "numpy")
	assert.Contains(t, keys, "matplotlib")
	assert.Contains(t, keys, "scipy")
	assert.Contains(t, keys, "pyqt5")
}

func TestReportProgress_NilCallbackNoPanic(t *testing.T) {
	assert.NotPanics(t, func() { reportProgress(nil, Progress{Stage: "x", Percent: 50}) })
}

func TestReportProgress_CallsCallback(t *testing.T) {
	called := false
	reportProgress(func(p Progress) { called = true; assert.Equal(t, 75, p.Percent) }, Progress{Percent: 75})
	assert.True(t, called)
}