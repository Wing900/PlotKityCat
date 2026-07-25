import type { Ref } from "vue";
import { ONBOARDING_WORKSPACE_NAME } from "../../onboarding/onboardingTemplate";
import type {
  WorkspaceInfoLike,
  WorkspaceSnapshotLike,
} from "./scriptWorkspaceTypes";
import {
  getErrorMessage,
  withTimeout,
  type ErrorHandler,
  type WorkspacePhase,
} from "./scriptWorkspaceUtils";

type WorkspaceActionsRepository = {
  createWorkspace: (name: string) => Promise<WorkspaceSnapshotLike>;
  deleteWorkspace: (name: string) => Promise<WorkspaceSnapshotLike>;
  renameWorkspace: (oldName: string, newName: string) => Promise<WorkspaceSnapshotLike>;
  switchWorkspace: (name: string) => Promise<WorkspaceSnapshotLike>;
};

type WorkspaceActionsOptions = {
  applyWorkspaceSnapshot: (
    snapshot?: WorkspaceSnapshotLike,
    options?: { preserveDirtyCurrent?: boolean; preservePreviousOnEmptySnapshot?: boolean },
  ) => void;
  currentWorkspace: Ref<string>;
  onError: ErrorHandler;
  repository: WorkspaceActionsRepository;
  saveCurrentScript: () => Promise<void>;
  workspaces: Ref<WorkspaceInfoLike[]>;
  workspacePhase: Ref<WorkspacePhase>;
};

export function useWorkspaceActions(options: WorkspaceActionsOptions) {
  async function switchWorkspace(name: string) {
    const targetName = name.trim();
    if (
      !targetName ||
      targetName === options.currentWorkspace.value ||
      options.workspacePhase.value !== "idle"
    ) {
      return;
    }

    options.workspacePhase.value = "syncing";

    try {
      await options.saveCurrentScript();
      const snapshot = await withTimeout(
        options.repository.switchWorkspace(targetName),
        "切换工作区超时",
      );
      options.applyWorkspaceSnapshot(snapshot, { preserveDirtyCurrent: false });
    } catch (error) {
      options.onError(getErrorMessage(error));
    } finally {
      options.workspacePhase.value = "idle";
    }
  }

  async function createWorkspace(name: string) {
    const targetName = name.trim();
    if (!targetName || options.workspacePhase.value !== "idle") {
      return;
    }

    options.workspacePhase.value = "creating";

    try {
      await options.saveCurrentScript();
      const snapshot = await withTimeout(
        options.repository.createWorkspace(targetName),
        "创建工作区超时",
      );
      options.applyWorkspaceSnapshot(snapshot, { preserveDirtyCurrent: false });
    } catch (error) {
      options.onError(getErrorMessage(error));
    } finally {
      options.workspacePhase.value = "idle";
    }
  }

  async function renameWorkspace(oldName: string, newName: string) {
    const targetName = newName.trim();
    if (!oldName || !targetName || options.workspacePhase.value !== "idle") {
      return;
    }

    options.workspacePhase.value = "renaming";

    try {
      await options.saveCurrentScript();
      const snapshot = await withTimeout(
        options.repository.renameWorkspace(oldName, targetName),
        "重命名工作区超时",
      );
      options.applyWorkspaceSnapshot(snapshot, { preserveDirtyCurrent: false });
    } catch (error) {
      options.onError(getErrorMessage(error));
    } finally {
      options.workspacePhase.value = "idle";
    }
  }

  async function deleteWorkspace(name: string) {
    if (!name || options.workspacePhase.value !== "idle") {
      return;
    }

    options.workspacePhase.value = "deleting";

    try {
      const snapshot = await withTimeout(
        options.repository.deleteWorkspace(name),
        "删除工作区超时",
      );
      options.applyWorkspaceSnapshot(snapshot, { preserveDirtyCurrent: false });
    } catch (error) {
      options.onError(getErrorMessage(error));
    } finally {
      options.workspacePhase.value = "idle";
    }
  }

  // 新手引导是 Scripts/ 下随应用发布的标准工作区，此处只执行通用切换。
  async function enterOnboardingWorkspace() {
    const templateExists = options.workspaces.value.some(
      (workspace) => workspace.name === ONBOARDING_WORKSPACE_NAME,
    );
    if (!templateExists || options.workspacePhase.value !== "idle") {
      return false;
    }

    options.workspacePhase.value = "syncing";

    try {
      await options.saveCurrentScript();
      const snapshot = await withTimeout(
        options.repository.switchWorkspace(ONBOARDING_WORKSPACE_NAME),
        "进入新手引导工作区超时",
      );
      options.applyWorkspaceSnapshot(snapshot, { preserveDirtyCurrent: false });
      return true;
    } catch (error) {
      console.warn("[onboarding] 切换教程工作区失败", error);
      return false;
    } finally {
      options.workspacePhase.value = "idle";
    }
  }

  return {
    createWorkspace,
    deleteWorkspace,
    enterOnboardingWorkspace,
    renameWorkspace,
    switchWorkspace,
  };
}
