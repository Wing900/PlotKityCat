import { describe, it, expect, vi, afterEach } from "vitest";
import { installZoomGuards } from "./zoomGuards";

// installZoomGuards 不返回 cleanup, 用 afterEach 累积监听器不影响断言结果
const listeners: Array<() => void> = [];

afterEach(() => {
  listeners.forEach((fn) => fn());
  listeners.length = 0;
});

function fireWheel(ctrlKey: boolean): boolean {
  const evt = new WheelEvent("wheel", { ctrlKey, cancelable: true });
  window.dispatchEvent(evt);
  return evt.defaultPrevented;
}

function fireKey(ctrlKey: boolean, key: string): KeyboardEvent {
  const evt = new KeyboardEvent("keydown", { ctrlKey, key, cancelable: true, bubbles: true });
  Object.defineProperty(evt, "preventDefault", { value: vi.fn() });
  window.dispatchEvent(evt);
  return evt;
}

describe("installZoomGuards", () => {
  it("ctrl+wheel 被 preventDefault, 无 ctrl 不拦截", () => {
    installZoomGuards();
    expect(fireWheel(true)).toBe(true);
    expect(fireWheel(false)).toBe(false);
  });

  it("ctrl+0 清空 documentElement 和 body 的 zoom", () => {
    document.documentElement.style.zoom = "1.5";
    document.body.style.zoom = "1.5";
    installZoomGuards();
    fireKey(true, "0");
    expect(document.documentElement.style.zoom).toBe("");
    expect(document.body.style.zoom).toBe("");
  });

  it("ctrl+其他键不动 zoom", () => {
    document.documentElement.style.zoom = "1.5";
    installZoomGuards();
    fireKey(true, "+");
    expect(document.documentElement.style.zoom).toBe("1.5");
  });

  it("无 ctrl 不动 zoom", () => {
    document.documentElement.style.zoom = "1.5";
    installZoomGuards();
    fireKey(false, "0");
    expect(document.documentElement.style.zoom).toBe("1.5");
  });
});