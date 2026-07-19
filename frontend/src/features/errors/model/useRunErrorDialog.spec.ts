import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRunErrorDialog } from "./useRunErrorDialog";

describe("useRunErrorDialog", () => {
  let clipboardSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: clipboardSpy },
      configurable: true,
    });
  });

  it("openRunErrorDialog 设置错误文本 + 可修性 + 修复场景", () => {
    const d = useRunErrorDialog();
    d.openRunErrorDialog("err msg", {
      repairable: true,
      repairSceneName: "scene.py",
      repairText: "raw traceback",
    });
    expect(d.isRunErrorDialogOpen.value).toBe(true);
    expect(d.runErrorText.value).toBe("err msg");
    expect(d.isRunErrorRepairable.value).toBe(true);
    expect(d.runErrorRepairSceneName.value).toBe("scene.py");
    expect(d.runErrorRepairText.value).toBe("raw traceback");
    expect(d.isRunErrorCopied.value).toBe(false);
  });

  it("openRunErrorDialog 默认 repairText 回退到 errorText", () => {
    const d = useRunErrorDialog();
    d.openRunErrorDialog("main err");
    expect(d.runErrorRepairText.value).toBe("main err");
    expect(d.isRunErrorRepairable.value).toBe(false);
  });

  it("openRunErrorDialog repairSceneName 被 trim", () => {
    const d = useRunErrorDialog();
    d.openRunErrorDialog("e", { repairSceneName: "  scene.py  " });
    expect(d.runErrorRepairSceneName.value).toBe("scene.py");
  });

  it("closeRunErrorDialog 关弹窗 + 清修复状态 (保留 runErrorText)", () => {
    const d = useRunErrorDialog();
    d.openRunErrorDialog("err", { repairable: true, repairSceneName: "s" });
    d.closeRunErrorDialog();
    expect(d.isRunErrorDialogOpen.value).toBe(false);
    expect(d.isRunErrorRepairable.value).toBe(false);
    expect(d.runErrorRepairSceneName.value).toBe("");
    expect(d.runErrorRepairText.value).toBe("");
    // closeRunErrorDialog 不清 runErrorText (需 clearRunError 才清)
    expect(d.runErrorText.value).toBe("err");
  });

  it("clearRunError 只清文本不关弹窗", () => {
    const d = useRunErrorDialog();
    d.openRunErrorDialog("err");
    d.clearRunError();
    expect(d.isRunErrorDialogOpen.value).toBe(true); // 仍开
    expect(d.runErrorText.value).toBe("");
    expect(d.runErrorRepairText.value).toBe("");
  });

  it("copyRunError 空文本不复制", async () => {
    const d = useRunErrorDialog();
    await d.copyRunError();
    expect(clipboardSpy).not.toHaveBeenCalled();
    expect(d.isRunErrorCopied.value).toBe(false);
  });

  it("copyRunError 复制成功后置 copied 标志", async () => {
    const d = useRunErrorDialog();
    d.openRunErrorDialog("err text");
    await d.copyRunError();
    expect(clipboardSpy).toHaveBeenCalledWith("err text");
    expect(d.isRunErrorCopied.value).toBe(true);
  });
});