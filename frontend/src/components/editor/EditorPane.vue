<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import EditorAIOverlay from "./EditorAIOverlay.vue";
import { useCodeMirrorEditor } from "./useCodeMirrorEditor";
import { useEditorDecorations } from "./useEditorDecorations";

const props = defineProps<{
  code: string;
  disabled?: boolean;
  isSceneSwitching?: boolean;
  isStreaming?: boolean;
  aiOverlayActive?: boolean;
  aiOverlayFinishing?: boolean;
  animatedLineRanges?: Array<{ startLine: number; endLine: number }>;
  animationKey?: number;
}>();

const emit = defineEmits<{
  "ai-optimize": [position: { x: number; y: number }];
  "update:code": [code: string];
  "selection-change": [hasSelection: boolean];
  "stop-ai": [];
  "ai-overlay-finished": [];
}>();

const editorRoot = ref<HTMLElement | null>(null);
const searchBar = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const normalizedCode = computed(() =>
  typeof props.code === "string" ? props.code : String(props.code ?? ""),
);

const editor = useCodeMirrorEditor({
  editorRoot,
  normalizedCode,
  disabled: () => props.disabled,
  onAIOptimize: (position) => emit("ai-optimize", position),
  onCodeChange: (code) => emit("update:code", code),
  onEditorActivity: emitSelectionChange,
  shouldIgnoreContextMenu: () => false,
});

function emitSelectionChange() {
  const view = editor.editorView.value;
  if (!view) {
    emit("selection-change", false);
    return;
  }
  const { from, to } = view.state.selection.main;
  emit("selection-change", from !== to);
}

const isSearchOpen = computed(() => editor.isSearchOpen.value);
const searchQuery = computed(() => editor.searchQuery.value);
const searchMatchLabel = computed(() =>
  editor.searchMatchCount.value > 0 && editor.searchActiveIndex.value >= 0
    ? `${editor.searchActiveIndex.value + 1}/${editor.searchMatchCount.value}`
    : "0/0",
);

const decorations = useEditorDecorations({
  editorView: editor.editorView,
  normalizedCode,
  getAnimatedLineRanges: () => props.animatedLineRanges,
  getAnimationKey: () => props.animationKey,
  getIsStreaming: () => props.isStreaming,
});

onMounted(() => {
  editor.mountEditor({
    cardDecorations: decorations.decorationsCompartment,
    buildDecorations: decorations.buildDecorations,
  });
});

onBeforeUnmount(() => {
  editor.destroyEditor();
});

watch(normalizedCode, (code) => {
  editor.syncExternalCode(code);
});

watch(
  () => props.disabled,
  () => editor.syncDisabled(),
);

watch(
  () => [
    props.animatedLineRanges,
    props.animationKey,
    props.isStreaming,
  ],
  decorations.reconfigureDecorations,
  { deep: true },
);

watch(
  () => isSearchOpen.value,
  async (isOpen) => {
    if (!isOpen) {
      return;
    }
    await nextTick();
    searchInput.value?.focus();
    searchInput.value?.select();
  },
);

function handlePanelPointerDown(event: PointerEvent) {
  if (!isSearchOpen.value) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (searchBar.value?.contains(target)) {
    return;
  }

  editor.closeSearch();
}
</script>

<template>
  <section
    class="editor-panel"
    :class="{
      disabled: disabled,
      streaming: isStreaming,
      switching: isSceneSwitching,
    }"
    @pointerdown="handlePanelPointerDown"
  >
    <div
      class="onboarding-focus-region onboarding-focus-region-editor"
      data-tour="editor-pane"
      aria-hidden="true"
    />
    <div v-if="isSearchOpen" ref="searchBar" class="editor-search-bar">
      <div class="editor-search-input-shell">
        <input
          ref="searchInput"
          class="editor-search-input"
          type="text"
          :value="searchQuery"
          @input="editor.updateSearchQuery(($event.target as HTMLInputElement).value)"
          @keydown.stop
          @keydown.enter.prevent="($event.shiftKey ? editor.findPreviousMatch() : editor.findNextMatch())"
          @keydown.up.prevent.stop="editor.findPreviousMatch()"
          @keydown.down.prevent.stop="editor.findNextMatch()"
          @keydown.escape.prevent="editor.closeSearch()"
        />
        <span v-if="!searchQuery" class="editor-search-inline-hint" aria-hidden="true">
          ↑↓ 切换结果&nbsp;&nbsp;&nbsp;esc 退出
        </span>
      </div>
      <span class="editor-search-status">{{ searchMatchLabel }}</span>
    </div>
    <div
      ref="editorRoot"
      class="code-editor-surface"
      :class="{ switching: isSceneSwitching }"
    />
    <EditorAIOverlay
      :active="Boolean(aiOverlayActive)"
      :finishing="Boolean(aiOverlayFinishing)"
      mode="code"
      @stop-ai="emit('stop-ai')"
      @finished="emit('ai-overlay-finished')"
    />
  </section>
</template>
