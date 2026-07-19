import { describe, it, expect, vi } from "vitest";
import { usePackageTransfer } from "./usePackageTransfer";

function makeOpts(overrides: Record<string, unknown> = {}) {
  return {
    noteWorkspace: {
      flushPendingSave: vi.fn(async () => undefined),
      hydrateFromScriptDocument: vi.fn(),
    },
    onError: vi.fn(),
    scriptRepository: {
      exportScenePackage: vi.fn(async () => ({ path: "C:/out.pkc" })),
      importScenePackage: vi.fn(async () => ({
        cancelled: false,
        workspace: {
          currentFile: "imported.py",
          scripts: ["imported.py"],
          document: { code: "x", noteMarkdown: "n", noteImages: [] },
        },
      })),
      importScenePackageFromPath: vi.fn(async () => ({
        cancelled: false,
        workspace: {
          currentFile: "dropped.py",
          scripts: ["dropped.py"],
          document: { code: "y", noteMarkdown: "", noteImages: [] },
        },
      })),
    },
    scriptWorkspace: {
      applyWorkspaceSnapshot: vi.fn(),
      currentFile: { value: "scene.py" },
      saveCurrentScript: vi.fn(async () => undefined),
    },
    ...overrides,
  };
}

describe("usePackageTransfer", () => {
  it("open/close 对话框", () => {
    const p = usePackageTransfer(makeOpts());
    p.openPackageTransferDialog();
    expect(p.isPackageTransferDialogOpen.value).toBe(true);
    p.closePackageTransferDialog();
    expect(p.isPackageTransferDialogOpen.value).toBe(false);
  });

  it("exportCurrentScenePackage 无 currentFile 跳过", async () => {
    const opts = makeOpts();
    opts.scriptWorkspace.currentFile.value = "";
    const p = usePackageTransfer(opts);
    await p.exportCurrentScenePackage();
    expect(opts.scriptRepository.exportScenePackage).not.toHaveBeenCalled();
  });

  it("exportCurrentScenePackage 成功写路径消息", async () => {
    const opts = makeOpts();
    const p = usePackageTransfer(opts);
    await p.exportCurrentScenePackage();
    expect(opts.scriptWorkspace.saveCurrentScript).toHaveBeenCalled();
    expect(opts.noteWorkspace.flushPendingSave).toHaveBeenCalledWith("scene.py");
    expect(opts.scriptRepository.exportScenePackage).toHaveBeenCalledWith("scene.py");
    expect(p.packageTransferMessage.value).toContain("C:/out.pkc");
    expect(p.packageTransferPendingAction.value).toBe("");
  });

  it("exportCurrentScenePackage 失败写错误消息 + onError", async () => {
    const opts = makeOpts();
    opts.scriptRepository.exportScenePackage = vi.fn(async () => { throw new Error("disk full"); });
    const p = usePackageTransfer(opts);
    await p.exportCurrentScenePackage();
    expect(p.packageTransferMessage.value).toBe("disk full");
    expect(opts.onError).toHaveBeenCalledWith("disk full");
  });

  it("importScenePackage 成功 apply + hydrate", async () => {
    const opts = makeOpts();
    const p = usePackageTransfer(opts);
    await p.importScenePackage();
    expect(opts.scriptRepository.importScenePackage).toHaveBeenCalled();
    expect(opts.scriptWorkspace.applyWorkspaceSnapshot).toHaveBeenCalled();
    expect(opts.noteWorkspace.hydrateFromScriptDocument).toHaveBeenCalled();
  });

  it("importScenePackage cancelled 不 apply", async () => {
    const opts = makeOpts();
    opts.scriptRepository.importScenePackage = vi.fn(async () => ({ cancelled: true }));
    const p = usePackageTransfer(opts);
    await p.importScenePackage();
    expect(opts.scriptWorkspace.applyWorkspaceSnapshot).not.toHaveBeenCalled();
  });

  it("importScenePackageFromPath 成功", async () => {
    const opts = makeOpts();
    const p = usePackageTransfer(opts);
    await p.importScenePackageFromPath("C:/drop.pkc");
    expect(opts.scriptRepository.importScenePackageFromPath).toHaveBeenCalledWith("C:/drop.pkc");
    expect(opts.scriptWorkspace.applyWorkspaceSnapshot).toHaveBeenCalled();
  });

  it("closePackageTransferDialog 在 pending 时不关", async () => {
    const opts = makeOpts();
    // 卡住 save, 让 pending 先被置为 export
    let resolveSave!: () => void;
    opts.scriptWorkspace.saveCurrentScript = vi.fn(
      () => new Promise<void>((r) => { resolveSave = r; }),
    );
    const p = usePackageTransfer(opts);
    p.openPackageTransferDialog();
    const exportP = p.exportCurrentScenePackage();
    await Promise.resolve(); // flush 到 pending 赋值
    expect(p.packageTransferPendingAction.value).toBe("export");
    p.closePackageTransferDialog();
    expect(p.isPackageTransferDialogOpen.value).toBe(true);
    resolveSave();
    await exportP;
  });
});