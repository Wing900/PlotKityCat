<script setup lang="ts">
defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  optimize: [];
}>();

function handleClick() {
  emit("optimize");
}
</script>

<template>
  <div class="corner-pocket editor-corner-pocket">
    <button
      class="ai-btn-single"
      type="button"
      :disabled="disabled"
      :class="{ 'ai-busy': disabled }"
      @click="handleClick"
    >
      <svg class="ai-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 8 Q10.7 12.8 15.5 14.5 Q10.7 16.2 9 21 Q7.3 16.2 2.5 14.5 Q7.3 12.8 9 8 Z" />
        <path d="M17.5 3 Q18.42 5.58 21 6.5 Q18.42 7.42 17.5 10 Q16.58 7.42 14 6.5 Q16.58 5.58 17.5 3 Z" />
      </svg>
      <span class="ai-text">优化</span>
    </button>
  </div>
</template>