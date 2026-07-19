import { describe, it, expect } from "vitest";
import { useRuntimeState } from "./useRuntimeState";

describe("useRuntimeState", () => {
  it("初始状态: initializing + 非 ready", () => {
    const r = useRuntimeState();
    expect(r.isInitializing.value).toBe(true);
    expect(r.environmentStatus.value.ready).toBe(false);
    expect(r.initProgressPercent.value).toBe(0);
  });

  it("applyEnvironmentStatus 映射字段 + 默认值", () => {
    const r = useRuntimeState();
    r.applyEnvironmentStatus({
      ready: true,
      code: "ok",
      severity: "info",
      summary: "Ready",
      recommendedAction: "none",
      items: [{ key: "python" }],
      missing: [],
      canRebuild: true,
      runtimeArchiveExists: true,
    });
    expect(r.environmentStatus.value.ready).toBe(true);
    expect(r.environmentStatus.value.code).toBe("ok");
    expect(r.environmentStatus.value.summary).toBe("Ready");
    expect(r.environmentStatus.value.canRebuild).toBe(true);
    expect(r.environmentStatus.value.items).toEqual([{ key: "python" }]);
  });

  it("applyEnvironmentStatus 缺失字段用默认", () => {
    const r = useRuntimeState();
    r.applyEnvironmentStatus({});
    expect(r.environmentStatus.value.code).toBe("unknown");
    expect(r.environmentStatus.value.severity).toBe("error");
    expect(r.environmentStatus.value.items).toEqual([]);
    expect(r.environmentStatus.value.missing).toEqual([]);
  });

  it("applyProgress 更新 percent/message", () => {
    const r = useRuntimeState();
    r.applyProgress({ percent: 42, message: "extracting" });
    expect(r.initProgressPercent.value).toBe(42);
    expect(r.initProgressMessage.value).toBe("extracting");
  });

  it("applyProgress 只更新提供的字段", () => {
    const r = useRuntimeState();
    r.applyProgress({ percent: 10, message: "a" });
    r.applyProgress({ percent: 20 });
    expect(r.initProgressPercent.value).toBe(20);
    expect(r.initProgressMessage.value).toBe("a");
  });

  it("finishInitialization 置 100% + 结束 initializing", () => {
    const r = useRuntimeState();
    r.finishInitialization("done");
    expect(r.initProgressPercent.value).toBe(100);
    expect(r.initProgressMessage.value).toBe("done");
    expect(r.isInitializing.value).toBe(false);
  });

  it("failInitialization 结束 initializing 保留 message", () => {
    const r = useRuntimeState();
    r.failInitialization("boom");
    expect(r.initProgressMessage.value).toBe("boom");
    expect(r.isInitializing.value).toBe(false);
  });
});