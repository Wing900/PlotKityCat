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
    <button
      class="corner-pocket-btn"
      type="button"
      :disabled="disabled"
      @click="emit('design')"
    >
      <NoteAIIcon name="design" />
      <span>生成设计卡片</span>
    </button>
    <button
      class="corner-pocket-btn"
      type="button"
      :disabled="disabled"
      @click="emit('generate')"
    >
      <NoteAIIcon name="generate" />
      <span>生成可视化</span>
    </button>
  </div>
</template>