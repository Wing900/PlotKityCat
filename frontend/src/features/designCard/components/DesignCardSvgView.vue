<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { getDesignCardSvgAspectRatio } from "../services/designCardSvgGeometry";

const props = defineProps<{
  svg: string;
}>();

// SVG 经由 AI 生成时常使用 width="100%" / height="100%"。
// 详情页先用 viewBox 建立确定尺寸，避免百分比尺寸在 Flex 布局中循环解析。
const aspectRatio = computed(() => getDesignCardSvgAspectRatio(props.svg) ?? "5 / 3");
const scale = ref(1);
const position = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
const startPos = reactive({ x: 0, y: 0 });

watch(
  () => props.svg,
  () => {
    scale.value = 1;
    position.x = 0;
    position.y = 0;
  },
);

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.08 : 0.08;
  // 限制缩放不小于 1（不超宽度限制），最大 4
  scale.value = Math.min(Math.max(1, scale.value + delta), 4);

  // 缩放回 1 时重置位置
  if (scale.value === 1) {
    position.x = 0;
    position.y = 0;
  }
}

function startDrag(event: MouseEvent) {
  isDragging.value = true;
  startPos.x = event.clientX - position.x;
  startPos.y = event.clientY - position.y;
}

function onDrag(event: MouseEvent) {
  if (!isDragging.value) return;
  position.x = event.clientX - startPos.x;
  position.y = event.clientY - startPos.y;
}

function stopDrag() {
  isDragging.value = false;
}
</script>

<template>
  <div
    class="design-card-svg-view-container"
    @wheel="handleWheel"
    @mousedown="startDrag"
    @mousemove="onDrag"
    @mouseup="stopDrag"
    @mouseleave="stopDrag"
  >
    <div
      class="design-card-svg-view-canvas"
      :class="{ dragging: isDragging }"
      :style="{
        aspectRatio,
        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }"
      v-html="svg"
    ></div>
  </div>
</template>
