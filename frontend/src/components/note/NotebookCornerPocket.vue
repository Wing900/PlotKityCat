<script setup lang="ts">
import NoteAIIcon from "./NoteAIIcon.vue";

defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  design: [];
  generate: [];
}>();
</script>

<template>
  <div class="corner-pocket notebook-corner-pocket">
    <div class="ai-joint-pill" :class="{ 'ai-busy': disabled }">
      <button
        class="ai-joint-btn"
        type="button"
        :disabled="disabled"
        @click="emit('design')"
      >
        <NoteAIIcon name="design" />
        <span class="ai-text">卡片</span>
      </button>
      <div class="ai-joint-divider" aria-hidden="true" />
      <button
        class="ai-joint-btn"
        type="button"
        :disabled="disabled"
        data-tour="ai-generate"
        @click="emit('generate')"
      >
        <NoteAIIcon name="generate" />
        <span class="ai-text">可视化</span>
      </button>
    </div>
  </div>
</template>