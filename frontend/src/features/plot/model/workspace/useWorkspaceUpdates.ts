import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { AppUpdateStatus } from "../../../ai/services/aiTypes";
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateStatus,
  installUpdateAndRestart,
} from "../../../updates/services/updateBridgeCompat";
import { getErrorMessage } from "../../../../lib/errors";
import { normalizeUpdateStatus } from "./updateStatusHelpers";

export interface WorkspaceUpdatesDeps {
  beforeInstall?: () => Promise<void>;
  openRunErrorDialog: (message: string, options?: { repairable?: boolean }) => void;
}

export function useWorkspaceUpdates(deps: WorkspaceUpdatesDeps) {
  const updateStatus = ref<AppUpdateStatus>(normalizeUpdateStatus({}));
  const isCheckingUpdates = ref(false);
  const isDownloadingUpdate = ref(false);
  const isInstallingUpdate = ref(false);
  const isUpdateInstallDialogOpen = ref(false);
  const hasCheckedUpdatesThisSession = ref(false);
  const isUpdatePending: ComputedRef<boolean> = computed(
    () => isCheckingUpdates.value || isDownloadingUpdate.value || isInstallingUpdate.value,
  );

  async function refreshUpdateStatus() {
    try {
      const nextStatus = await getUpdateStatus();
      updateStatus.value = normalizeUpdateStatus(nextStatus, {
        hasCheckedThisSession: hasCheckedUpdatesThisSession.value,
      });
    } catch (error) {
      updateStatus.value = {
        ...updateStatus.value,
        message: getErrorMessage(error),
      };
    }
  }

  async function checkUpdates(force: boolean, quiet = false) {
    if (isCheckingUpdates.value || isDownloadingUpdate.value || isInstallingUpdate.value) {
      return;
    }

    isCheckingUpdates.value = true;
    try {
      hasCheckedUpdatesThisSession.value = true;
      updateStatus.value = normalizeUpdateStatus(await checkForUpdates(force), {
        hasCheckedThisSession: hasCheckedUpdatesThisSession.value,
      });
    } catch (error) {
      hasCheckedUpdatesThisSession.value = false;
      if (!quiet) {
        deps.openRunErrorDialog(getErrorMessage(error));
      }
    } finally {
      isCheckingUpdates.value = false;
    }
  }

  async function handleUpdateAction() {
    if (updateStatus.value.actionKind === "install") {
      isUpdateInstallDialogOpen.value = true;
      return;
    }

    if (
      updateStatus.value.actionKind === "check" ||
      updateStatus.value.actionKind === "latest"
    ) {
      await checkUpdates(true);
      return;
    }

    if (isDownloadingUpdate.value || isInstallingUpdate.value) {
      return;
    }

    isDownloadingUpdate.value = true;
    try {
      updateStatus.value = normalizeUpdateStatus(await downloadUpdate());
      if (updateStatus.value.readyToInstall) {
        isUpdateInstallDialogOpen.value = true;
      }
    } catch (error) {
      deps.openRunErrorDialog(getErrorMessage(error));
    } finally {
      isDownloadingUpdate.value = false;
    }
  }

  function closeUpdateInstallDialog() {
    if (isInstallingUpdate.value) {
      return;
    }
    isUpdateInstallDialogOpen.value = false;
  }

  async function installPreparedUpdate() {
    if (isInstallingUpdate.value) {
      return;
    }
    isInstallingUpdate.value = true;
    try {
      await deps.beforeInstall?.();
      await installUpdateAndRestart();
    } catch (error) {
      isInstallingUpdate.value = false;
      isUpdateInstallDialogOpen.value = false;
      await refreshUpdateStatus();
      deps.openRunErrorDialog(getErrorMessage(error));
    }
  }

  function resetUpdateButtonState() {
    hasCheckedUpdatesThisSession.value = false;
    updateStatus.value = normalizeUpdateStatus({
      currentVersion: updateStatus.value.currentVersion,
    });
  }

  return {
    updateStatus: updateStatus as Ref<AppUpdateStatus>,
    isCheckingUpdates,
    isDownloadingUpdate,
    isInstallingUpdate,
    isUpdateInstallDialogOpen,
    hasCheckedUpdatesThisSession,
    isUpdatePending,
    refreshUpdateStatus,
    checkUpdates,
    handleUpdateAction,
    closeUpdateInstallDialog,
    installPreparedUpdate,
    resetUpdateButtonState,
  };
}
