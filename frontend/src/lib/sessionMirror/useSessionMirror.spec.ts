import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

// mock wailsjs runtime, 捕获 EventsOn 回调以便测试手动触发事件
const eventHandlers = new Map<string, (...args: unknown[]) => void>();
vi.mock("../../../wailsjs/runtime/runtime", () => ({
  EventsOn: (name: string, cb: (...args: unknown[]) => void) => {
    eventHandlers.set(name, cb);
    return () => eventHandlers.delete(name);
  },
}));

import { useSessionMirror, type SessionMirrorConfig } from "./useSessionMirror";

const flush = () => new Promise(r => setTimeout(r, 0));

function makeConfig(overrides: Partial<SessionMirrorConfig> = {}): SessionMirrorConfig {
  return {
    startBridge: vi.fn(async () => ({ sessionId: "s1" })),
    stopBridge: vi.fn(async () => undefined),
    busyMessage: "busy",
    routes: [
      { eventName: "started", handle: () => undefined },
      { eventName: "done", handle: (e) => ({ ok: true, id: e.sessionId }) },
    ],
    fallbackInterruptedResult: (id) => ({ interrupted: true, id }),
    ...overrides,
  };
}

beforeEach(() => eventHandlers.clear());

describe("useSessionMirror", () => {
  it("startSession 绑事件并挂起直到终态", async () => {
    const m = useSessionMirror(makeConfig());
    const pending = m.startSession({}, {});
    await flush();
    expect(m.isSessionActive.value).toBe(true);
    eventHandlers.get("started")!({ sessionId: "s1" }); // 非终态
    expect(m.isSessionActive.value).toBe(true);
    eventHandlers.get("done")!({ sessionId: "s1" }); // 终态
    expect(await pending).toEqual({ ok: true, id: "s1" });
    expect(m.isSessionActive.value).toBe(false);
  });

  it("事件 sessionId 不匹配则忽略", async () => {
    const m = useSessionMirror(makeConfig());
    const pending = m.startSession({}, {});
    await flush();
    eventHandlers.get("done")!({ sessionId: "other" });
    expect(m.isSessionActive.value).toBe(true);
    eventHandlers.get("done")!({ sessionId: "s1" });
    expect(await pending).toEqual({ ok: true, id: "s1" });
  });

  it("busy 时再 start 抛 busyMessage", async () => {
    const m = useSessionMirror(makeConfig());
    m.startSession({}, {});
    await flush();
    await expect(m.startSession({}, {})).rejects.toThrow("busy");
  });

  it("startBridge 抛错触发 onStartError 并 rethrow", async () => {
    const onStartError = vi.fn();
    const cfg = makeConfig({
      startBridge: vi.fn(async () => { throw new Error("boom"); }),
      onStartError,
    });
    await expect(useSessionMirror(cfg).startSession({}, {})).rejects.toThrow("boom");
    expect(onStartError).toHaveBeenCalledOnce();
  });

  it("stopActiveSession 调 stopBridge(sessionId)", async () => {
    const stopBridge = vi.fn(async () => undefined);
    const m = useSessionMirror(makeConfig({ stopBridge }));
    m.startSession({}, {});
    await flush();
    await m.stopActiveSession();
    expect(stopBridge).toHaveBeenCalledWith("s1");
  });

  it("onSettle 在终态时触发一次", async () => {
    const onSettle = vi.fn();
    const m = useSessionMirror(makeConfig({ onSettle }));
    const pending = m.startSession({}, {});
    await flush();
    eventHandlers.get("done")!({ sessionId: "s1" });
    await pending;
    expect(onSettle).toHaveBeenCalledOnce();
  });

  it("safeCall 默认吞错不阻断 settle", async () => {
    const m = useSessionMirror(makeConfig({
      routes: [{
        eventName: "done",
        handle: (_e, ctx) => { ctx.safeCall(() => { throw new Error("x"); }); return "ok"; },
      }],
    }));
    const pending = m.startSession({}, {});
    await flush();
    eventHandlers.get("done")!({ sessionId: "s1" });
    expect(await pending).toBe("ok");
  });

  it("onUnmounted 兜底: 解绑事件 + stopBridge + fallback resolve", async () => {
    const stopBridge = vi.fn(async () => undefined);
    const fallback = vi.fn((id) => ({ interrupted: true, id }));
    const cfg = makeConfig({ stopBridge, fallbackInterruptedResult: fallback });
    const wrapper = mount({
      setup: () => {
        useSessionMirror(cfg).startSession({}, {});
        return () => null;
      },
    });
    await flush();
    expect(eventHandlers.has("done")).toBe(true);
    wrapper.unmount();
    expect(eventHandlers.has("done")).toBe(false);
    expect(stopBridge).toHaveBeenCalledWith("s1");
    expect(fallback).toHaveBeenCalled();
  });
});