<script setup lang="ts">
const props = defineProps<{
  items: Array<{
    sceneName: string;
    order: number | null;
  }>;
  open: boolean;
  pending: boolean;
  startDisabled: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
  toggle: [sceneName: string];
}>();

function cancel() {
  if (props.pending) {
    return;
  }

  emit("cancel");
}
</script>

<template>
  <Transition name="create-dialog-backdrop" appear>
    <div v-if="open" class="dialog-backdrop" @click.self="cancel">
      <section class="create-dialog screening-dialog" role="dialog" aria-modal="true" aria-labelledby="screening-title">
        <div class="screening-dialog-header">
          <h2 id="screening-title">放映模式</h2>
          <p>双击画面切到下一页，Esc 退出；右键菜单进入画笔和放大，滚轮控制视角缩放。</p>
        </div>

        <div class="screening-scene-list" role="list">
          <button
            v-for="item in items"
            :key="item.sceneName"
            class="screening-scene-row"
            type="button"
            :class="{ selected: item.order !== null }"
            @click="emit('toggle', item.sceneName)"
          >
            <span class="screening-scene-order" :class="{ empty: item.order === null }">
              {{ item.order === null ? "" : String(item.order).padStart(2, "0") }}
            </span>
            <span class="screening-scene-name">{{ item.sceneName }}</span>
          </button>
        </div>

        <div class="create-dialog-actions screening-dialog-actions">
          <button class="dialog-button secondary" type="button" :disabled="pending" @click="cancel">
            取消
          </button>
          <span class="dialog-action-divider" aria-hidden="true"></span>
          <button class="dialog-button primary" type="button" :disabled="startDisabled || pending" @click="emit('confirm')">
            {{ pending ? "准备中" : "开始放映" }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>
