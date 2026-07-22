import { ref, watch, type Ref } from "vue";
import { createScriptRepository } from "../services/scriptRepository";
import { createScriptSelectionStorage } from "../services/scriptSelectionStorage";
import type {
  ScriptWorkspaceRepository,
  WorkspaceInfoLike,
  WorkspaceSnapshotLike,
} from "./scriptWorkspaceTypes";
import { useScriptAutoSync } from "./useScriptAutoSync";
import { useScriptFileActions } from "./useScriptFileActions";
import { useWorkspaceActions } from "./useWorkspaceActions";
import {
  asString,
  computedPhase,
  getErrorMessage,
  withTimeout,
  type ErrorHandler,
  type WorkspacePhase,
} from "./scriptWorkspaceUtils";

export function useScriptWorkspaceMachine(
  onError: ErrorHandler,
  isRunning: Ref<boolean>,
  isSyncPaused?: Ref<boolean>,
  dependencies?: {
    repository?: ScriptWorkspaceRepository;
    selectionStorage?: {
      load: () => string;
      save: (filename: string) => void;
    };
  },
) {
  const repository = dependencies?.repository ?? createScriptRepository() as ScriptWorkspaceRepository;
  const selectionStorage = dependencies?.selectionStorage ?? createScriptSelectionStorage();
  const scripts = ref<string[]>([]);
  const workspaces = ref<WorkspaceInfoLike[]>([]);
  const currentWorkspace = ref("");
  const currentFile = ref("");
  const codeContent = ref("");
  const lastLoadedCode = ref("");
  const workspacePhase = ref<WorkspacePhase>("idle");

  const isCreatingScript = computedPhase("creating", workspacePhase);
  const isRenamingScript = computedPhase("renaming", workspacePhase);
  const isDeletingScript = computedPhase("deleting", workspacePhase);

  function applyWorkspaceSnapshot(
    snapshot?: WorkspaceSnapshotLike,
    options?: { preserveDirtyCurrent?: boolean; preservePreviousOnEmptySnapshot?: boolean },
  ) {
    const snapshotScripts = snapshot?.scripts ?? [];
    const snapshotCurrentFile = snapshot?.currentFile ?? snapshot?.document?.filename ?? "";
    if (
      options?.preservePreviousOnEmptySnapshot &&
      currentFile.value !== "" &&
      snapshotScripts.length === 0 &&
      snapshotCurrentFile === ""
    ) {
      return;
    }

    const nextCurrentFile = snapshot?.currentFile ?? snapshot?.document?.filename ?? "";
    const nextCode = asString(snapshot?.document?.code);
    const preserveCurrentCode =
      options?.preserveDirtyCurrent &&
      nextCurrentFile !== "" &&
      nextCurrentFile === currentFile.value &&
      codeContent.value !== lastLoadedCode.value;

    scripts.value = snapshot?.scripts ?? [];
    workspaces.value = snapshot?.workspaces ?? [];
    currentWorkspace.value = snapshot?.currentWorkspace ?? currentWorkspace.value;
    currentFile.value = nextCurrentFile;
    if (!preserveCurrentCode) {
      codeContent.value = nextCode;
      lastLoadedCode.value = nextCode;
    }
  }

  async function syncWorkspace(
    preferredFile = currentFile.value,
    options?: { preserveDirtyCurrent?: boolean },
  ) {
    if (isSyncPaused?.value) {
      return undefined;
    }

    const previousPhase = workspacePhase.value;
    if (previousPhase === "idle") {
      workspacePhase.value = "syncing";
    }

    try {
      const snapshot = await withTimeout(
        repository.refreshWorkspace(preferredFile),
        "同步文件列表超时",
      );
      applyWorkspaceSnapshot(snapshot, {
        preserveDirtyCurrent: options?.preserveDirtyCurrent ?? true,
        preservePreviousOnEmptySnapshot: preferredFile !== "",
      });
      return snapshot;
    } finally {
      if (workspacePhase.value === "syncing") {
        workspacePhase.value = previousPhase === "idle" ? "idle" : previousPhase;
      }
    }
  }

  useScriptAutoSync({
    codeContent,
    currentFile,
    isSyncPaused,
    lastLoadedCode,
    onAutoSaveError: (error) => onError(getErrorMessage(error)),
    repository,
    syncWorkspace,
    workspacePhase,
  });

  const scriptFileActions = useScriptFileActions({
    applyWorkspaceSnapshot,
    codeContent,
    currentFile,
    isRunning,
    lastLoadedCode,
    onError,
    repository,
    selectionStorage,
    syncWorkspace,
    workspacePhase,
  });

  const workspaceActions = useWorkspaceActions({
    applyWorkspaceSnapshot,
    currentWorkspace,
    onError,
    repository,
    saveCurrentScript: scriptFileActions.saveCurrentScript,
    workspacePhase,
  });

  watch(currentFile, (filename) => {
    selectionStorage.save(filename);
  });

  return {
    applyWorkspaceSnapshot,
    closeCreateDialog: scriptFileActions.closeCreateDialog,
    codeContent,
    createWorkspace: workspaceActions.createWorkspace,
    createScript: scriptFileActions.createScript,
    currentFile,
    currentWorkspace,
    deleteScript: scriptFileActions.deleteScript,
    deleteWorkspace: workspaceActions.deleteWorkspace,
    deletingScriptName: scriptFileActions.deletingScriptName,
    isCreateDialogOpen: scriptFileActions.isCreateDialogOpen,
    isCreatingScript,
    isDeletingScript,
    isRenamingScript,
    openCreateDialog: scriptFileActions.openCreateDialog,
    reorderScripts: scriptFileActions.reorderScripts,
    renameScript: scriptFileActions.renameScript,
    renameWorkspace: workspaceActions.renameWorkspace,
    restoreLastSelection: scriptFileActions.restoreLastSelection,
    runCurrentScript: scriptFileActions.runCurrentScript,
    saveCurrentScript: scriptFileActions.saveCurrentScript,
    scripts,
    selectScript: scriptFileActions.selectScript,
    startCurrentRun: scriptFileActions.startCurrentRun,
    switchWorkspace: workspaceActions.switchWorkspace,
    syncWorkspace,
    typingScriptName: scriptFileActions.typingScriptName,
    updateCode: scriptFileActions.updateCode,
    workspaces,
    workspacePhase,
  };
}
