import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import {
  computedPhase,
  asString,
  withTimeout,
  getTypingDuration,
  getDeletingDuration,
  createVisualDelayMs,
  wait,
} from "./scriptWorkspaceUtils";

describe("computedPhase", () => {
  it("phase 匹配时为 true", () => {
    const phase = ref("syncing");
    const isSyncing = computedPhase("syncing", phase);
    expect(isSyncing.value).toBe(true);
    phase.value = "idle";
    expect(isSyncing.value).toBe(false);
  });
});

describe("asString", () => {
  it("字符串原样返回", () => {
    expect(asString("x")).toBe("x");
  });
  it("null/undefined 返回空串", () => {
    expect(asString(null)).toBe("");
    expect(asString(undefined)).toBe("");
  });
  it("其他类型转字符串", () => {
    expect(asString(42)).toBe("42");
    expect(asString({ a: 1 })).toBe("[object Object]");
  });
});

describe("withTimeout", () => {
  it("promise 在超时内 resolve 则透传", async () => {
    const result = await withTimeout(Promise.resolve("ok"), "timeout", 1000);
    expect(result).toBe("ok");
  });

  it("promise 超时则 reject 超时消息", async () => {
    const slow = new Promise(() => {}); // 永不 resolve
    await expect(withTimeout(slow, "too slow", 50)).rejects.toThrow("too slow");
  });

  it("promise 先 reject 则透传 reject", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), "timeout", 1000)).rejects.toThrow("boom");
  });
});

describe("wait", () => {
  it("等待后 resolve", async () => {
    const start = Date.now();
    await wait(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });
});

describe("getTypingDuration / getDeletingDuration", () => {
  it("typing 至少 600ms, 按长度 85 倍", () => {
    expect(getTypingDuration("")).toBe(600);
    expect(getTypingDuration("a")).toBe(600); // 1*85=85 < 600
    expect(getTypingDuration("abcdefghij")).toBe(850); // 10*85
  });

  it("deleting 至少 620ms, 按长度 62 倍", () => {
    expect(getDeletingDuration("")).toBe(620);
    expect(getDeletingDuration("abcdefghij")).toBe(620); // 10*62=620
    expect(getDeletingDuration("abcdefghijk")).toBe(682); // 11*62
  });
});

describe("createVisualDelayMs", () => {
  it("是 260", () => {
    expect(createVisualDelayMs).toBe(260);
  });
});