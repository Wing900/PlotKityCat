<script setup lang="ts">
import type { NoteImage } from "../../../features/notebook/services/notebookStorage";
import NoteContextMenu from "../NoteContextMenu.vue";
import NoteImagePreview from "../NoteImagePreview.vue";

defineProps<{
  aiBusy?: boolean;
  contextMenu: { x: number; y: number } | null;
  contextMenuSupportsInsert: boolean;
  contextMenuImages: NoteImage[];
  previewImage: { src: string; alt: string } | null;
  previewScale: number;
}>();

const emit = defineEmits<{
  closePreview: [];
  design: [];
  generate: [];
  insertImage: [];
  previewContextImage: [];
  removeContextImages: [];
  resetPreview: [];
  wheelPreview: [event: WheelEvent];
  zoomPreview: [delta: number];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="floating-menu" appear>
      <NoteContextMenu
        v-if="contextMenu && !aiBusy"
        :position="contextMenu"
        :allow-insert-image="contextMenuSupportsInsert"
        :images="contextMenuImages"
        @preview="emit('previewContextImage')"
        @design="emit('design')"
        @generate="emit('generate')"
        @insert-image="emit('insertImage')"
        @remove="emit('removeContextImages')"
      />
    </Transition>

    <Transition name="preview-dialog" appear>
      <NoteImagePreview
        v-if="previewImage"
        :image="previewImage"
        :scale="previewScale"
        @close="emit('closePreview')"
        @wheel="emit('wheelPreview', $event)"
        @zoom="emit('zoomPreview', $event)"
        @reset="emit('resetPreview')"
      />
    </Transition>
  </Teleport>
</template>
