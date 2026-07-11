<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  pending: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

function cancel() {
  if (props.pending) {
    return;
  }
  emit("cancel");
}

function confirm() {
  if (props.pending) {
    return;
  }
  emit("confirm");
}
</script>

<template>
  <Transition name="create-dialog-backdrop" appear>
    <div v-if="open" class="dialog-backdrop" @click.self="cancel">
      <section class="create-dialog stop-ai-dialog" role="dialog" aria-modal="true" aria-labelledby="stop-ai-title">
        <h2 id="stop-ai-title">停止 AI 修复？</h2>

        <p class="stop-ai-message">已进行的尝试将被丢弃，停止后需重新发起修复。</p>

        <div class="create-dialog-actions">
          <button class="dialog-button secondary" type="button" :disabled="pending" @click="cancel">
            取消
          </button>
          <span class="dialog-action-divider" aria-hidden="true"></span>
          <button class="dialog-button primary" type="button" :disabled="pending" @click="confirm">
            {{ pending ? "停止中" : "停止" }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>