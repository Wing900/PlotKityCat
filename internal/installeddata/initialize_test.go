package installeddata

import (
	"encoding/binary"
	"os"
	"path/filepath"
	"testing"
	"unicode/utf16"

	"plotkitycat/internal/paths"

	"github.com/stretchr/testify/require"
)

func writeFixture(t *testing.T, path, content string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
	require.NoError(t, os.WriteFile(path, []byte(content), 0o644))
}

func installFixture(t *testing.T) (string, string) {
	t.Helper()
	base := t.TempDir()
	app := filepath.Join(base, "program")
	data := filepath.Join(base, "user-data")
	writeFixture(t, filepath.Join(app, "resources", "templates", "Scripts", "示例", "main.py"), "print('template')")
	return app, data
}

func writeImportRequest(t *testing.T, app, source string) {
	t.Helper()
	units := utf16.Encode([]rune(source))
	content := make([]byte, 2+len(units)*2)
	content[0], content[1] = 0xff, 0xfe
	for i, unit := range units {
		binary.LittleEndian.PutUint16(content[2+i*2:], unit)
	}
	require.NoError(t, os.WriteFile(filepath.Join(app, paths.LegacySourceFile), content, 0o644))
}

func TestFirstInstallSeedsTemplatesAndKeepsUserChangesOnReinstall(t *testing.T) {
	app, data := installFixture(t)
	require.NoError(t, initialize(data, app))
	require.FileExists(t, filepath.Join(data, readyFile))
	require.DirExists(t, filepath.Join(data, "config"))
	script := filepath.Join(data, "Scripts", "示例", "main.py")
	writeFixture(t, script, "print('user edit')")
	writeFixture(t, filepath.Join(app, "resources", "templates", "Scripts", "示例", "main.py"), "print('new template')")
	require.NoError(t, initialize(data, app))
	content, err := os.ReadFile(script)
	require.NoError(t, err)
	require.Equal(t, "print('user edit')", string(content))
	require.NoError(t, os.RemoveAll(filepath.Dir(script)))
	require.NoError(t, initialize(data, app))
	require.NoDirExists(t, filepath.Dir(script), "reinstall must not restore deleted workspaces")
}

func TestLegacyImportPreservesSourceAndSkipsStaleUpdateState(t *testing.T) {
	app, data := installFixture(t)
	legacy := filepath.Join(t.TempDir(), "旧版 软件 🐱")
	writeFixture(t, filepath.Join(legacy, "PlotKityCat.exe"), "legacy exe")
	writeFixture(t, filepath.Join(legacy, "Scripts", "示例", "main.py"), "print('my work')")
	writeFixture(t, filepath.Join(legacy, "Scripts", "我的工作区", "笔记", "note.md"), "我的笔记")
	writeFixture(t, filepath.Join(legacy, "config", "ai-settings.json"), `{"key":"example"}`)
	writeFixture(t, filepath.Join(legacy, "config", "updates", "state.json"), `{"old":true}`)
	writeImportRequest(t, app, legacy)
	require.NoError(t, initialize(data, app))
	for _, name := range []string{
		filepath.Join("Scripts", "示例", "main.py"),
		filepath.Join("Scripts", "我的工作区", "笔记", "note.md"),
		filepath.Join("config", "ai-settings.json"),
	} {
		original, err := os.ReadFile(filepath.Join(legacy, name))
		require.NoError(t, err, "source must remain intact")
		copied, err := os.ReadFile(filepath.Join(data, name))
		require.NoError(t, err)
		require.Equal(t, original, copied)
	}
	require.NoDirExists(t, filepath.Join(data, "config", "updates"))
	require.FileExists(t, filepath.Join(legacy, "config", "updates", "state.json"))
}

func TestFailedImportDoesNotPublishPartialDataAndCanRetry(t *testing.T) {
	app, data := installFixture(t)
	legacy := filepath.Join(t.TempDir(), "legacy")
	writeFixture(t, filepath.Join(legacy, "PlotKityCat.exe"), "legacy exe")
	writeImportRequest(t, app, legacy)
	require.Error(t, initialize(data, app), "Scripts is missing")
	require.NoDirExists(t, data)
	writeFixture(t, filepath.Join(legacy, "Scripts", "work", "main.py"), "print(1)")
	require.NoError(t, initialize(data, app))
	require.FileExists(t, filepath.Join(data, "Scripts", "work", "main.py"))
	matches, err := filepath.Glob(filepath.Join(filepath.Dir(data), ".plotkitycat-initialize-*"))
	require.NoError(t, err)
	require.Empty(t, matches, "private staging directories must be cleaned")
}

func TestExistingUnmarkedDataIsProtected(t *testing.T) {
	app, data := installFixture(t)
	protected := filepath.Join(data, "Scripts", "work", "main.py")
	writeFixture(t, protected, "valuable work")
	require.ErrorContains(t, initialize(data, app), "already exists")
	content, err := os.ReadFile(protected)
	require.NoError(t, err)
	require.Equal(t, "valuable work", string(content))
	require.NoFileExists(t, filepath.Join(data, readyFile))
}

func TestMalformedImportRequestDoesNotCreateUserData(t *testing.T) {
	app, data := installFixture(t)
	writeFixture(t, filepath.Join(app, paths.LegacySourceFile), "invalid encoding")
	require.ErrorContains(t, initialize(data, app), "encoding")
	require.NoDirExists(t, data)
}
