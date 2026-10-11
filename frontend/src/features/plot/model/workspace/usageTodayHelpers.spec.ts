import { describe, it, expect } from "vitest";
import { formatTokenCount, normalizeUsageToday } from "./usageTodayHelpers";

describe("normalizeUsageToday", () => {
  it("合法字段透传", () => {
    const got = normalizeUsageToday({
      date: "2026-10-11",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      requests: 2,
    });
    expect(got).toEqual({
      date: "2026-10-11",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      requests: 2,
    });
  });

  it("缺失或非法数值回退 0", () => {
    const got = normalizeUsageToday({ promptTokens: -3, totalTokens: Number.NaN } as never);
    expect(got.date).toBe("");
    expect(got.promptTokens).toBe(0);
    expect(got.totalTokens).toBe(0);
    expect(got.requests).toBe(0);
  });

  it("null 输入得到空统计", () => {
    expect(normalizeUsageToday(null).totalTokens).toBe(0);
    expect(normalizeUsageToday(undefined).requests).toBe(0);
  });
});

describe("formatTokenCount", () => {
  it("千分位分隔", () => {
    expect(formatTokenCount(0)).toBe("0");
    expect(formatTokenCount(999)).toBe("999");
    expect(formatTokenCount(12345)).toBe("12,345");
    expect(formatTokenCount(1234567)).toBe("1,234,567");
  });

  it("非法值显示 0", () => {
    expect(formatTokenCount(Number.NaN)).toBe("0");
    expect(formatTokenCount(-5)).toBe("0");
  });
});
