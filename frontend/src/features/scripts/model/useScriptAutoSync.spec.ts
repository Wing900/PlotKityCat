import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useScriptAutoSync } from "./useScriptAutoSync";
import type { WorkspacePhase } from "./scriptWorkspaceUtils";

function makeOpts(overrides: Record<string, unknown> = {}) {
  return {
    codeContent: ref("dirty"),
    currentFile: ref("scene.py"),
    isSyncPaused: ref(false),
    lastLoadedCode: ref("clean"),
    onAutoSaveError: vi.fn(),
    repository: {
      saveScript: vi.fn(async () => undefined),
    },
    syncWorkspace: vi.fn(async () => undefined),
    workspacePhase: ref<WorkspacePhase>("idle"),
    ...overrides,
  };
}

describe("useScriptAutoSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("startAutoSync 脏代码 500ms 后自动保存", async () => {
    const opts = makeOpts();
    const s = useScriptAutoSync(opts);
    s.startAutoSync();
    await vi.advanceTimersByTimeAsync(500);
    expect(opts.repository.saveScript).toHaveBeenCalledWith("scene.py", "dirty");
    // then 更新 lastLoadedCode
    await Promise.resolve();
    expect(opts.lastLoadedCode.value).toBe("dirty");
    s.stopAutoSync();
  });

  it("代码未脏不保存", async () => {
    const opts = makeOpts();
    opts.codeContent.value = "same";
    opts.lastLoadedCode.value = "same";
    const s = useScriptAutoSync(opts);
    s.startAutoSync();
    await vi.advanceTimersByTimeAsync(500);
    expect(opts.repository.saveScript).not.toHaveBeenCalled();
    s.stopAutoSync();
  });

  it("isSyncPaused 时不保存", async () => {
    const opts = makeOpts();
    opts.isSyncPaused.value = true;
    const s = useScriptAutoSync(opts);
    s.startAutoSync();
    await vi.advanceTimersByTimeAsync(500);
    expect(opts.repository.saveScript).not.toHaveBeenCalled();
    s.stopAutoSync();
  });

  it("workspacePhase 非 idle 时不保存", async () => {
    const opts = makeOpts();
    opts.workspacePhase.value = "syncing";
    const s = useScriptAutoSync(opts);
    s.startAutoSync();
    await vi.advanceTimersByTimeAsync(500);
    expect(opts.repository.saveScript).not.toHaveBeenCalled();
    s.stopAutoSync();
  });

  it("2000ms 后 syncWorkspace", async () => {
    const opts = makeOpts();
    const s = useScriptAutoSync(opts);
    s.startAutoSync();
    await vi.advanceTimersByTimeAsync(2000);
    expect(opts.syncWorkspace).toHaveBeenCalledWith("scene.py", { preserveDirtyCurrent: true });
    s.stopAutoSync();
  });

  it("saveScript 失败调 onAutoSaveError", async () => {
    const opts = makeOpts();
    opts.repository.saveScript = vi.fn(async () => { throw new Error("save fail"); });
    const s = useScriptAutoSync(opts);
    s.startAutoSync();
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    expect(opts.onAutoSaveError).toHaveBeenCalled();
    s.stopAutoSync();
  });

  it("stopAutoSync 后不再触发", async () => {
    const opts = makeOpts();
    const s = useScriptAutoSync(opts);
    s.startAutoSync();
    s.stopAutoSync();
    await vi.advanceTimersByTimeAsync(3000);
    expect(opts.repository.saveScript).not.toHaveBeenCalled();
    expect(opts.syncWorkspace).not.toHaveBeenCalled();
  });
});