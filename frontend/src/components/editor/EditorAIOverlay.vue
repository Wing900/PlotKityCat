<script setup lang="ts">
import { onBeforeUnmount, onMounted, nextTick, ref, watch } from "vue";
import { Rive } from "@rive-app/canvas";
import catRivUrl from "../../assets/rive/plotkitycat.riv?url";
import { useFluidScrim } from "./useFluidScrim";

const props = defineProps<{
  active: boolean;
  finishing: boolean;
}>();

const emit = defineEmits<{
  finished: [];
  "stop-ai": [];
  "click-cat": [];
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const scrimCanvasEl = ref<HTMLCanvasElement | null>(null);
const tipIndex = ref(0);
const mascotOffset = ref({ x: 0, y: 0 });
let dragStart: { x: number; y: number; ox: number; oy: number } | null = null;
const tips = [
  "AI 正在生成中。",
  "小猫在帮你改代码。",
  "先别动编辑器，马上好。",
  "生成完成后会自动解锁。",
];

let rive: Rive | null = null;
let tipTimer = 0;
let finishTimer = 0;
let finishGuard = false;
const scrim = useFluidScrim();
let resizeObserver: ResizeObserver | null = null;

watch(
  mascotOffset,
  (offset) => scrim.setAnchor(offset.x, offset.y),
  { deep: true },
);

function attachScrim() {
  if (!scrimCanvasEl.value) {
    return;
  }
  scrim.attach(scrimCanvasEl.value);
  if (!resizeObserver && scrimCanvasEl.value) {
    resizeObserver = new ResizeObserver(() => scrim.resize());
    resizeObserver.observe(scrimCanvasEl.value);
  }
}

function detachScrim() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  scrim.detach();
}


function fireInput(name: string) {
  if (!rive) {
    return;
  }
  try {
    const inputs = rive.stateMachineInputs("State Machine 1");
    const input = inputs?.find((item) => item.name === name);
    if (!input) {
      return;
    }
    if ("fire" in input && typeof input.fire === "function") {
      input.fire();
      return;
    }
    if ("value" in input) {
      input.value = true;
    }
  } catch {
    // RIVE 输入名以 .riv 为准；找不到时静默，避免打断生成
  }
}

function startTips() {
  stopTips();
  tipIndex.value = 0;
  tipTimer = window.setInterval(() => {
    tipIndex.value = (tipIndex.value + 1) % tips.length;
  }, 2200);
}

function stopTips() {
  if (tipTimer) {
    window.clearInterval(tipTimer);
    tipTimer = 0;
  }
}

function mountRive() {
  if (!canvasEl.value || rive) {
    return;
  }

  rive = new Rive({
    src: catRivUrl,
    canvas: canvasEl.value,
    autoplay: true,
    stateMachines: "State Machine 1",
    onLoad: () => {
      if (!rive) {
        return;
      }
      try {
        rive.resizeDrawingSurfaceToCanvas();
      } catch {
        // canvas 可能已被销毁, 静默
      }
    },
  });
}

function destroyRive() {
  rive?.cleanup();
  rive = null;
}

function handleCatClick() {
  if (!props.active || props.finishing) {
    return;
  }
  fireInput("ClickToNod");
  emit("click-cat");
}

function onMascotPointerDown(event: PointerEvent) {
  if (!props.active || props.finishing) {
    return;
  }
  dragStart = {
    x: event.clientX,
    y: event.clientY,
    ox: mascotOffset.value.x,
    oy: mascotOffset.value.y,
  };
  const target = event.currentTarget as HTMLElement | null;
  target?.setPointerCapture(event.pointerId);
}

function onMascotPointerMove(event: PointerEvent) {
  if (!dragStart) {
    return;
  }
  mascotOffset.value = {
    x: dragStart.ox + (event.clientX - dragStart.x),
    y: dragStart.oy + (event.clientY - dragStart.y),
  };
}

function onMascotPointerUp(event: PointerEvent) {
  if (!dragStart) {
    return;
  }
  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;
  dragStart = null;
  if (Math.hypot(dx, dy) < 4) {
    handleCatClick();
  }
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      finishGuard = false;
      mascotOffset.value = { x: 0, y: 0 };
      nextTick(() => {
        mountRive();
        attachScrim();
      });
      startTips();
      return;
    }
    stopTips();
    if (!props.finishing) {
      destroyRive();
      detachScrim();
    }
  },
  { immediate: true, flush: "post" },
);

watch(
  () => props.finishing,
  (finishing) => {
    if (!finishing || finishGuard) {
      return;
    }
    finishGuard = true;
    stopTips();
    fireInput("aiDone");
    window.setTimeout(() => fireInput("aiDone"), 360);
    if (finishTimer) {
      window.clearTimeout(finishTimer);
    }
    finishTimer = window.setTimeout(() => {
      destroyRive();
      detachScrim();
      emit("finished");
    }, 2100);
  },
);

function handleResize() {
  rive?.resizeDrawingSurfaceToCanvas();
}

onMounted(() => {
  if (props.active) {
    mountRive();
    attachScrim();
    startTips();
  }
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  stopTips();
  if (finishTimer) {
    window.clearTimeout(finishTimer);
  }
  destroyRive();
  detachScrim();
});
</script>

<template>
  <div
    v-if="active || finishing"
    class="editor-ai-overlay"
    :class="{ finishing }"
    aria-live="polite"
  >
    <canvas ref="scrimCanvasEl" class="editor-ai-overlay-scrim" aria-hidden="true" />
    <div class="editor-ai-overlay-center">
      <button
        class="editor-ai-mascot-button"
        type="button"
        title="点一下小猫 / 拖动"
        :style="{ transform: `translate(${mascotOffset.x}px, ${mascotOffset.y}px)` }"
        @pointerdown="onMascotPointerDown"
        @pointermove="onMascotPointerMove"
        @pointerup="onMascotPointerUp"
        @pointercancel="onMascotPointerUp"
      >
        <canvas ref="canvasEl" class="editor-ai-mascot-canvas" width="180" height="180" />
      </button>
      <div class="editor-ai-tip-rail" aria-hidden="true">
        <p
          v-for="(tip, index) in tips"
          :key="tip"
          class="editor-ai-tip"
          :class="{ active: index === tipIndex }"
        >
          {{ tip }}
        </p>
      </div>
      <button
        v-if="active && !finishing"
        class="editor-ai-stop"
        type="button"
        @click="emit('stop-ai')"
      >
        中断 AI 生成
      </button>
    </div>
  </div>
</template>
