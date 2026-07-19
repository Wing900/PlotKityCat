<script setup lang="ts">
defineProps<{
  currentFile: string;
  lastMessage: string;
  open: boolean;
  pendingAction: "" | "import" | "export";
  running: boolean;
}>();

const emit = defineEmits<{
  close: [];
  export: [];
  import: [];
}>();
</script>

<template>
  <Transition name="create-dialog-backdrop" appear>
    <div v-if="open" class="dialog-backdrop" @click.self="emit('close')">
      <section
        class="create-dialog package-transfer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-transfer-title"
      >
        <h2 id="package-transfer-title">场景包</h2>

        <div class="package-transfer-body">
          <p class="package-transfer-summary">
            导入或导出 .pkc 场景包，便于分享交流可视化作品
          </p>
          <p class="package-transfer-current">
            当前场景：{{ currentFile || "未选择场景" }}
          </p>
          <p v-if="running" class="package-transfer-hint">
            运行中暂不允许导入或导出。
          </p>
          <p v-else-if="lastMessage" class="package-transfer-hint">
            {{ lastMessage }}
          </p>
        </div>

        <div class="create-dialog-actions">
          <button
            class="dialog-button primary"
            type="button"
            :disabled="pendingAction !== '' || running"
            @click="emit('import')"
          >
            {{ pendingAction === "import" ? "导入中" : "导入" }}
          </button>
          <span class="dialog-action-divider" aria-hidden="true"></span>
          <button
            class="dialog-button primary"
            type="button"
            :disabled="pendingAction !== '' || running || !currentFile"
            @click="emit('export')"
          >
            {{ pendingAction === "export" ? "导出中" : "导出" }}
          </button>
          <button class="dialog-button secondary" type="button" :disabled="pendingAction !== ''" @click="emit('close')">
            取消
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>
