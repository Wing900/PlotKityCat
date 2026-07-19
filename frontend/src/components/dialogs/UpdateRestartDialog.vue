<script setup lang="ts">
defineProps<{
  open: boolean;
  pending: boolean;
  version: string;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <Transition name="create-dialog-backdrop" appear>
    <div v-if="open" class="dialog-backdrop" @click.self="emit('close')">
      <section class="create-dialog update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <h2 id="update-title">已下载完成</h2>
        <p class="update-dialog-summary">
          新版本 {{ version || "已就绪" }} 已下载完成，立即重启并安装更新吗？
        </p>

        <div class="create-dialog-actions">
          <button class="dialog-button secondary" type="button" :disabled="pending" @click="emit('close')">
            稍后
          </button>
          <button class="dialog-button primary" type="button" :disabled="pending" @click="emit('confirm')">
            {{ pending ? "正在重启" : "立即更新" }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>
