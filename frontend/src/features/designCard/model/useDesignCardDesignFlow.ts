import { computed, ref, type Ref } from "vue";
import type { AINoteSceneActionRequest, AIProviderSettings } from "../../ai/services/aiTypes";
import { getErrorMessage } from "../../../lib/errors";
import type { DesignCard } from "../services/designCardTypes";
import { useDesignCardSession } from "./useDesignCardSession";

type AIActivityStatus = {
  isAIGenerating: Ref<boolean>;
};

type DesignFlowOptions = {
  aiActivity: AIActivityStatus;
  aiSettings: Ref<AIProviderSettings>;
  currentFile: Ref<string>;
  isRunning: Ref<boolean>;
  upsertCard: (card: DesignCard) => void;
  insertNoteReference: (cardId: string) => void;
  onError: (message: string) => void;
};

export function useDesignCardDesignFlow(options: DesignFlowOptions) {
  const isDesigning = ref(false);
  const optimizeDialogCardId = ref("");
  const designCardSession = useDesignCardSession();

  const isOptimizeDialogOpen = computed(() => optimizeDialogCardId.value !== "");

  async function generateFromNoteSelection(request: AINoteSceneActionRequest) {
    const targetScene = request.sceneName.trim();
    if (!canStartDesign(targetScene, request.selection.items.length)) {
      return;
    }

    isDesigning.value = true;
    try {
      await designCardSession.startSession(
        {
          kind: "generate",
          sceneName: targetScene,
          cardId: "",
          instruction: "",
          settings: options.aiSettings.value,
          selection: request.selection,
        },
        {
          onSucceeded: (event) => handleGenerateSucceeded(targetScene, event.card),
          onFailed: (event) => options.onError(event.errorText),
          onInterrupted: () => undefined,
        },
      );
    } catch (error) {
      options.onError(getErrorMessage(error));
    } finally {
      isDesigning.value = false;
    }
  }

  function canStartDesign(targetScene: string, selectionCount: number) {
    return (
      !!targetScene &&
      !options.isRunning.value &&
      !options.aiActivity.isAIGenerating.value &&
      !isDesigning.value &&
      selectionCount > 0
    );
  }

  function handleGenerateSucceeded(targetScene: string, card: DesignCard) {
    if (options.currentFile.value !== targetScene) {
      return;
    }
    options.upsertCard(card);
    options.insertNoteReference(card.id);
  }

  function openOptimizeDialog(cardId: string) {
    if (!cardId || options.aiActivity.isAIGenerating.value || isDesigning.value) {
      return;
    }
    optimizeDialogCardId.value = cardId;
  }

  function closeOptimizeDialog() {
    if (!options.aiActivity.isAIGenerating.value) {
      optimizeDialogCardId.value = "";
    }
  }

  async function submitOptimization(instruction: string) {
    const cardId = optimizeDialogCardId.value;
    if (
      !cardId ||
      !options.currentFile.value ||
      options.aiActivity.isAIGenerating.value ||
      isDesigning.value
    ) {
      return;
    }

    isDesigning.value = true;
    try {
      await designCardSession.startSession(
        {
          kind: "optimize",
          sceneName: options.currentFile.value,
          cardId,
          instruction,
          settings: options.aiSettings.value,
          selection: { items: [] },
        },
        {
          onSucceeded: (event) => {
            options.upsertCard(event.card);
            optimizeDialogCardId.value = "";
          },
          onFailed: (event) => options.onError(event.errorText),
          onInterrupted: () => undefined,
        },
      );
    } catch (error) {
      options.onError(getErrorMessage(error));
    } finally {
      isDesigning.value = false;
    }
  }

  async function stopDesigning() {
    if (!isDesigning.value) {
      return;
    }
    await designCardSession.stopActiveSession();
  }

  return {
    isDesigning,
    isOptimizeDialogOpen,
    optimizeDialogCardId,
    generateFromNoteSelection,
    openOptimizeDialog,
    closeOptimizeDialog,
    submitOptimization,
    stopDesigning,
  };
}