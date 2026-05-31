import { ref } from "vue";
import type { RuntimeStatusLike } from "../services/runtimeBridgeCompat";

function createDefaultEnvironmentStatus(): RuntimeStatusLike {
  return {
    ready: false,
    code: "pending",
    severity: "info",
    runtimeDir: "",
    summary: "Checking runtime",
    recommendedAction: "",
    checkedAt: "",
    items: [],
    missing: [],
    canRebuild: false,
    runtimeArchivePath: "",
    runtimeArchiveExists: false,
  };
}

export function useRuntimeState() {
  const environmentStatus = ref<RuntimeStatusLike>(createDefaultEnvironmentStatus());
  const initProgressMessage = ref("Preparing runtime");
  const initProgressPercent = ref(0);
  const isInitializing = ref(true);
  const isRebuilding = ref(false);

  function applyEnvironmentStatus(status?: RuntimeStatusLike) {
    environmentStatus.value = {
      ...environmentStatus.value,
      ...(status ?? {}),
      items: status?.items ?? environmentStatus.value.items ?? [],
      missing: status?.missing ?? environmentStatus.value.missing ?? [],
    };
  }

  function applyProgress(progress?: { percent?: number; message?: string }) {
    if (typeof progress?.percent === "number") {
      initProgressPercent.value = progress.percent;
    }
    if (progress?.message) {
      initProgressMessage.value = progress.message;
    }
  }

  function finishInitialization(message = "Runtime ready") {
    initProgressMessage.value = message;
    initProgressPercent.value = 100;
    isInitializing.value = false;
  }

  function failInitialization(message: string) {
    initProgressMessage.value = message;
    isInitializing.value = false;
  }

  return {
    applyEnvironmentStatus,
    applyProgress,
    environmentStatus,
    failInitialization,
    finishInitialization,
    initProgressMessage,
    initProgressPercent,
    isInitializing,
    isRebuilding,
  };
}
