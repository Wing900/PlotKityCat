<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  open: boolean;
  errorText: string;
  copied: boolean;
  repairable?: boolean;
  repairDisabled?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  copy: [];
  repair: [];
}>();

function close() {
  emit("close");
}

function copy() {
  emit("copy");
}

function repair() {
  emit("repair");
}

const normalizedErrorText = computed(() => props.errorText.trim());

const errorSummary = computed(() => {
  const lines = normalizedErrorText.value.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return "运行失败";
  }

  const firstLine = lines[0];
  const lastLine = lines[lines.length - 1];
  if (firstLine.startsWith("Traceback")) {
    return lastLine ?? firstLine;
  }

  return firstLine;
});

const errorDetails = computed(() => {
  const lines = normalizedErrorText.value.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    return "";
  }

  if (lines[0]?.startsWith("Traceback")) {
    return lines.join("\n");
  }

  return lines.slice(1).join("\n");
});
</script>

<template>
  <Transition name="create-dialog-backdrop" appear>
    <div v-if="open" class="dialog-backdrop" @click.self="close">
      <section class="create-dialog error-dialog" role="dialog" aria-modal="true" aria-labelledby="run-error-title">
        <div class="error-dialog-header">
          <h2 id="run-error-title">错误</h2>
          <button class="copy-error-button" type="button" @click="copy">
            {{ copied ? "已复制" : "复制" }}
          </button>
        </div>

        <p class="error-summary">{{ errorSummary }}</p>

        <details v-if="errorDetails" class="error-details">
          <summary>查看详情</summary>
          <pre class="error-traceback">{{ errorDetails }}</pre>
        </details>

        <div class="create-dialog-actions">
          <button class="dialog-button secondary" type="button" @click="close">
            关闭
          </button>
          <div v-if="props.repairable" class="dialog-action-divider" />
          <button
            v-if="props.repairable"
            class="dialog-button primary"
            type="button"
            :disabled="props.repairDisabled"
            @click="repair"
          >
            AI修复
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>
