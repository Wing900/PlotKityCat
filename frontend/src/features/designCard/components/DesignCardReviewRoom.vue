<script setup lang="ts">
import { computed, ref } from "vue";
import type { DesignCard } from "../services/designCardTypes";
import DesignCardSvgView from "./DesignCardSvgView.vue";

const props = defineProps<{
  card: DesignCard | null;
  open: boolean;
  pending?: boolean;
  saveState: "idle" | "saving" | "saved";
}>();

const emit = defineEmits<{
  close: [];
  optimize: [cardId: string];
  "update:plan": [plan: string];
}>();

const lineCount = computed(() => {
  if (!props.card?.plan) return 1;
  return props.card.plan.split("\n").length;
});

const scrollTop = ref(0);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function handleScroll(event: Event) {
  scrollTop.value = (event.target as HTMLTextAreaElement).scrollTop;
}

function updatePlan(event: Event) {
  emit("update:plan", (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="preview-dialog" appear>
      <div v-if="open && card" class="design-card-review-backdrop" @click.self="emit('close')">
        <div class="design-card-review-zen">
          <header class="design-card-zen-global-actions">
            <span class="design-card-save-state">
              {{ saveState === "saving" ? "保存中" : saveState === "saved" ? "已保存" : "" }}
            </span>
            <button type="button" class="zen-action-link" :disabled="pending" @click="emit('optimize', card.id)">
              {{ pending ? "优化中" : "AI优化" }}
            </button>
            <button type="button" class="zen-action-link close-trigger" @click="emit('close')">
              关闭
            </button>
          </header>

          <div class="design-card-review-content">
            <section class="design-card-zen-preview">
              <DesignCardSvgView :svg="card.svg" />
            </section>

            <section class="design-card-zen-editor">
              <div class="design-card-zen-grid">
                <div class="design-card-zen-gutter">
                  <div
                    class="zen-gutter-inner"
                    :style="{ transform: `translateY(${-scrollTop}px)` }"
                  >
                    <div v-for="n in lineCount" :key="n" class="zen-line-number">
                      {{ n }}
                    </div>
                  </div>
                </div>
                <textarea
                  ref="textareaRef"
                  class="design-card-plan-input"
                  spellcheck="false"
                  wrap="off"
                  :value="card.plan"
                  :disabled="pending"
                  @input="updatePlan"
                  @scroll="handleScroll"
                ></textarea>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
