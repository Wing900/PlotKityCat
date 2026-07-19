import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useAIRunErrorRepair } from "./useAIRunErrorRepair";

function makeOpts(overrides: Record<string, unknown> = {}) {
  return {
    codeContent: ref("current-code"),
    currentFile: ref("current.py"),
    errorDialog: {
      closeRunErrorDialog: vi.fn(),
      openRunErrorDialog: vi.fn(),
      runErrorRepairSceneName: ref("current.py"),
      runErrorRepairText: ref("traceback"),
      runErrorText: ref("err"),
    },
    loadSceneCode: vi.fn(async (s: string) => `code-of-${s}`),
    startWorkflow: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("useAIRunErrorRepair", () => {
  it("无 repairSceneName 且无 currentFile 跳过", async () => {
    const opts = makeOpts();
    opts.currentFile.value = "";
    opts.errorDialog.runErrorRepairSceneName.value = "";
    const r = useAIRunErrorRepair(opts);
    await r.repairCurrentRunError();
    expect(opts.startWorkflow).not.toHaveBeenCalled();
  });

  it("当前场景: 用 codeContent + 关弹窗 + startWorkflow", async () => {
    const opts = makeOpts();
    const r = useAIRunErrorRepair(opts);
    await r.repairCurrentRunError();
    expect(opts.errorDialog.closeRunErrorDialog).toHaveBeenCalled();
    expect(opts.startWorkflow).toHaveBeenCalledWith({
      sceneName: "current.py",
      currentCode: "current-code",
      errorText: "traceback",
    });
    expect(opts.loadSceneCode).not.toHaveBeenCalled();
  });

  it("非当前场景: loadSceneCode 加载代码", async () => {
    const opts = makeOpts();
    opts.errorDialog.runErrorRepairSceneName.value = "other.py";
    const r = useAIRunErrorRepair(opts);
    await r.repairCurrentRunError();
    expect(opts.loadSceneCode).toHaveBeenCalledWith("other.py");
    expect(opts.startWorkflow).toHaveBeenCalledWith({
      sceneName: "other.py",
      currentCode: "code-of-other.py",
      errorText: "traceback",
    });
  });

  it("startWorkflow 失败重新打开错误弹窗", async () => {
    const opts = makeOpts({
      startWorkflow: vi.fn(async () => { throw new Error("repair fail"); }),
    });
    const r = useAIRunErrorRepair(opts);
    await r.repairCurrentRunError();
    expect(opts.errorDialog.openRunErrorDialog).toHaveBeenCalledWith("repair fail", {
      repairSceneName: "current.py",
      repairText: "repair fail",
    });
  });

  it("repairText 空时回退到 runErrorText", async () => {
    const opts = makeOpts();
    opts.errorDialog.runErrorRepairText.value = "";
    opts.errorDialog.runErrorText.value = "fallback-err";
    const r = useAIRunErrorRepair(opts);
    await r.repairCurrentRunError();
    expect(opts.startWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ errorText: "fallback-err" }),
    );
  });
});