<script setup lang="ts">
defineProps<{
  isRunning: boolean;
  aiBusy: boolean;
  aiLabel: string;
}>();

const emit = defineEmits<{
  "stop-ai": [];
}>();
</script>

<template>
  <footer
    class="environment-bar"
    :class="{
      ready: !aiBusy,
      running: isRunning,
      'ai-working': aiBusy,
    }"
  >
    <span
      class="environment-pulse"
      :class="{
        ready: !aiBusy,
        running: isRunning,
        'ai-working': aiBusy,
      }"
      aria-hidden="true"
    />
    <strong class="environment-title">
      {{ aiBusy ? aiLabel : isRunning ? "Running" : "Ready" }}
    </strong>

    <button
      v-if="aiBusy"
      class="environment-stop-button"
      type="button"
      title="停止 AI 修复"
      aria-label="停止 AI 修复"
      @click="emit('stop-ai')"
    >
      <svg class="environment-stop-icon" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="2" y="2" width="8" height="8" rx="1.5" />
      </svg>
      <span>停止</span>
    </button>
  </footer>
</template>
