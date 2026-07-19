<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  pending: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [filename: string];
}>();

const filename = ref("");

watch(
  () => props.open,
  (open) => {
    if (open) {
      filename.value = "";
    }
  },
);

function confirm() {
  const value = filename.value.trim();
  if (!value || props.pending) {
    return;
  }

  emit("confirm", value);
}

function cancel() {
  if (props.pending) {
    return;
  }

  filename.value = "";
  emit("cancel");
}
</script>

<template>
  <Transition name="create-dialog-backdrop" appear>
    <div v-if="open" class="dialog-backdrop" @click.self="cancel">
      <section class="create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <h2 id="create-title">新建</h2>

        <input
          v-model="filename"
          class="create-dialog-input"
          type="text"
          autocomplete="off"
          autofocus
          placeholder="导数切线"
          :disabled="pending"
          @keydown.enter="confirm"
          @keydown.esc="cancel"
        />

        <div class="create-dialog-actions">
          <button class="dialog-button secondary" type="button" :disabled="pending" @click="cancel">
            取消
          </button>
          <span class="dialog-action-divider" aria-hidden="true"></span>
          <button class="dialog-button primary" type="button" :disabled="!filename.trim() || pending" @click="confirm">
            {{ pending ? "创建中" : "创建" }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>
