import { describe, it, expect, vi } from "vitest";
import { useAINoteGeneration } from "./useAINoteGeneration";

function makeOpts(overrides: Partial<{ onError: (m: string) => void; resolveSceneCode: (s: string) => Promise<string>; startWorkflow: (p: { sceneName: string; currentCode: string; selection: unknown }) => Promise<void> }> = {}) {
  return {
    onError: vi.fn(),
    resolveSceneCode: vi.fn(async (s: string) => `code-of-${s}`),
    startWorkflow: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("useAINoteGeneration", () => {
  it("空 sceneName 不触发工作流", async () => {
    const opts = makeOpts();
    const g = useAINoteGeneration(opts);
    await g.runAINoteAction({ kind: "visualize", sceneName: "   ", selection: { items: [{ kind: "text", text: "t" }] } });
    expect(opts.startWorkflow).not.toHaveBeenCalled();
  });

  it("空 selection.items 不触发工作流", async () => {
    const opts = makeOpts();
    const g = useAINoteGeneration(opts);
    await g.runAINoteAction({ kind: "visualize", sceneName: "scene.py", selection: { items: [] } });
    expect(opts.startWorkflow).not.toHaveBeenCalled();
  });

  it("合法请求: resolveSceneCode → startWorkflow 透传", async () => {
    const opts = makeOpts();
    const g = useAINoteGeneration(opts);
    await g.runAINoteAction({
      kind: "visualize",
      sceneName: "scene.py",
      selection: { items: [{ kind: "text", text: "sel" }] },
    });
    expect(opts.resolveSceneCode).toHaveBeenCalledWith("scene.py");
    expect(opts.startWorkflow).toHaveBeenCalledWith({
      sceneName: "scene.py",
      currentCode: "code-of-scene.py",
      selection: { items: [{ kind: "text", text: "sel" }] },
    });
  });

  it("sceneName 被 trim", async () => {
    const opts = makeOpts();
    const g = useAINoteGeneration(opts);
    await g.runAINoteAction({
      kind: "visualize",
      sceneName: "  scene.py  ",
      selection: { items: [{ kind: "text", text: "t" }] },
    });
    expect(opts.resolveSceneCode).toHaveBeenCalledWith("scene.py");
  });

  it("startWorkflow 抛错 → onError 被调", async () => {
    const opts = makeOpts({
      startWorkflow: vi.fn(async () => { throw new Error("boom"); }),
    });
    const g = useAINoteGeneration(opts);
    await g.runAINoteAction({ kind: "visualize", sceneName: "s", selection: { items: [{ kind: "text", text: "t" }] } });
    expect(opts.onError).toHaveBeenCalledWith("boom");
  });

  it("generateCodeFromNoteSelection 调 runAINoteAction with kind=visualize", async () => {
    const opts = makeOpts();
    const g = useAINoteGeneration(opts);
    await g.generateCodeFromNoteSelection({ sceneName: "s", selection: { items: [{ kind: "text", text: "t" }] } });
    expect(opts.startWorkflow).toHaveBeenCalledTimes(1);
  });
});