package paths

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileExists_TrueForReal_FalseForMissing(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "f.txt")
	require.NoError(t, os.WriteFile(p, []byte("x"), 0o644))

	assert.True(t, fileExists(p))
	assert.False(t, fileExists(filepath.Join(dir, "nope.txt")))
	assert.False(t, fileExists("")) // 空路径
}

func TestIsProjectRoot_DetectsGoModAndWailsJson(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "go.mod"), []byte("module x"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "wails.json"), []byte("{}"), 0o644))
	assert.True(t, isProjectRoot(dir))
}

func TestIsProjectRoot_MissingEitherReturnsFalse(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "go.mod"), []byte("module x"), 0o644))
	// 没有 wails.json
	assert.False(t, isProjectRoot(dir))
}

func TestIsRuntimeRoot_DetectsRuntimeDir(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "resources", "runtime"), 0o755))
	assert.True(t, isRuntimeRoot(dir))
}

func TestIsRuntimeRoot_DetectsRuntimeVersionJson(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "runtime.version.json"), []byte("{}"), 0o644))
	assert.True(t, isRuntimeRoot(dir))
}

func TestIsRuntimeRoot_PlainDirReturnsFalse(t *testing.T) {
	dir := t.TempDir()
	assert.False(t, isRuntimeRoot(dir))
}