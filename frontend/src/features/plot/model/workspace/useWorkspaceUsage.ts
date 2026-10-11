import { getCurrentScope, onScopeDispose, ref, type Ref } from "vue";
import { GetUsageToday } from "../../../../../wailsjs/go/bridge/App";
import { EventsOn } from "../../../../../wailsjs/runtime/runtime";
import type { AIUsageToday } from "../../../ai/services/aiTypes";
import { createEmptyUsageToday, normalizeUsageToday } from "./usageTodayHelpers";

/**
 * 今日本软件的 token 用量。打开 AI 设置时主动拉一次，之后靠后端在每次
 * AI 请求结束后推送的 usage:updated 事件保持实时。
 */
export function useWorkspaceUsage() {
  const usageToday = ref<AIUsageToday>(createEmptyUsageToday());

  async function refreshUsageToday() {
    try {
      usageToday.value = normalizeUsageToday(await GetUsageToday());
    } catch {
      // 用量只是展示信息，拉取失败时保留上一次的值即可
    }
  }

  const stopListening = EventsOn("usage:updated", (...payload: unknown[]) => {
    usageToday.value = normalizeUsageToday(
      payload[0] as Parameters<typeof normalizeUsageToday>[0],
    );
  });
  if (getCurrentScope()) {
    onScopeDispose(stopListening);
  }

  return {
    usageToday: usageToday as Ref<AIUsageToday>,
    refreshUsageToday,
  };
}
