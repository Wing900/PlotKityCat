import type { useScriptWorkspaceMachine } from "../../../scripts/model/useScriptWorkspaceMachine";
import type { useNoteWorkspace } from "../../../notebook/model/useNoteWorkspace";

type ScriptWorkspace = ReturnType<typeof useScriptWorkspaceMachine>;
type NoteWorkspace = ReturnType<typeof useNoteWorkspace>;

export interface WorkspaceScriptOpsDeps {
  scriptWorkspace: ScriptWorkspace;
  noteWorkspace: NoteWorkspace;
}

/**
 * 脚本 + 工作空间 CRUD: 每个写操作前先 flushPendingSave, 保证笔记落盘后再切换。
 */
export function useWorkspaceScriptOps(deps: WorkspaceScriptOpsDeps) {
  const { scriptWorkspace, noteWorkspace } = deps;

  async function createScript(name: string) {
    await scriptWorkspace.createScript(name);
  }

  async function renameScript(oldName: string, newName: string) {
    await scriptWorkspace.renameScript(oldName, newName);
  }

  async function deleteScript(name: string) {
    await scriptWorkspace.deleteScript(name);
  }

  async function switchWorkspace(name: string) {
    await noteWorkspace.flushPendingSave(scriptWorkspace.currentFile.value);
    await scriptWorkspace.switchWorkspace(name);
  }

  async function createWorkspace(name: string) {
    await noteWorkspace.flushPendingSave(scriptWorkspace.currentFile.value);
    await scriptWorkspace.createWorkspace(name);
  }

  async function renameWorkspace(oldName: string, newName: string) {
    await noteWorkspace.flushPendingSave(scriptWorkspace.currentFile.value);
    await scriptWorkspace.renameWorkspace(oldName, newName);
  }

  async function deleteWorkspace(name: string) {
    await noteWorkspace.flushPendingSave(scriptWorkspace.currentFile.value);
    await scriptWorkspace.deleteWorkspace(name);
  }

  async function selectScript(name: string) {
    await scriptWorkspace.selectScript(name);
  }

  return {
    createScript,
    renameScript,
    deleteScript,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    selectScript,
  };
}