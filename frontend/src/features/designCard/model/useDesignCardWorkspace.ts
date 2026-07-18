import { computed, ref, type Ref } from "vue";
import type { AINoteSceneActionRequest, AIProviderSettings } from "../../ai/services/aiTypes";
import type { DesignCard } from "../services/designCardTypes";
import { useDesignCardStore } from "./useDesignCardStore";
import { useDesignCardDesignFlow } from "./useDesignCardDesignFlow";

type AIActivityStatus = {
  isAIGenerating: Ref<boolean>;
};

type DesignCardWorkspaceOptions = {
  aiActivity: AIActivityStatus;
  aiSettings: Ref<AIProviderSettings>;
  currentFile: Ref<string>;
  isRunning: Ref<boolean>;
  insertNoteReference: (cardId: string) => void;
  onError: (message: string) => void;
};

export function useDesignCardWorkspace(options: DesignCardWorkspaceOptions) {
  const activeCardId = ref("");
  const isReviewRoomOpen = computed(() => activeCardId.value !== "");

  const store = useDesignCardStore({
    currentFile: options.currentFile,
    onError: options.onError,
  });

  const flow = useDesignCardDesignFlow({
    aiActivity: options.aiActivity,
    aiSettings: options.aiSettings,
    currentFile: options.currentFile,
    isRunning: options.isRunning,
    upsertCard: store.upsertCard,
    insertNoteReference: options.insertNoteReference,
    onError: options.onError,
  });

  const activeCard = computed(
    () => store.rawCards.value.find((card) => card.id === activeCardId.value) ?? null,
  );

  function openReviewRoom(cardId: string) {
    if (!store.rawCards.value.some((card) => card.id === cardId)) {
      return;
    }
    activeCardId.value = cardId;
  }

  function closeReviewRoom() {
    activeCardId.value = "";
  }

  async function deleteCard(cardId: string) {
    await store.removeCard(cardId);
    if (activeCardId.value === cardId) {
      activeCardId.value = "";
    }
  }

  function updateActivePlan(plan: string) {
    store.updateActivePlan(activeCard.value, plan);
  }

  async function flushPlanSave() {
    await store.flushPlanSave(activeCard.value);
  }

  return {
    activeCard,
    cards: store.cards,
    closeOptimizeDialog: flow.closeOptimizeDialog,
    closeReviewRoom,
    deleteCard,
    flushPlanSave,
    generateFromNoteSelection: flow.generateFromNoteSelection,
    isDesigning: flow.isDesigning,
    isOptimizeDialogOpen: flow.isOptimizeDialogOpen,
    isReviewRoomOpen,
    openOptimizeDialog: flow.openOptimizeDialog,
    openReviewRoom,
    saveState: store.saveState,
    stopDesigning: flow.stopDesigning,
    submitOptimization: flow.submitOptimization,
    updateActivePlan,
  };
}