<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch } from "vue";
import CreateScriptDialog from "./components/dialogs/CreateScriptDialog.vue";
import AISettingsDialog from "./components/dialogs/AISettingsDialog.vue";
import CodeAIOptimizeContextMenu from "./components/codeAIOptimize/CodeAIOptimizeContextMenu.vue";
import CodeAIOptimizeDialog from "./components/codeAIOptimize/CodeAIOptimizeDialog.vue";
import CodeAIVersionRail from "./components/codeAIOptimize/CodeAIVersionRail.vue";
import DesignCardOptimizeDialog from "./features/designCard/components/DesignCardOptimizeDialog.vue";
import DesignCardReviewRoom from "./features/designCard/components/DesignCardReviewRoom.vue";
import EditorCornerPocket from "./components/editor/EditorCornerPocket.vue";
import EditorPane from "./components/editor/EditorPane.vue";
import PackageTransferDialog from "./components/dialogs/PackageTransferDialog.vue";
import NotePanel from "./components/note/NotePanel.vue";
import RunErrorDialog from "./components/dialogs/RunErrorDialog.vue";
import RuntimeLoadingScreen from "./components/RuntimeLoadingScreen.vue";
import ScreeningDialog from "./components/dialogs/ScreeningDialog.vue";
import SettingsDialog from "./components/dialogs/SettingsDialog.vue";
import SidebarPanel from "./components/sidebar/SidebarPanel.vue";
import StopAIConfirmDialog from "./components/dialogs/StopAIConfirmDialog.vue";
import TopBar from "./components/TopBar.vue";
import UpdateRestartDialog from "./components/dialogs/UpdateRestartDialog.vue";
import { usePlotWorkspace } from "./features/plot/model/workspace/usePlotWorkspace";
import { useTheme } from "./composables/useTheme";
import { useOnboarding } from "./features/onboarding/useOnboarding";
import { ONBOARDING_WORKSPACE_NAME } from "./features/onboarding/onboardingTemplate";

const workspace = reactive(usePlotWorkspace());
const theme = reactive(useTheme());

const onboarding = useOnboarding({
  enterOnboardingWorkspace: workspace.enterOnboardingWorkspace,
  isTemplateAvailable: () =>
    workspace.workspaces.some(
      (item) => item.name === ONBOARDING_WORKSPACE_NAME,
    ),
  prepareOnboardingLayout: workspace.showSplitPane,
});
const isSceneSwitching = ref(false);
const isLoadingScreenVisible = ref(true);
const isStopAIConfirmOpen = ref(false);
const isStoppingAI = ref(false);
const aiOverlayFinishing = ref(false);
const aiOverlayVisible = ref(false);
const designOverlayFinishing = ref(false);
const designOverlayVisible = ref(false);

watch(
  () => workspace.isAIGenerating,
  (busy, wasBusy) => {
    if (busy) {
      aiOverlayVisible.value = true;
      aiOverlayFinishing.value = false;
      return;
    }
    if (wasBusy && aiOverlayVisible.value) {
      aiOverlayFinishing.value = true;
    }
  },
);

watch(
  () => workspace.isDesigning,
  (busy, wasBusy) => {
    if (busy) {
      designOverlayVisible.value = true;
      designOverlayFinishing.value = false;
      return;
    }
    if (wasBusy && designOverlayVisible.value) {
      designOverlayFinishing.value = true;
    }
  },
);

let sceneSwitchTimer = 0;
let hasMountedScene = false;

watch(
  () => workspace.currentFile,
  () => {
    if (!hasMountedScene) {
      hasMountedScene = true;
      return;
    }

    window.clearTimeout(sceneSwitchTimer);
    isSceneSwitching.value = true;
    sceneSwitchTimer = window.setTimeout(() => {
      isSceneSwitching.value = false;
      sceneSwitchTimer = 0;
    }, 260);
  },
);

watch(
  () => workspace.isInitializing,
  (isInitializing) => {
    if (isInitializing) {
      isLoadingScreenVisible.value = true;
    }
  },
  { immediate: true },
);

function handleLoadingScreenSettled() {
  if (!workspace.isInitializing) {
    isLoadingScreenVisible.value = false;
  }
}

function handleLoadingScreenLeft() {
  // 主界面完全露出后再启动教程，避免 Welcome Card 与 Loading 退场动画重叠。
  onboarding.scheduleFirstTourAfterReveal();
}

function handleStopAI() {
  // 按设计应弹 HIG 二次确认（停止有副作用——已进行的尝试会丢弃）
  isStopAIConfirmOpen.value = true;
}

async function confirmStopAI() {
  if (isStoppingAI.value) {
    return;
  }
  isStoppingAI.value = true;
  // 中断路径: 立刻关闭遮罩, 跳过 finishing 渐隐动画
  aiOverlayVisible.value = false;
  aiOverlayFinishing.value = false;
  designOverlayVisible.value = false;
  designOverlayFinishing.value = false;
  try {
    if (workspace.isAIGenerating) {
      await workspace.stopAIWorkflow();
    } else if (workspace.isDesigning) {
      await workspace.stopDesigning();
    }
  } catch (error) {
    console.warn("[stop-ai] 停止失败", error);
  } finally {
    isStoppingAI.value = false;
    isStopAIConfirmOpen.value = false;
  }
}

function cancelStopAI() {
  isStopAIConfirmOpen.value = false;
}

onBeforeUnmount(() => {
  window.clearTimeout(sceneSwitchTimer);
  onboarding.dispose();
});
</script>

<template>
  <div class="app-shell">
    <Transition
      name="runtime-loading-shell"
      @after-leave="handleLoadingScreenLeft"
    >
      <RuntimeLoadingScreen
        v-if="isLoadingScreenVisible"
        :active="workspace.isInitializing"
        :progress="workspace.initProgressPercent"
        :message="workspace.initProgressMessage"
        :theme-id="theme.currentThemeId"
        @settled="handleLoadingScreenSettled"
      />
    </Transition>

    <SidebarPanel
      :scripts="workspace.scripts"
      :workspaces="workspace.workspaces"
      :current-file="workspace.currentFile"
      :current-workspace="workspace.currentWorkspace"
      :typing-script-name="workspace.typingScriptName"
      :deleting-script-name="workspace.deletingScriptName"
      :is-renaming="workspace.isRenamingScript"
      :is-deleting="workspace.isDeletingScript"
      :is-workspace-export-mode="workspace.isWorkspaceExportMode"
      :workspace-package-pending-action="workspace.workspacePackagePendingAction"
      :workspace-package-selected-names="workspace.workspacePackageSelectedNames"
      @select="workspace.selectScript"
      @create="workspace.openCreateDialog"
      @reorder="workspace.reorderScripts"
      @rename="workspace.renameScript"
      @delete="workspace.deleteScript"
      @switch-workspace="workspace.switchWorkspace"
      @create-workspace="workspace.createWorkspace"
      @rename-workspace="workspace.renameWorkspace"
      @delete-workspace="workspace.deleteWorkspace"
      @import-workspaces="workspace.importWorkspacePackage"
      @export-workspaces="workspace.exportSelectedWorkspaces"
      @toggle-workspace-export-mode="workspace.openWorkspaceExportMode"
      @cancel-workspace-export-mode="workspace.cancelWorkspaceExportMode"
      @toggle-workspace-export-selection="workspace.toggleWorkspaceExportSelection"
      @ai-settings="workspace.openAISettings"
      @settings="workspace.openSettings"
      @appearance="theme.cycleTheme"
    />

    <main class="workspace">
      <TopBar
        :is-running="workspace.isRunning"
        :is-screening-active="workspace.isScreeningActive"
        @packages="workspace.openPackageTransferDialog"
        @screening="workspace.triggerScreeningAction"
        @stop="workspace.stopCurrentRun"
        @run="workspace.runCurrentScript"
      />

      <div
        class="workspace-body"
        :class="`layout-${workspace.workspaceLayoutMode}`"
      >
        <section class="editor-workspace-column">
          <EditorPane
            :code="workspace.codeContent"
            :disabled="workspace.isAIGenerating"
            :is-scene-switching="isSceneSwitching"
            :is-streaming="workspace.isAIGenerating"
            :ai-overlay-active="aiOverlayVisible && !aiOverlayFinishing"
            :ai-overlay-finishing="aiOverlayFinishing"
            :animated-line-ranges="workspace.repairAnimatedLineRanges"
            :animation-key="workspace.repairAnimationKey"
            @ai-optimize="workspace.openCodeAIOptimizeContextMenu"
            @stop-ai="handleStopAI"
            @ai-overlay-finished="aiOverlayVisible = false; aiOverlayFinishing = false"
            @update:code="workspace.updateCode"
          />

          <EditorCornerPocket
            v-if="workspace.workspaceLayoutMode !== 'note'"
            :disabled="workspace.isAIGenerating || workspace.isDesigning"
            @optimize="workspace.openCodeAIOptimizeDialog()"
          />

          <CodeAIVersionRail
            :versions="workspace.codeAIOptimizeVersions"
            :active-id="workspace.codeAIOptimizeActiveVersionId"
            @select="workspace.selectCodeAIOptimizeVersion"
          />
        </section>

        <NotePanel
          :current-file="workspace.currentFile"
          :document="workspace.currentNoteDocument"
          :design-cards="workspace.designCards"
          :is-open="workspace.isNotePanelOpen"
          :layout-mode="workspace.workspaceLayoutMode"
          :is-scene-switching="isSceneSwitching"
          :render-blocks="workspace.noteRenderBlocks"
          :save-state="workspace.noteSaveState"
          :ai-busy="workspace.isAIGenerating || workspace.isDesigning"
          :ai-overlay-active="designOverlayVisible && !designOverlayFinishing"
          :ai-overlay-finishing="designOverlayFinishing"
          @show-code="workspace.toggleCodePane"
          @show-split="workspace.showSplitPane"
          @show-note="workspace.toggleNotePane"
          @update:markdown="workspace.updateNoteMarkdown"
          @add-images="workspace.addNoteImages"
          @move-image="workspace.moveNoteImage"
          @remove-image="workspace.removeNoteImage"
          @delete-design-card="workspace.deleteDesignCardFromNote"
          @insert-design-card="workspace.insertDesignCardReferenceIntoNote"
          @open-design-card="workspace.openDesignCardReviewRoom"
          @ai-generate="workspace.generateCodeFromNoteSelection"
          @ai-design="workspace.generateDesignFromNoteSelection"
          @stop-ai="handleStopAI"
          @ai-overlay-finished="designOverlayVisible = false; designOverlayFinishing = false"
        />
      </div>
    </main>

    <CreateScriptDialog
      :open="workspace.isCreateDialogOpen"
      :pending="workspace.isCreatingScript"
      @cancel="workspace.closeCreateDialog"
      @confirm="workspace.createScript"
    />

    <ScreeningDialog
      :open="workspace.isScreeningDialogOpen"
      :items="workspace.screeningDialogItems"
      :pending="workspace.isStartingScreening"
      :start-disabled="!workspace.canStartScreening"
      @cancel="workspace.closeScreeningDialog"
      @confirm="workspace.beginScreening"
      @toggle="workspace.toggleScreeningScene"
    />

    <CodeAIOptimizeContextMenu
      v-if="workspace.codeAIOptimizeContextMenu"
      :position="workspace.codeAIOptimizeContextMenu"
      :disabled="workspace.isAIGenerating || workspace.isRunning"
      @close="workspace.closeCodeAIOptimizeContextMenu"
      @optimize="workspace.openCodeAIOptimizeDialog"
    />

    <CodeAIOptimizeDialog
      :open="workspace.isCodeAIOptimizeDialogOpen"
      :pending="workspace.isAIGenerating"
      @cancel="workspace.closeCodeAIOptimizeDialog"
      @confirm="workspace.submitCodeAIOptimize"
    />

    <DesignCardOptimizeDialog
      :open="workspace.isDesignCardOptimizeDialogOpen"
      :pending="workspace.isAIGenerating"
      @cancel="workspace.closeDesignCardOptimizeDialog"
      @confirm="workspace.submitDesignCardOptimize"
    />

    <DesignCardReviewRoom
      :open="workspace.isDesignCardReviewRoomOpen"
      :card="workspace.designCardReviewCard"
      :pending="workspace.isAIGenerating"
      :save-state="workspace.designCardReviewSaveState"
      @close="workspace.closeDesignCardReviewRoom"
      @optimize="workspace.openDesignCardOptimizeDialog"
      @update:plan="workspace.updateDesignCardPlan"
    />

    <SettingsDialog
      :open="workspace.isSettingsDialogOpen"
      :pending="workspace.isRebuildingRuntime"
      :running="workspace.isRunning"
      :status="workspace.environmentStatus"
      :update="workspace.updateStatus"
      :update-pending="workspace.isUpdatePending"
      @close="workspace.closeSettings"
      @check-update="workspace.handleUpdateAction"
      @rebuild="workspace.rebuildRuntime"
    />

    <AISettingsDialog
      :open="workspace.isAISettingsDialogOpen"
      :settings="workspace.aiSettings"
      :subscription-status="workspace.subscriptionStatus"
      @close="workspace.closeAISettings"
      @purchase-subscription="workspace.purchaseSubscription"
      @refresh-subscription="workspace.refreshSubscriptionStatusManually"
      @update:settings="workspace.updateAISettings"
    />

    <PackageTransferDialog
      :open="workspace.isPackageTransferDialogOpen"
      :current-file="workspace.currentFile"
      :last-message="workspace.packageTransferMessage"
      :pending-action="workspace.packageTransferPendingAction"
      :running="workspace.isRunning"
      @close="workspace.closePackageTransferDialog"
      @export="workspace.exportCurrentScenePackage"
      @import="workspace.importScenePackage"
    />

    <RunErrorDialog
      :open="workspace.isRunErrorDialogOpen"
      :error-text="workspace.runErrorText"
      :copied="workspace.isRunErrorCopied"
      :repairable="workspace.isRunErrorRepairable"
      :repair-disabled="workspace.isAIGenerating || workspace.isRunning"
      @close="workspace.closeRunErrorDialog"
      @copy="workspace.copyRunError"
      @repair="workspace.repairCurrentRunError"
    />

    <UpdateRestartDialog
      :open="workspace.isUpdateInstallDialogOpen"
      :pending="workspace.isInstallingUpdate"
      :version="workspace.updateStatus.latestVersion"
      @close="workspace.closeUpdateInstallDialog"
      @confirm="workspace.installUpdateAndRestart"
    />

    <StopAIConfirmDialog
      :open="isStopAIConfirmOpen"
      :pending="isStoppingAI"
      @cancel="cancelStopAI"
      @confirm="confirmStopAI"
    />
  </div>
</template>
