package bridge

import (
	"fmt"

	"plotkitycat/internal/workspaces"
)

func (a *App) BootstrapWorkspace() (WorkspaceSnapshot, error) {
	snapshot, err := a.workspaceSnapshot("")
	if err != nil {
		return WorkspaceSnapshot{}, err
	}

	if len(snapshot.Scripts) > 0 {
		return snapshot, nil
	}

	filename, err := a.fileStore.CreateScript("示例函数图.py")
	if err != nil {
		return WorkspaceSnapshot{}, err
	}

	return a.workspaceSnapshot(filename)
}

func (a *App) workspaceSnapshot(preferredFile string) (WorkspaceSnapshot, error) {
	scripts, err := a.fileStore.ListScripts()
	if err != nil {
		return WorkspaceSnapshot{}, err
	}

	currentFile := resolveCurrentFile(scripts, preferredFile)
	document := ScriptDocument{}
	if currentFile != "" {
		code, err := a.fileStore.ReadScript(currentFile)
		if err != nil {
			return WorkspaceSnapshot{}, err
		}
		note, err := a.fileStore.ReadNote(currentFile)
		if err != nil {
			return WorkspaceSnapshot{}, err
		}

		document = ScriptDocument{
			Filename:     currentFile,
			Code:         code,
			NoteMarkdown: note.Markdown,
			NoteImages:   mapNoteImages(note.Images),
		}
	}

	workspaceItems, err := a.workspaceManager.List()
	if err != nil {
		return WorkspaceSnapshot{}, err
	}
	currentWorkspace, err := a.workspaceManager.CurrentName()
	if err != nil {
		return WorkspaceSnapshot{}, err
	}

	snapshot := WorkspaceSnapshot{
		Scripts:          scripts,
		CurrentFile:      currentFile,
		Document:         document,
		Workspaces:       mapWorkspaces(workspaceItems),
		CurrentWorkspace: currentWorkspace,
	}

	a.emit(EventScriptsLoaded, EventPayload{
		Filename: currentFile,
		Message:  fmt.Sprintf("%d scripts loaded", len(scripts)),
	})

	return snapshot, nil
}

func (a *App) SwitchWorkspace(name string) (WorkspaceSnapshot, error) {
	if err := a.workspaceManager.Switch(name); err != nil {
		return WorkspaceSnapshot{}, err
	}

	return a.workspaceSnapshot("")
}

func (a *App) CreateWorkspace(name string) (WorkspaceSnapshot, error) {
	workspace, err := a.workspaceManager.Create(name)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}

	sceneName, err := a.fileStore.CreateScript(workspace.Name)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}

	return a.workspaceSnapshot(sceneName)
}

func (a *App) RenameWorkspace(oldName string, newName string) (WorkspaceSnapshot, error) {
	if _, err := a.workspaceManager.Rename(oldName, newName); err != nil {
		return WorkspaceSnapshot{}, err
	}

	return a.workspaceSnapshot("")
}

func (a *App) DeleteWorkspace(name string) (WorkspaceSnapshot, error) {
	if err := a.workspaceManager.Delete(name); err != nil {
		return WorkspaceSnapshot{}, err
	}

	return a.workspaceSnapshot("")
}

func resolveCurrentFile(scripts []string, preferredFile string) string {
	if len(scripts) == 0 {
		return ""
	}

	for _, script := range scripts {
		if script == preferredFile {
			return preferredFile
		}
	}

	return scripts[0]
}

func mapWorkspaces(items []workspaces.Workspace) []WorkspaceInfo {
	mapped := make([]WorkspaceInfo, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, WorkspaceInfo{
			Name:       item.Name,
			SceneCount: item.SceneCount,
		})
	}

	return mapped
}