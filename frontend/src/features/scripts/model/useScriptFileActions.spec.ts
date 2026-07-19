import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useScriptFileActions } from "./useScriptFileActions";
import type { WorkspacePhase } from "./scriptWorkspaceUtils";

function makeOpts(overrides: Record<string, unknown> = {}) {
  return {
    applyWorkspaceSnapshot: vi.fn(),
    codeContent: ref("code"),
    currentFile: ref("current.py"),
    isRunning: ref(false),
    lastLoadedCode: ref("code"),
    onError: vi.fn(),
    repository: {
      createScript: vi.fn(async (name: string) => ({ filename: name, code: "# new" })),
      deleteScript: vi.fn(async () => ({ currentFile: "", scripts: [], document: { code: "" } })),
      getScriptContent: vi.fn(async (name: string) => ({ filename: name, code: "loaded" })),
      reorderScripts: vi.fn(async () => ({ currentFile: "current.py", scripts: [], document: { code: "code" } })),
      renameScript: vi.fn(async (_o: string, n: string) => ({ currentFile: n, scripts: [n], document: { code: "code" } })),
      saveAndRun: vi.fn(async () => undefined),
      saveScript: vi.fn(async () => undefined),
    },
    selectionStorage: { load: vi.fn(() => "") },
    syncWorkspace: vi.fn(async () => ({ currentFile: "created.py", scripts: ["created.py"], document: { code: "# new" } })),
    workspacePhase: ref<WorkspacePhase>("idle"),
    ...overrides,
  };
}

describe("useScriptFileActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("selectScript 同文件不操作", async () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    await a.selectScript("current.py");
    expect(opts.repository.getScriptContent).not.toHaveBeenCalled();
  });

  it("selectScript 切换文件: save + load", async () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    await a.selectScript("other.py");
    expect(opts.repository.saveScript).toHaveBeenCalledWith("current.py", "code");
    expect(opts.repository.getScriptContent).toHaveBeenCalledWith("other.py");
    expect(opts.currentFile.value).toBe("other.py");
    expect(opts.codeContent.value).toBe("loaded");
  });

  it("selectScript 失败调 onError", async () => {
    const opts = makeOpts();
    opts.repository.getScriptContent = vi.fn(async () => { throw new Error("fail"); });
    const a = useScriptFileActions(opts);
    await a.selectScript("other.py");
    expect(opts.onError).toHaveBeenCalledWith("fail");
  });

  it("createScript 空名/非 idle 跳过", async () => {
    const opts = makeOpts();
    opts.workspacePhase.value = "syncing";
    const a = useScriptFileActions(opts);
    await a.createScript("x.py");
    expect(opts.repository.createScript).not.toHaveBeenCalled();
  });

  it("createScript 成功后设 typing 动画名 + 切文件", async () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    const p = a.createScript("new.py");
    await vi.advanceTimersByTimeAsync(300);
    await p;
    expect(opts.repository.createScript).toHaveBeenCalledWith("new.py");
    expect(opts.workspacePhase.value).toBe("idle");
    expect(opts.currentFile.value).toBe("created.py");
  });

  it("openCreateDialog / closeCreateDialog", () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    a.openCreateDialog();
    expect(a.isCreateDialogOpen.value).toBe(true);
    a.closeCreateDialog();
    expect(a.isCreateDialogOpen.value).toBe(false);
  });

  it("openCreateDialog 非 idle 不打开", () => {
    const opts = makeOpts();
    opts.workspacePhase.value = "creating";
    const a = useScriptFileActions(opts);
    a.openCreateDialog();
    expect(a.isCreateDialogOpen.value).toBe(false);
  });

  it("updateCode 更新 codeContent", () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    a.updateCode("x=1");
    expect(opts.codeContent.value).toBe("x=1");
  });

  it("saveCurrentScript 无 currentFile 跳过", async () => {
    const opts = makeOpts();
    opts.currentFile.value = "";
    const a = useScriptFileActions(opts);
    await a.saveCurrentScript();
    expect(opts.repository.saveScript).not.toHaveBeenCalled();
  });

  it("saveCurrentScript 保存并更新 lastLoadedCode", async () => {
    const opts = makeOpts();
    opts.codeContent.value = "saved-code";
    const a = useScriptFileActions(opts);
    await a.saveCurrentScript();
    expect(opts.repository.saveScript).toHaveBeenCalledWith("current.py", "saved-code");
    expect(opts.lastLoadedCode.value).toBe("saved-code");
  });

  it("renameScript 成功 applyWorkspaceSnapshot", async () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    await a.renameScript("old.py", "new.py");
    expect(opts.repository.renameScript).toHaveBeenCalledWith("old.py", "new.py");
    expect(opts.applyWorkspaceSnapshot).toHaveBeenCalled();
    expect(opts.workspacePhase.value).toBe("idle");
  });

  it("renameScript 空名/非 idle 跳过", async () => {
    const opts = makeOpts();
    opts.workspacePhase.value = "renaming";
    const a = useScriptFileActions(opts);
    await a.renameScript("old.py", "new.py");
    expect(opts.repository.renameScript).not.toHaveBeenCalled();
  });

  it("reorderScripts 空列表跳过", async () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    await a.reorderScripts([]);
    expect(opts.repository.reorderScripts).not.toHaveBeenCalled();
  });

  it("reorderScripts 成功 apply preserveDirty", async () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    await a.reorderScripts(["b.py", "a.py"]);
    expect(opts.repository.reorderScripts).toHaveBeenCalledWith(["b.py", "a.py"], "current.py");
    expect(opts.applyWorkspaceSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      { preserveDirtyCurrent: true },
    );
  });

  it("deleteScript 成功删除", async () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    const p = a.deleteScript("other.py");
    await vi.advanceTimersByTimeAsync(2000);
    await p;
    expect(opts.repository.deleteScript).toHaveBeenCalledWith("other.py");
    expect(opts.applyWorkspaceSnapshot).toHaveBeenCalled();
    expect(opts.workspacePhase.value).toBe("idle");
  });

  it("runCurrentScript 调 saveAndRun", async () => {
    const opts = makeOpts();
    const a = useScriptFileActions(opts);
    await a.runCurrentScript();
    expect(opts.repository.saveAndRun).toHaveBeenCalledWith("current.py", "code");
  });

  it("runCurrentScript 失败置 isRunning=false + onError", async () => {
    const opts = makeOpts();
    opts.repository.saveAndRun = vi.fn(async () => { throw new Error("run fail"); });
    const a = useScriptFileActions(opts);
    await a.runCurrentScript();
    expect(opts.isRunning.value).toBe(false);
    expect(opts.onError).toHaveBeenCalledWith("run fail");
  });

  it("startCurrentRun 无文件或 isRunning 跳过", async () => {
    const opts = makeOpts();
    opts.isRunning.value = true;
    const a = useScriptFileActions(opts);
    await a.startCurrentRun();
    expect(opts.repository.saveAndRun).not.toHaveBeenCalled();
  });
});