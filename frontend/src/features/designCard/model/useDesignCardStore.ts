import { computed, ref, watch, type Ref } from "vue";
import { getErrorMessage } from "../../../lib/errors";
import {
  deleteDesignCard,
  listDesignCards,
  updateDesignCardPlan,
} from "../services/designCardBridgeCompat";
import type { DesignCard } from "../services/designCardTypes";

type DesignCardStoreOptions = {
  currentFile: Ref<string>;
  onError: (message: string) => void;
};

const planSaveDebounceMs = 420;

export function useDesignCardStore(options: DesignCardStoreOptions) {
  const cards = ref<DesignCard[]>([]);
  const saveState = ref<"idle" | "saving" | "saved">("idle");

  let loadingToken = 0;
  let saveTimer = 0;

  const sortedCards = computed(() => sortCards(cards.value));

  watch(
    options.currentFile,
    (sceneName) => {
      if (!sceneName) {
        cards.value = [];
        return;
      }
      const token = ++loadingToken;
      void loadCards(sceneName, token);
    },
    { immediate: true },
  );

  async function loadCards(sceneName: string, token = ++loadingToken) {
    try {
      const nextCards = await listDesignCards(sceneName);
      if (token !== loadingToken) {
        return;
      }
      cards.value = sortCards(nextCards);
    } catch (error) {
      if (token === loadingToken) {
        options.onError(getErrorMessage(error));
      }
    }
  }

  function upsertCard(card: DesignCard) {
    const nextCards = cards.value.filter((item) => item.id !== card.id);
    nextCards.push(card);
    cards.value = sortCards(nextCards);
  }

  async function removeCard(cardId: string) {
    if (!options.currentFile.value || !cardId) {
      return;
    }
    try {
      await deleteDesignCard(options.currentFile.value, cardId);
      cards.value = cards.value.filter((card) => card.id !== cardId);
    } catch (error) {
      options.onError(getErrorMessage(error));
    }
  }

  function updateActivePlan(card: DesignCard | null, plan: string) {
    if (!card || card.plan === plan) {
      return;
    }
    upsertCard({ ...card, plan });
    schedulePlanSave(card.id, plan);
  }

  function schedulePlanSave(cardId: string, plan: string) {
    saveState.value = "saving";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      void persistPlan(cardId, plan);
    }, planSaveDebounceMs);
  }

  async function persistPlan(cardId: string, plan: string) {
    if (!options.currentFile.value) {
      saveState.value = "idle";
      return;
    }
    try {
      const card = await updateDesignCardPlan(options.currentFile.value, cardId, plan);
      upsertCard(card);
      saveState.value = "saved";
    } catch (error) {
      saveState.value = "idle";
      options.onError(getErrorMessage(error));
    } finally {
      saveTimer = 0;
    }
  }

  async function flushPlanSave(activeCard: DesignCard | null) {
    if (!saveTimer) {
      return;
    }
    window.clearTimeout(saveTimer);
    saveTimer = 0;
    if (activeCard) {
      await persistPlan(activeCard.id, activeCard.plan);
    }
  }

  return {
    cards: sortedCards,
    rawCards: cards,
    saveState,
    upsertCard,
    removeCard,
    updateActivePlan,
    flushPlanSave,
  };
}

function sortCards(cards: DesignCard[]) {
  return [...cards].sort((a, b) =>
    a.order === b.order ? a.id.localeCompare(b.id) : a.order - b.order,
  );
}