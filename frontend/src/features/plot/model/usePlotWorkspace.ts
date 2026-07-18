import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  GetSubscriptionStatus,
  OpenSubscriptionPurchase,
} from "../../../../wailsjs/go/bridge/App";
import {
  createDefaultAISettings,
  getAISettings,
  saveAISettings,
} from "../../ai/services/aiSettingsBridgeCompat";
import type {
  AppUpdateStatus,
  AIProviderSettings,
  AISubscriptionStatus,
  ChangedLineRange,
} from "../../ai/services/aiTypes";
import { useRunErrorDialog } from "../../errors/model/useRunErrorDialog";
import { useDesignCardWorkspace } from "../../designCard/model/useDesignCardWorkspace";
import type { DesignCard } from "../../designCard/services/designCardTypes";
import { useNoteWorkspace } from "../../notebook/model/useNoteWorkspace";
import { createRuntimeRepository } from "../../runtime/services/runtimeRepository";
import { useRuntimeState } from "../../runtime/model/useRuntimeState";
import { useScreeningWorkspace } from "../../screening/model/useScreeningWorkspace";
import { createScriptRepository } from "../../scripts/services/scriptRepository";
import { asString } from "../../scripts/model/scriptWorkspaceUtils";
import { useScriptWorkspaceMachine } from "../../scripts/model/useScriptWorkspaceMachine";
import { useWorkspacePackageTransfer } from "../../scripts/model/useWorkspacePackageTransfer";
import { getErrorMessage } from "../../../lib/errors";
import { useAIActivityStatus } from "./useAIActivityStatus";
import { usePlotAIWorkflow } from "./usePlotAIWorkflow";
import { usePackageTransfer } from "./usePackageTransfer";
import { usePkcDropImport } from "./usePkcDropImport";
import { useWorkspaceLifecycle } from "./useWorkspaceLifecycle";
import {
  createWorkspaceLayoutStorage,
  type WorkspaceLayoutMode,
} from "../services/workspaceLayoutStorage";
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateStatus,
  installUpdateAndRestart,
  type UpdateStatusLike,
} from "../../updates/services/updateBridgeCompat";

export function usePlotWorkspace() {
  const layoutStorage = createWorkspaceLayoutStorage();
  const isRunning = ref(false);
  const repairAnimatedLineRanges = ref<ChangedLineRange[]>([]);
  const repairAnimationKey = ref(0);
  const isAISettingsDialogOpen = ref(false);
  const aiSettings = ref<AIProviderSettings>(createDefaultAISettings());
  const subscriptionStatus = ref<AISubscriptionStatus>({
    status: "unconfigured",
    activated: false,
    deviceId: "",
    expireAt: "",
    lastCheckedAt: "",
    message: "订阅服务未配置",
    model: "",
    baseUrl: "",
  });
  const isSettingsDialogOpen = ref(false);
  const updateStatus = ref<AppUpdateStatus>(normalizeUpdateStatus({}));
  const isCheckingUpdates = ref(false);
  const isDownloadingUpdate = ref(false);
  const isInstallingUpdate = ref(false);
  const isUpdateInstallDialogOpen = ref(false);
  const hasCheckedUpdatesThisSession = ref(false);
  const isUpdatePending = computed(
    () => isCheckingUpdates.value || isDownloadingUpdate.value || isInstallingUpdate.value,
  );
  const runtime = useRuntimeState();
  const runtimeRepository = createRuntimeRepository();
  const scriptRepository = createScriptRepository();
  const runErrorDialog = useRunErrorDialog();
  const aiActivity = useAIActivityStatus();
  const scriptWorkspace = useScriptWorkspaceMachine(
    runErrorDialog.openRunErrorDialog,
    isRunning,
    aiActivity.isAIGenerating,
  );
  const screeningWorkspace = useScreeningWorkspace({
    currentFile: scriptWorkspace.currentFile,
    onError: runErrorDialog.openRunErrorDialog,
    scripts: scriptWorkspace.scripts,
  });
  const workspacePackageTransfer = useWorkspacePackageTransfer({
    applyWorkspaceSnapshot: scriptWorkspace.applyWorkspaceSnapshot,
    currentWorkspace: scriptWorkspace.currentWorkspace,
    onError: runErrorDialog.openRunErrorDialog,
    repository: scriptRepository,
    workspaces: scriptWorkspace.workspaces,
  });
  const designCardsForNote = ref<DesignCard[]>([]);
  const noteWorkspace = useNoteWorkspace(
    scriptWorkspace.currentFile,
    runErrorDialog.openRunErrorDialog,
    designCardsForNote,
  );
  const workspaceLayoutMode = ref<WorkspaceLayoutMode>(
    layoutStorage.loadLayoutMode(noteWorkspace.isPanelOpen.value ? "split" : "code"),
  );
  const plotAIWorkflow = usePlotAIWorkflow({
    aiActivity,
    aiSettings,
    loadSceneCode: async (sceneName) => {
      if (sceneName === scriptWorkspace.currentFile.value) {
        return scriptWorkspace.codeContent.value;
      }

      const document = await scriptRepository.getScriptContent(sceneName);
      return asString(document.code);
    },
    onAnimateChangedRanges: animateRepairRanges,
    runErrorDialog,
    scriptWorkspace,
  });
  const designCardWorkspace = useDesignCardWorkspace({
    aiActivity,
    aiSettings,
    currentFile: scriptWorkspace.currentFile,
    isRunning,
    insertNoteReference: (cardId) => {
      noteWorkspace.insertDesignCardReference({
        cardId,
        persist: "immediate",
      });
    },
    onError: runErrorDialog.openRunErrorDialog,
  });
  const packageTransfer = usePackageTransfer({
    noteWorkspace,
    onError: runErrorDialog.openRunErrorDialog,
    scriptRepository,
    scriptWorkspace,
  });
  usePkcDropImport({
    onImport: packageTransfer.importScenePackageFromPath,
  });

  function insertDesignCardReferenceIntoNote(payload: {
    cardId: string;
    insertAt?: number;
    source?: "editor" | "note";
  }) {
    noteWorkspace.insertDesignCardReference({
      ...payload,
      persist: "immediate",
    });
  }

  async function deleteDesignCardFromNote(cardId: string) {
    noteWorkspace.removeDesignCardReference({
      cardId,
      persist: "immediate",
    });
    await designCardWorkspace.deleteCard(cardId);
  }

  const lifecycle = useWorkspaceLifecycle({
    isRunning,
    noteWorkspace,
    onError: runErrorDialog.openRunErrorDialog,
    onRunFailed: (message) => {
      if (plotAIWorkflow.aiWorkflowSession.isSessionActive.value) {
        return;
      }

      runErrorDialog.openRunErrorDialog(message, { repairable: true });
    },
    onRunFinished: () => undefined,
    onRunReady: () => undefined,
    onRunStopped: () => undefined,
    refreshSubscriptionStatus,
    runtime,
    runtimeRepository,
    scriptWorkspace,
  });

  function setWorkspaceLayoutMode(mode: WorkspaceLayoutMode) {
    workspaceLayoutMode.value = mode;
    layoutStorage.saveLayoutMode(mode);
    noteWorkspace.setPanelOpen(mode !== "code");
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

  function openSettings() {
    resetUpdateButtonState();
    isSettingsDialogOpen.value = true;
  }

  async function createScript(name: string) {
    await scriptWorkspace.createScript(name);
  }

  async function renameScript(oldName: string, newName: string) {
    await scriptWorkspace.renameScript(oldName, newName);
  }

  async function deleteScript(name: string) {
    await scriptWorkspace.deleteScript(name);
  }

  function openAISettings() {
    isAISettingsDialogOpen.value = true;
    void refreshSubscriptionStatus(true);
  }

  function closeAISettings() {
    isAISettingsDialogOpen.value = false;
  }

  async function updateAISettings(nextSettings: AIProviderSettings) {
    try {
      aiSettings.value = await saveAISettings(nextSettings);
    } catch (error) {
      runErrorDialog.openRunErrorDialog(getErrorMessage(error));
    }
  }

  function closeSettings() {
    resetUpdateButtonState();
    isSettingsDialogOpen.value = false;
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

  async function refreshSubscriptionStatus(force: boolean) {
    try {
      subscriptionStatus.value = normalizeSubscriptionStatus(await GetSubscriptionStatus(force));
    } catch (error) {
      subscriptionStatus.value = {
        ...subscriptionStatus.value,
        status: "error",
        activated: false,
        message: getErrorMessage(error),
      };
    }
  }

  async function purchaseSubscription() {
    try {
      await OpenSubscriptionPurchase();
    } catch (error) {
      runErrorDialog.openRunErrorDialog(getErrorMessage(error));
    }
  }

  async function refreshSubscriptionStatusManually() {
    await refreshSubscriptionStatus(true);
  }

  async function refreshAISettings() {
    try {
      aiSettings.value = await getAISettings();
    } catch (error) {
      aiSettings.value = createDefaultAISettings();
      runErrorDialog.openRunErrorDialog(getErrorMessage(error));
    }
  }

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
        runErrorDialog.openRunErrorDialog(getErrorMessage(error));
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
      runErrorDialog.openRunErrorDialog(getErrorMessage(error));
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
      await installUpdateAndRestart();
    } catch (error) {
      isInstallingUpdate.value = false;
      isUpdateInstallDialogOpen.value = false;
      runErrorDialog.openRunErrorDialog(getErrorMessage(error));
    }
  }

  function resetUpdateButtonState() {
    hasCheckedUpdatesThisSession.value = false;
    updateStatus.value = normalizeUpdateStatus({
      currentVersion: updateStatus.value.currentVersion,
    });
  }

  function animateRepairRanges(ranges: ChangedLineRange[]) {
    repairAnimatedLineRanges.value = ranges;
    repairAnimationKey.value += 1;
    window.setTimeout(() => {
      repairAnimatedLineRanges.value = [];
    }, 720);
  }

  onMounted(() => {
    void refreshAISettings();
    void refreshUpdateStatus();
    lifecycle.mount();
  });

  onUnmounted(() => {
    void designCardWorkspace.flushPlanSave();
    void noteWorkspace.flushPendingSave(scriptWorkspace.currentFile.value);
    lifecycle.unmount();
    aiActivity.stop();
  });

  watch(
    designCardWorkspace.cards,
    (cards) => {
      designCardsForNote.value = cards;
    },
    { immediate: true },
  );

  watch(
    workspaceLayoutMode,
    (mode) => {
      noteWorkspace.setPanelOpen(mode !== "code");
    },
    { immediate: true },
  );

  return {
    aiSettings,
    codeContent: scriptWorkspace.codeContent,
    designCards: designCardWorkspace.cards,
    designCardReviewCard: designCardWorkspace.activeCard,
    designCardReviewSaveState: designCardWorkspace.saveState,
    closeAISettings,
    currentNoteDocument: noteWorkspace.currentDocument,
    closePackageTransferDialog: packageTransfer.closePackageTransferDialog,
    closeCreateDialog: scriptWorkspace.closeCreateDialog,
    closeRunErrorDialog: runErrorDialog.closeRunErrorDialog,
    closeScreeningDialog: screeningWorkspace.closeScreeningDialog,
    closeSettings,
    cancelWorkspaceExportMode: workspacePackageTransfer.cancelExportMode,
    codeAIOptimizeActiveVersionId: plotAIWorkflow.codeAIOptimize.activeVersionId,
    codeAIOptimizeContextMenu: plotAIWorkflow.codeAIOptimize.contextMenu,
    codeAIOptimizeVersions: plotAIWorkflow.codeAIOptimize.versions,
    closeCodeAIOptimizeContextMenu: plotAIWorkflow.codeAIOptimize.closeContextMenu,
    closeCodeAIOptimizeDialog: plotAIWorkflow.codeAIOptimize.closeDialog,
    copyRunError: async () => {
      try {
        await runErrorDialog.copyRunError();
      } catch (error) {
        runErrorDialog.openRunErrorDialog(getErrorMessage(error));
      }
    },
    createScript,
    createWorkspace,
    beginScreening: screeningWorkspace.beginScreening,
    canStartScreening: screeningWorkspace.canStartScreening,
    currentFile: scriptWorkspace.currentFile,
    currentScreeningIndex: screeningWorkspace.currentScreeningIndex,
    currentScreeningSceneName: screeningWorkspace.currentScreeningSceneName,
    currentWorkspace: scriptWorkspace.currentWorkspace,
    deleteScript,
    deleteWorkspace,
    deletingScriptName: scriptWorkspace.deletingScriptName,
    environmentStatus: runtime.environmentStatus,
    exportSelectedWorkspaces: workspacePackageTransfer.exportSelectedWorkspaces,
    exportCurrentScenePackage: packageTransfer.exportCurrentScenePackage,
    addNoteImages: noteWorkspace.addImages,
    generateCodeFromNoteSelection: plotAIWorkflow.aiGeneration.generateCodeFromNoteSelection,
    generateDesignFromNoteSelection: designCardWorkspace.generateFromNoteSelection,
    stopDesigning: designCardWorkspace.stopDesigning,
    goToNextScreeningPage: screeningWorkspace.goToNextScreeningPage,
    hasNoteContent: noteWorkspace.hasContent,
    initProgressMessage: runtime.initProgressMessage,
    initProgressPercent: runtime.initProgressPercent,
    isAIGenerating: aiActivity.isAIGenerating,
    isDesigning: designCardWorkspace.isDesigning,
    isAISettingsDialogOpen,
    isCodeAIOptimizeDialogOpen: plotAIWorkflow.codeAIOptimize.isDialogOpen,
    isDesignCardOptimizeDialogOpen: designCardWorkspace.isOptimizeDialogOpen,
    isDesignCardReviewRoomOpen: designCardWorkspace.isReviewRoomOpen,
    isCreateDialogOpen: scriptWorkspace.isCreateDialogOpen,
    isCreatingScript: scriptWorkspace.isCreatingScript,
    isDeletingScript: scriptWorkspace.isDeletingScript,
    isInitializing: runtime.isInitializing,
    importScenePackage: packageTransfer.importScenePackage,
    importWorkspacePackage: workspacePackageTransfer.importWorkspacePackage,
    isPackageTransferDialogOpen: packageTransfer.isPackageTransferDialogOpen,
    isRebuildingRuntime: runtime.isRebuilding,
    isRenamingScript: scriptWorkspace.isRenamingScript,
    isScreeningActive: screeningWorkspace.isScreeningActive,
    isScreeningDialogOpen: screeningWorkspace.isScreeningDialogOpen,
    isStartingScreening: screeningWorkspace.isStartingScreening,
    isStoppingScreening: screeningWorkspace.isStoppingScreening,
    isWorkspaceExportMode: workspacePackageTransfer.isExportMode,
    packageTransferMessage: packageTransfer.packageTransferMessage,
    packageTransferPendingAction: packageTransfer.packageTransferPendingAction,
    purchaseSubscription,
    isRunErrorCopied: runErrorDialog.isRunErrorCopied,
    isRunErrorDialogOpen: runErrorDialog.isRunErrorDialogOpen,
    isRunErrorRepairable: runErrorDialog.isRunErrorRepairable,
    isRunning,
    isStoppingAIWorkflow: plotAIWorkflow.aiWorkflowSession.isSessionActive,
    isSettingsDialogOpen,
    isUpdateInstallDialogOpen,
    isInstallingUpdate,
    isUpdatePending,
    isNotePanelOpen: computed(() => workspaceLayoutMode.value !== "code"),
    handleUpdateAction,
    openCreateDialog: scriptWorkspace.openCreateDialog,
    openAISettings,
    openCodeAIOptimizeContextMenu: plotAIWorkflow.codeAIOptimize.openContextMenu,
    openCodeAIOptimizeDialog: plotAIWorkflow.codeAIOptimize.openDialog,
    openDesignCardReviewRoom: designCardWorkspace.openReviewRoom,
    openDesignCardOptimizeDialog: designCardWorkspace.openOptimizeDialog,
    openPackageTransferDialog: packageTransfer.openPackageTransferDialog,
    openScreeningDialog: screeningWorkspace.openScreeningDialog,
    triggerScreeningAction: screeningWorkspace.triggerScreeningAction,
    openSettings,
    openWorkspaceExportMode: workspacePackageTransfer.beginExportMode,
    noteRenderBlocks: noteWorkspace.renderBlocks,
    noteSaveState: noteWorkspace.saveState,
    reorderScripts: scriptWorkspace.reorderScripts,
    renameScript,
    renameWorkspace,
    moveNoteImage: noteWorkspace.moveImage,
    removeNoteImage: noteWorkspace.removeImage,
    insertDesignCardReferenceIntoNote,
    deleteDesignCardFromNote,
    rebuildRuntime: lifecycle.rebuildRuntime,
    repairAnimationKey,
    repairAnimatedLineRanges,
    repairCurrentRunError: plotAIWorkflow.aiRepair.repairCurrentRunError,
    runCurrentScript: scriptWorkspace.runCurrentScript,
    runErrorText: runErrorDialog.runErrorText,
    screeningDialogItems: screeningWorkspace.screeningDialogItems,
    scripts: scriptWorkspace.scripts,
    selectedScreeningScenes: screeningWorkspace.selectedScreeningScenes,
    selectScript,
    selectCodeAIOptimizeVersion: plotAIWorkflow.codeAIOptimize.selectVersion,
    switchWorkspace,
    stopCurrentRun: lifecycle.stopCurrentRun,
    stopScreening: screeningWorkspace.stopScreening,
    subscriptionStatus,
    showSplitPane,
    workspaceLayoutMode,
    toggleCodePane,
    toggleNotePane,
    toggleScreeningScene: screeningWorkspace.toggleScreeningScene,
    toggleWorkspaceExportSelection: workspacePackageTransfer.toggleWorkspaceSelection,
    updateStatus,
    toggleNotePanel,
    typingScriptName: scriptWorkspace.typingScriptName,
    updateCode: scriptWorkspace.updateCode,
    updateAISettings,
    submitCodeAIOptimize: plotAIWorkflow.codeAIOptimize.submitOptimization,
    submitDesignCardOptimize: designCardWorkspace.submitOptimization,
    closeDesignCardOptimizeDialog: designCardWorkspace.closeOptimizeDialog,
    closeDesignCardReviewRoom: designCardWorkspace.closeReviewRoom,
    updateDesignCardPlan: designCardWorkspace.updateActivePlan,
    updateNoteMarkdown: noteWorkspace.updateMarkdown,
    workspaces: scriptWorkspace.workspaces,
    workspacePackagePendingAction: workspacePackageTransfer.pendingAction,
    workspacePackageSelectedNames: workspacePackageTransfer.selectedWorkspaceNames,
    workspacePhase: scriptWorkspace.workspacePhase,
    refreshSubscriptionStatusManually,
    closeUpdateInstallDialog,
    installUpdateAndRestart: installPreparedUpdate,
    stopAIWorkflow: plotAIWorkflow.aiWorkflowSession.stopActiveWorkflow,
  };
}

function normalizeSubscriptionStatus(status: {
  status?: string;
  activated?: boolean;
  deviceId?: string;
  expireAt?: string;
  lastCheckedAt?: string;
  message?: string;
  model?: string;
  baseUrl?: string;
}): AISubscriptionStatus {
  return {
    status: normalizeSubscriptionStatusCode(status.status),
    activated: !!status.activated,
    deviceId: status.deviceId ?? "",
    expireAt: status.expireAt ?? "",
    lastCheckedAt: status.lastCheckedAt ?? "",
    message: status.message ?? "",
    model: status.model ?? "",
    baseUrl: status.baseUrl ?? "",
  };
}

function normalizeSubscriptionStatusCode(status?: string): AISubscriptionStatus["status"] {
  if (
    status === "active" ||
    status === "inactive" ||
    status === "unconfigured" ||
    status === "error"
  ) {
    return status;
  }

  return "error";
}

function normalizeUpdateStatus(
  status: UpdateStatusLike,
  options?: { hasCheckedThisSession?: boolean },
): AppUpdateStatus {
  const readyToInstall = !!status.readyToInstall;
  const updateAvailable = !!status.updateAvailable;
  const hasChecked = !!options?.hasCheckedThisSession;
  const latestVersion = typeof status.latestVersion === "string" ? status.latestVersion : "";
  const actionKind = readyToInstall
    ? "install"
    : updateAvailable
      ? "download"
      : hasChecked
        ? "latest"
        : "check";

  return {
    currentVersion: typeof status.currentVersion === "string" ? status.currentVersion : "0.0.3.1",
    latestVersion,
    notes: typeof status.notes === "string" ? status.notes : "",
    publishedAt: typeof status.publishedAt === "string" ? status.publishedAt : "",
    lastCheckedAt: typeof status.lastCheckedAt === "string" ? status.lastCheckedAt : "",
    message: typeof status.message === "string" ? status.message : "当前已经是最新版本",
    updateAvailable,
    downloaded: !!status.downloaded,
    readyToInstall,
    actionKind,
    actionLabel: getUpdateActionLabel(actionKind, latestVersion),
  };
}

function getUpdateActionLabel(
  actionKind: AppUpdateStatus["actionKind"],
  latestVersion: string,
): string {
  switch (actionKind) {
    case "install":
      return "立即安装";
    case "download":
      return latestVersion ? `下载 v${latestVersion}` : "下载更新";
    case "latest":
      return "已是最新版";
    case "check":
    default:
      return "检查更新";
  }
}
