import { ref, type Ref } from "vue";
import {
  createWorkspaceLayoutStorage,
  type WorkspaceLayoutMode,
} from "../../services/workspaceLayoutStorage";
import type { useNoteWorkspace } from "../../../notebook/model/useNoteWorkspace";

type NoteWorkspace = ReturnType<typeof useNoteWorkspace>;

export interface WorkspacePaneLayoutDeps {
  noteWorkspace: NoteWorkspace;
}

/**
 * 布局模式: code / split / note 之间的切换 + 持久化 + 同步 noteWorkspace.isPanelOpen。
 */
export function useWorkspacePaneLayout(deps: WorkspacePaneLayoutDeps) {
  const layoutStorage = createWorkspaceLayoutStorage();
  const workspaceLayoutMode = ref<WorkspaceLayoutMode>(
    layoutStorage.loadLayoutMode(deps.noteWorkspace.isPanelOpen.value ? "split" : "code"),
  );

  function setWorkspaceLayoutMode(mode: WorkspaceLayoutMode) {
    workspaceLayoutMode.value = mode;
    layoutStorage.saveLayoutMode(mode);
    deps.noteWorkspace.setPanelOpen(mode !== "code");
  }

  function toggleCodePane() {
    setWorkspaceLayoutMode(workspaceLayoutMode.value === "code" ? "split" : "code");
  }

  function toggleNotePane() {
    setWorkspaceLayoutMode(workspaceLayoutMode.value === "note" ? "split" : "note");
  }

  function showSplitPane() {
    setWorkspaceLayoutMode("split");
  }

  function toggleNotePanel() {
    setWorkspaceLayoutMode(workspaceLayoutMode.value === "code" ? "split" : "code");
  }

  return {
    workspaceLayoutMode: workspaceLayoutMode as Ref<WorkspaceLayoutMode>,
    layoutStorage,
    setWorkspaceLayoutMode,
    toggleCodePane,
    toggleNotePane,
    showSplitPane,
    toggleNotePanel,
  };
}