import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { ChangedLineRange } from "../../../ai/services/aiTypes";
import { useRunErrorDialog } from "../../../errors/model/useRunErrorDialog";
import { useDesignCardWorkspace } from "../../../designCard/model/useDesignCardWorkspace";
import type { DesignCard } from "../../../designCard/services/designCardTypes";
import { useNoteWorkspace } from "../../../notebook/model/useNoteWorkspace";
import { createRuntimeRepository } from "../../../runtime/services/runtimeRepository";
import { useRuntimeState } from "../../../runtime/model/useRuntimeState";
import { useScreeningWorkspace } from "../../../screening/model/useScreeningWorkspace";
import { createScriptRepository } from "../../../scripts/services/scriptRepository";
import { asString } from "../../../scripts/model/scriptWorkspaceUtils";
import { useScriptWorkspaceMachine } from "../../../scripts/model/useScriptWorkspaceMachine";
import { useWorkspacePackageTransfer } from "../../../scripts/model/useWorkspacePackageTransfer";
import { getErrorMessage } from "../../../../lib/errors";
import { useAIActivityStatus } from "../useAIActivityStatus";
import { usePlotAIWorkflow } from "../usePlotAIWorkflow";
import { usePackageTransfer } from "../usePackageTransfer";
import { usePkcDropImport } from "../usePkcDropImport";
import { useWorkspaceLifecycle } from "../useWorkspaceLifecycle";
import { useWorkspaceSubscription } from "./useWorkspaceSubscription";
import { useWorkspaceUpdates } from "./useWorkspaceUpdates";
import { useWorkspaceScriptOps } from "./useWorkspaceScriptOps";
import { useWorkspaceAISettings } from "./useWorkspaceAISettings";
import { useWorkspacePaneLayout } from "./useWorkspacePaneLayout";

export function usePlotWorkspace() {
  const isRunning = ref(false);
  const repairAnimatedLineRanges = ref<ChangedLineRange[]>([]);
  const repairAnimationKey = ref(0);
  const isSettingsDialogOpen = ref(false);

  const runtime = useRuntimeState();
  const runtimeRepository = createRuntimeRepository();
  const scriptRepository = createScriptRepository();
  const runErrorDialog = useRunErrorDialog();
  const aiActivity = useAIActivityStatus();

  const subscription = useWorkspaceSubscription({
    openRunErrorDialog: runErrorDialog.openRunErrorDialog,
  });
  const updates = useWorkspaceUpdates({
    openRunErrorDialog: runErrorDialog.openRunErrorDialog,
  });
  const aiSettingsStore = useWorkspaceAISettings({
    openRunErrorDialog: runErrorDialog.openRunErrorDialog,
    onOpen: () => {
      void subscription.refreshSubscriptionStatus(true);
    },
  });

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
  const paneLayout = useWorkspacePaneLayout({ noteWorkspace });
  const scriptOps = useWorkspaceScriptOps({ scriptWorkspace, noteWorkspace });

  const plotAIWorkflow = usePlotAIWorkflow({
    aiActivity,
    aiSettings: aiSettingsStore.aiSettings,
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
    aiSettings: aiSettingsStore.aiSettings,
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
    refreshSubscriptionStatus: subscription.refreshSubscriptionStatus,
    runtime,
    runtimeRepository,
    scriptWorkspace,
  });

  function openSettings() {
    updates.resetUpdateButtonState();
    isSettingsDialogOpen.value = true;
  }

  function closeSettings() {
    updates.resetUpdateButtonState();
    isSettingsDialogOpen.value = false;
  }

  function animateRepairRanges(ranges: ChangedLineRange[]) {
    repairAnimatedLineRanges.value = ranges;
    repairAnimationKey.value += 1;
    window.setTimeout(() => {
      repairAnimatedLineRanges.value = [];
    }, 720);
  }

  onMounted(() => {
    void aiSettingsStore.refreshAISettings();
    void updates.refreshUpdateStatus();
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
    paneLayout.workspaceLayoutMode,
    (mode) => {
      noteWorkspace.setPanelOpen(mode !== "code");
    },
    { immediate: true },
  );

  return {
    aiSettings: aiSettingsStore.aiSettings,
    codeContent: scriptWorkspace.codeContent,
    designCards: designCardWorkspace.cards,
    designCardReviewCard: designCardWorkspace.activeCard,
    designCardReviewSaveState: designCardWorkspace.saveState,
    closeAISettings: aiSettingsStore.closeAISettings,
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
    createScript: scriptOps.createScript,
    createWorkspace: scriptOps.createWorkspace,
    beginScreening: screeningWorkspace.beginScreening,
    canStartScreening: screeningWorkspace.canStartScreening,
    currentFile: scriptWorkspace.currentFile,
    currentScreeningIndex: screeningWorkspace.currentScreeningIndex,
    currentScreeningSceneName: screeningWorkspace.currentScreeningSceneName,
    currentWorkspace: scriptWorkspace.currentWorkspace,
    deleteScript: scriptOps.deleteScript,
    deleteWorkspace: scriptOps.deleteWorkspace,
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
    isAISettingsDialogOpen: aiSettingsStore.isAISettingsDialogOpen,
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
    purchaseSubscription: subscription.purchaseSubscription,
    isRunErrorCopied: runErrorDialog.isRunErrorCopied,
    isRunErrorDialogOpen: runErrorDialog.isRunErrorDialogOpen,
    isRunErrorRepairable: runErrorDialog.isRunErrorRepairable,
    isRunning,
    isStoppingAIWorkflow: plotAIWorkflow.aiWorkflowSession.isSessionActive,
    isSettingsDialogOpen,
    isUpdateInstallDialogOpen: updates.isUpdateInstallDialogOpen,
    isInstallingUpdate: updates.isInstallingUpdate,
    isUpdatePending: updates.isUpdatePending,
    isNotePanelOpen: computed(() => paneLayout.workspaceLayoutMode.value !== "code"),
    handleUpdateAction: updates.handleUpdateAction,
    openCreateDialog: scriptWorkspace.openCreateDialog,
    openAISettings: aiSettingsStore.openAISettings,
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
    renameScript: scriptOps.renameScript,
    renameWorkspace: scriptOps.renameWorkspace,
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
    selectScript: scriptOps.selectScript,
    selectCodeAIOptimizeVersion: plotAIWorkflow.codeAIOptimize.selectVersion,
    switchWorkspace: scriptOps.switchWorkspace,
    stopCurrentRun: lifecycle.stopCurrentRun,
    stopScreening: screeningWorkspace.stopScreening,
    subscriptionStatus: subscription.subscriptionStatus,
    showSplitPane: paneLayout.showSplitPane,
    workspaceLayoutMode: paneLayout.workspaceLayoutMode,
    toggleCodePane: paneLayout.toggleCodePane,
    toggleNotePane: paneLayout.toggleNotePane,
    toggleScreeningScene: screeningWorkspace.toggleScreeningScene,
    toggleWorkspaceExportSelection: workspacePackageTransfer.toggleWorkspaceSelection,
    updateStatus: updates.updateStatus,
    toggleNotePanel: paneLayout.toggleNotePanel,
    typingScriptName: scriptWorkspace.typingScriptName,
    updateCode: scriptWorkspace.updateCode,
    updateAISettings: aiSettingsStore.updateAISettings,
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
    refreshSubscriptionStatusManually: subscription.refreshSubscriptionStatusManually,
    closeUpdateInstallDialog: updates.closeUpdateInstallDialog,
    installUpdateAndRestart: updates.installPreparedUpdate,
    stopAIWorkflow: plotAIWorkflow.aiWorkflowSession.stopActiveWorkflow,
  };
}