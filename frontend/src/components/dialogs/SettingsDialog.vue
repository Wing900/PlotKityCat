<script setup lang="ts">
defineProps<{
  open: boolean;
  pending: boolean;
  running: boolean;
  update: {
    currentVersion: string;
    actionKind: "check" | "latest" | "download" | "install";
    actionLabel: string;
  };
  updatePending: boolean;
  status: {
    ready: boolean;
    code: string;
    summary: string;
    recommendedAction: string;
    items: Array<{
      key?: string;
      label?: string;
      category?: string;
      status?: string;
      message?: string;
      exists?: boolean;
    }>;
    canRebuild: boolean;
  };
}>();

const emit = defineEmits<{
  close: [];
  rebuild: [];
  "check-update": [];
}>();
</script>

<template>
  <Transition name="create-dialog-backdrop" appear>
    <div v-if="open" class="dialog-backdrop" @click.self="emit('close')">
      <section class="create-dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">设置</h2>
        <p class="settings-current-version">当前版本 {{ update.currentVersion || "-" }}</p>

        <div class="settings-runtime">
          <div class="settings-runtime-header">
            <strong class="settings-runtime-title">WinPython 环境</strong>
          </div>
          <ul class="settings-runtime-list">
            <li v-for="item in status.items" :key="item.key ?? item.label" class="settings-runtime-item">
              <span>{{ item.label }}</span>
              <span>{{ item.message }}</span>
            </li>
          </ul>
        </div>

        <div class="create-dialog-actions">
          <button class="dialog-button secondary settings-update-button" type="button" :disabled="updatePending" @click="emit('check-update')">
            {{ updatePending ? "处理中" : update.actionLabel }}
          </button>
          <div class="settings-actions-spacer"></div>
          <button
            class="dialog-button"
            type="button"
            :disabled="pending || running || !status.canRebuild"
            @click="emit('rebuild')"
          >
            {{ pending ? "重建中" : "重建 Runtime" }}
          </button>
          <button class="dialog-button secondary" type="button" @click="emit('close')">
            关闭
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>
