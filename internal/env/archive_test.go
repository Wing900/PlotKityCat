package env

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRetryRename_SucceedsImmediately(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "a.txt")
	dst := filepath.Join(dir, "b.txt")
	require.NoError(t, os.WriteFile(src, []byte("x"), 0o644))

	err := retryRename(src, dst, 3, 1*time.Millisecond)
	require.NoError(t, err)
	assert.NoFileExists(t, src)
	_, err = os.Stat(dst)
	assert.NoError(t, err)
}

func TestRetryRename_ExhaustsAttemptsOnMissingSource(t *testing.T) {
	dir := t.TempDir()
	missing := filepath.Join(dir, "nope.txt")
	dst := filepath.Join(dir, "dst.txt")
	err := retryRename(missing, dst, 2, 1*time.Millisecond)
	assert.Error(t, err)
}

func TestCopyFile_PreservesContent(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "a.txt")
	dst := filepath.Join(dir, "b.txt")
	require.NoError(t, os.WriteFile(src, []byte("hello world"), 0o644))

	require.NoError(t, copyFile(src, dst, 0o600))
	content, err := os.ReadFile(dst)
	require.NoError(t, err)
	assert.Equal(t, "hello world", string(content))
}

func TestCopyFile_MissingSourceErrors(t *testing.T) {
	dir := t.TempDir()
	assert.Error(t, copyFile(filepath.Join(dir, "nope"), filepath.Join(dir, "dst"), 0o644))
}

func TestCopyDirContents_CopiesAllFiles(t *testing.T) {
	srcDir := t.TempDir()
	dstDir := filepath.Join(t.TempDir(), "dst")
	require.NoError(t, os.MkdirAll(dstDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(srcDir, "f1.txt"), []byte("1"), 0o644))
	require.NoError(t, os.MkdirAll(filepath.Join(srcDir, "sub"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(srcDir, "sub", "f2.txt"), []byte("2"), 0o644))

	require.NoError(t, copyDirContents(srcDir, dstDir))
	assert.FileExists(t, filepath.Join(dstDir, "f1.txt"))
	assert.FileExists(t, filepath.Join(dstDir, "sub", "f2.txt"))
}