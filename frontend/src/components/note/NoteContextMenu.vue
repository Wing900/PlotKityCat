<script setup lang="ts">
import type { NoteDocument } from "../../features/notebook/services/notebookStorage";
import NoteAIIcon from "./NoteAIIcon.vue";

defineProps<{
  position: { x: number; y: number };
  images: NoteDocument["images"];
  allowInsertImage: boolean;
}>();

const emit = defineEmits<{
  design: [];
  generate: [];
  insertImage: [];
  preview: [];
  remove: [];
}>();
</script>

<template>
  <div
    class="notebook-context-menu"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @mousedown.stop
  >
    <button
      v-if="images.length > 0"
      class="notebook-context-action"
      type="button"
      @click="emit('preview')"
    >
      <svg class="notebook-context-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6Z" />
        <path d="M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
      </svg>
      <span>预览</span>
    </button>
    <button
      class="notebook-context-action"
      type="button"
      @click="emit('design')"
    >
      <NoteAIIcon name="design" />
      <span>生成设计卡片</span>
    </button>
    <button
      class="notebook-context-action"
      type="button"
      @click="emit('generate')"
    >
      <NoteAIIcon name="generate" />
      <span>生成可视化</span>
    </button>
    <button
      v-if="allowInsertImage"
      class="notebook-context-action"
      type="button"
      @click="emit('insertImage')"
    >
      <svg class="notebook-context-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="13" rx="2.5" />
        <path d="M5 16l3-3 2.5 2.5L14 12l5 4" />
        <circle cx="8.5" cy="10" r="1.5" />
      </svg>
      <span>插入图片</span>
    </button>
    <button
      v-if="images.length > 0"
      class="notebook-context-action danger"
      type="button"
      @click="emit('remove')"
    >
      <svg class="notebook-context-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 7h12" />
        <path d="m9 7 .6-2h4.8L15 7" />
        <path d="M8 7v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" />
      </svg>
      <span>移除</span>
    </button>
  </div>
</template>
