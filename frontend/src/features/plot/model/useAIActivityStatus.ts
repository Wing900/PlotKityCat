import { ref } from "vue";

export function useAIActivityStatus() {
  const isAIGenerating = ref(false);

  function startWorking() {
    isAIGenerating.value = true;
  }

  function startChecking() {
    isAIGenerating.value = true;
  }

  function start() {
    startWorking();
  }

  function stop() {
    isAIGenerating.value = false;
  }

  return {
    isAIGenerating,
    start,
    startChecking,
    startWorking,
    stop,
  };
}