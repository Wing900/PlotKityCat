package bridge

import (
	"fmt"
	"os"
)

func (a *App) GetScriptList() ([]string, error) {
	scripts, err := a.fileStore.ListScripts()
	if err == nil {
		a.emit(EventScriptsLoaded, EventPayload{
			Message: fmt.Sprintf("%d scripts loaded", len(scripts)),
		})
	}

	return scripts, err
}

func (a *App) GetScriptContent(filename string) (ScriptDocument, error) {
	code, err := a.fileStore.ReadScript(filename)
	if err != nil {
		return ScriptDocument{}, err
	}
	note, err := a.fileStore.ReadNote(filename)
	if err != nil {
		return ScriptDocument{}, err
	}

	return ScriptDocument{
		Filename:     filename,
		Code:         code,
		NoteMarkdown: note.Markdown,
		NoteImages:   mapNoteImages(note.Images),
	}, nil
}

func (a *App) CreateScript(filename string) (ScriptDocument, error) {
	createdName, err := a.fileStore.CreateScript(filename)
	if err != nil {
		return ScriptDocument{}, err
	}

	code, err := a.fileStore.ReadScript(createdName)
	if err != nil {
		return ScriptDocument{}, err
	}
	note, err := a.fileStore.ReadNote(createdName)
	if err != nil {
		return ScriptDocument{}, err
	}

	return ScriptDocument{
		Filename:     createdName,
		Code:         code,
		NoteMarkdown: note.Markdown,
		NoteImages:   mapNoteImages(note.Images),
	}, nil
}

func (a *App) RefreshWorkspace(currentFile string) (WorkspaceSnapshot, error) {
	return a.workspaceSnapshot(currentFile)
}

func (a *App) ReorderScripts(scripts []string, currentFile string) (WorkspaceSnapshot, error) {
	if err := a.fileStore.ReorderScripts(scripts); err != nil {
		return WorkspaceSnapshot{}, err
	}

	return a.workspaceSnapshot(currentFile)
}

func (a *App) RenameScript(oldFilename string, newFilename string) (WorkspaceSnapshot, error) {
	renamedName, err := a.fileStore.RenameScript(oldFilename, newFilename)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}

	return a.workspaceSnapshot(renamedName)
}

func (a *App) DeleteScript(filename string) (WorkspaceSnapshot, error) {
	if err := a.fileStore.DeleteScript(filename); err != nil {
		if os.IsNotExist(err) {
			return a.workspaceSnapshot("")
		}
		return WorkspaceSnapshot{}, err
	}

	return a.workspaceSnapshot("")
}

func (a *App) SaveScript(filename string, code string) error {
	savedName, err := a.fileStore.SaveScript(filename, code)
	if err != nil {
		return err
	}

	a.emit(EventScriptSaved, EventPayload{
		Filename: savedName,
		Message:  "script saved",
	})

	return nil
}