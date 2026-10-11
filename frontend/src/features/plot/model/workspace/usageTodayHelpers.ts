import type { AIUsageToday } from "../../../ai/services/aiTypes";

export function createEmptyUsageToday(): AIUsageToday {
  return { date: "", promptTokens: 0, completionTokens: 0, totalTokens: 0, requests: 0 };
}

export function normalizeUsageToday(
  raw:
    | {
        date?: string;
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        requests?: number;
      }
    | null
    | undefined,
): AIUsageToday {
  return {
    date: raw?.date ?? "",
    promptTokens: toCount(raw?.promptTokens),
    completionTokens: toCount(raw?.completionTokens),
    totalTokens: toCount(raw?.totalTokens),
    requests: toCount(raw?.requests),
  };
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** 12345 -> "12,345"，不依赖 locale，保证各平台显示一致。 */
export function formatTokenCount(value: number): string {
  return toCount(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
