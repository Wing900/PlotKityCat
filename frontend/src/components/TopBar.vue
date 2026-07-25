<script setup lang="ts">
import { Quit, WindowMinimise, WindowToggleMaximise } from "../../wailsjs/runtime/runtime";

defineProps<{
  isRunning: boolean;
  isScreeningActive?: boolean;
}>();

const emit = defineEmits<{
  packages: [];
  run: [];
  screening: [];
  stop: [];
}>();

function minimiseWindow() {
  WindowMinimise();
}

function toggleMaximiseWindow() {
  WindowToggleMaximise();
}

function closeWindow() {
  Quit();
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-editor-actions">
      <div class="topbar-actions">
        <button
          class="icon-button"
          type="button"
          title="导入导出"
          aria-label="导入导出"
          @click="emit('packages')"
        >
          <svg class="topbar-icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M7.5 5.5V18.5" />
            <path d="M7.5 18.5L4.75 15.75" />
            <path d="M7.5 18.5L10.25 15.75" />
            <path d="M16.5 18.5V5.5" />
            <path d="M16.5 5.5L13.75 8.25" />
            <path d="M16.5 5.5L19.25 8.25" />
          </svg>
        </button>
      </div>

      <button
        class="run-button"
        type="button"
        :class="{ stopping: isRunning }"
        data-tour="run-button"
        @click="isRunning ? emit('stop') : emit('run')"
      >
        <span class="run-icon" aria-hidden="true"></span>
        <span>{{ isRunning ? "停止运行" : "运行场景" }}</span>
      </button>

      <button
        class="run-button"
        type="button"
        :class="{ stopping: isScreeningActive }"
        @click="emit('screening')"
      >
        <span>{{ isScreeningActive ? "放映中" : "放映模式" }}</span>
      </button>
    </div>

    <div class="topbar-drag-region" aria-hidden="true"></div>

    <div class="topbar-window-controls">
      <button
        class="window-control-button"
        type="button"
        aria-label="最小化"
        title="最小化"
        @click="minimiseWindow"
      >
        <span class="window-control-line" aria-hidden="true"></span>
      </button>

      <button
        class="window-control-button"
        type="button"
        aria-label="最大化或还原"
        title="最大化或还原"
        @click="toggleMaximiseWindow"
      >
        <span class="window-control-square" aria-hidden="true"></span>
      </button>

      <button
        class="window-control-button close"
        type="button"
        aria-label="关闭"
        title="关闭"
        @click="closeWindow"
      >
        <span class="window-control-cross" aria-hidden="true"></span>
      </button>
    </div>
  </header>
</template>
