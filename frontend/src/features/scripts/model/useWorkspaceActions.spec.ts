import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useWorkspaceActions } from "./useWorkspaceActions";
import type { WorkspacePhase } from "./scriptWorkspaceUtils";

function makeOpts(overrides: Record<string, unknown> = {}) {
  return {
    applyWorkspaceSnapshot: vi.fn(),
    currentWorkspace: ref("ws-a"),
    onError: vi.fn(),
    repository: {
      createWorkspace: vi.fn(async (name: string) => ({ currentFile: "", scripts: [], currentWorkspace: name })),
      deleteWorkspace: vi.fn(async () => ({ currentFile: "", scripts: [], currentWorkspace: "ws-a" })),
      renameWorkspace: vi.fn(async (_o: string, n: string) => ({ currentFile: "", scripts: [], currentWorkspace: n })),
      switchWorkspace: vi.fn(async (name: string) => ({ currentFile: "", scripts: [], currentWorkspace: name })),
    },
    saveCurrentScript: vi.fn(async () => undefined),
    workspaces: ref([
      { name: "ws-a", sceneCount: 1 },
      { name: "新手引导", sceneCount: 1 },
    ]),
    workspacePhase: ref<WorkspacePhase>("idle"),
    ...overrides,
  };
}

describe("useWorkspaceActions", () => {
  it("switchWorkspace 同名/空名/非 idle 跳过", async () => {
    const opts = makeOpts();
    const a = useWorkspaceActions(opts);
    await a.switchWorkspace("ws-a");
    await a.switchWorkspace("  ");
    opts.workspacePhase.value = "syncing";
    await a.switchWorkspace("ws-b");
    expect(opts.repository.switchWorkspace).not.toHaveBeenCalled();
  });

  it("switchWorkspace 成功 save + switch + apply", async () => {
    const opts = makeOpts();
    const a = useWorkspaceActions(opts);
    await a.switchWorkspace("ws-b");
    expect(opts.saveCurrentScript).toHaveBeenCalled();
    expect(opts.repository.switchWorkspace).toHaveBeenCalledWith("ws-b");
    expect(opts.applyWorkspaceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ currentWorkspace: "ws-b" }),
      { preserveDirtyCurrent: false },
    );
    expect(opts.workspacePhase.value).toBe("idle");
  });

  it("switchWorkspace 失败 onError + phase 回 idle", async () => {
    const opts = makeOpts();
    opts.repository.switchWorkspace = vi.fn(async () => { throw new Error("switch fail"); });
    const a = useWorkspaceActions(opts);
    await a.switchWorkspace("ws-b");
    expect(opts.onError).toHaveBeenCalledWith("switch fail");
    expect(opts.workspacePhase.value).toBe("idle");
  });

  it("createWorkspace 成功", async () => {
    const opts = makeOpts();
    const a = useWorkspaceActions(opts);
    await a.createWorkspace("新空间");
    expect(opts.repository.createWorkspace).toHaveBeenCalledWith("新空间");
    expect(opts.applyWorkspaceSnapshot).toHaveBeenCalled();
  });

  it("createWorkspace 空名跳过", async () => {
    const opts = makeOpts();
    const a = useWorkspaceActions(opts);
    await a.createWorkspace("  ");
    expect(opts.repository.createWorkspace).not.toHaveBeenCalled();
  });

  it("renameWorkspace 成功", async () => {
    const opts = makeOpts();
    const a = useWorkspaceActions(opts);
    await a.renameWorkspace("ws-a", "ws-new");
    expect(opts.repository.renameWorkspace).toHaveBeenCalledWith("ws-a", "ws-new");
    expect(opts.applyWorkspaceSnapshot).toHaveBeenCalled();
  });

  it("renameWorkspace 空名跳过", async () => {
    const opts = makeOpts();
    const a = useWorkspaceActions(opts);
    await a.renameWorkspace("ws-a", "");
    expect(opts.repository.renameWorkspace).not.toHaveBeenCalled();
  });

  it("deleteWorkspace 成功", async () => {
    const opts = makeOpts();
    const a = useWorkspaceActions(opts);
    await a.deleteWorkspace("ws-b");
    expect(opts.repository.deleteWorkspace).toHaveBeenCalledWith("ws-b");
    expect(opts.applyWorkspaceSnapshot).toHaveBeenCalled();
  });

  it("deleteWorkspace 非 idle 跳过", async () => {
    const opts = makeOpts();
    opts.workspacePhase.value = "deleting";
    const a = useWorkspaceActions(opts);
    await a.deleteWorkspace("ws-b");
    expect(opts.repository.deleteWorkspace).not.toHaveBeenCalled();
  });
});
