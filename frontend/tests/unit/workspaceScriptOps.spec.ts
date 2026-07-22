import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useWorkspaceScriptOps } from "../../src/features/plot/model/workspace/useWorkspaceScriptOps";

describe("useWorkspaceScriptOps", () => {
  function createOps() {
    const scriptWorkspace = {
      currentFile: ref("main.py"),
      createScript: vi.fn(async () => undefined),
      renameScript: vi.fn(async () => undefined),
      deleteScript: vi.fn(async () => undefined),
      switchWorkspace: vi.fn(async () => undefined),
      createWorkspace: vi.fn(async () => undefined),
      renameWorkspace: vi.fn(async () => undefined),
      deleteWorkspace: vi.fn(async () => undefined),
      selectScript: vi.fn(async () => undefined),
    };
    const noteWorkspace = { flushPendingSave: vi.fn(async () => undefined) };
    return { scriptWorkspace, noteWorkspace, ops: useWorkspaceScriptOps({ scriptWorkspace: scriptWorkspace as never, noteWorkspace: noteWorkspace as never }) };
  }

  it("切换与工作区写操作先 flush 当前笔记", async () => {
    const { ops, scriptWorkspace, noteWorkspace } = createOps();
    await ops.switchWorkspace("workspace-b");
    await ops.createWorkspace("workspace-c");
    await ops.renameWorkspace("a", "b");
    await ops.deleteWorkspace("workspace-b");

    expect(noteWorkspace.flushPendingSave).toHaveBeenCalledTimes(4);
    expect(noteWorkspace.flushPendingSave).toHaveBeenCalledWith("main.py");
    expect(scriptWorkspace.switchWorkspace).toHaveBeenCalledWith("workspace-b");
  });

  it("场景操作直接转发，不触发笔记保存", async () => {
    const { ops, scriptWorkspace, noteWorkspace } = createOps();
    await ops.createScript("new.py");
    await ops.renameScript("main.py", "renamed.py");
    await ops.deleteScript("renamed.py");
    await ops.selectScript("other.py");

    expect(noteWorkspace.flushPendingSave).not.toHaveBeenCalled();
    expect(scriptWorkspace.createScript).toHaveBeenCalledWith("new.py");
    expect(scriptWorkspace.selectScript).toHaveBeenCalledWith("other.py");
  });
});
