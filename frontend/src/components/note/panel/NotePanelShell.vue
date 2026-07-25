<script setup lang="ts">
import type { WorkspaceLayoutMode } from "../../../features/plot/services/workspaceLayoutStorage";
import NotebookDividerHandle from "./NotebookDividerHandle.vue";

defineProps<{
  currentFile?: string;
  isOpen: boolean;
  isSceneSwitching?: boolean;
  layoutMode: WorkspaceLayoutMode;
}>();

const emit = defineEmits<{
  "show-code": [];
  "show-split": [];
  "show-note": [];
}>();

const notebookRoot = defineModel<HTMLElement | null>("notebookRoot", { default: null });
</script>

<template>
  <aside
    ref="notebookRoot"
    class="notebook-pane"
    :class="[
      `layout-${layoutMode}`,
      { collapsed: !isOpen, switching: isSceneSwitching },
    ]"
  >
    <div
      class="onboarding-focus-region onboarding-focus-region-note"
      data-tour="note-panel"
      aria-hidden="true"
    />
    <div class="notebook-spine">
      <NotebookDividerHandle
        :layout-mode="layoutMode"
        @show-code="emit('show-code')"
        @show-split="emit('show-split')"
        @show-note="emit('show-note')"
      />
    </div>

    <Transition name="notebook-panel-shell-transition">
      <div v-if="isOpen" class="notebook-panel-shell">
        <slot />
      </div>
    </Transition>

    <slot name="overlays" />
  </aside>
</template>
