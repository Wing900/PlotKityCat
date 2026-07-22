import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const bridge = vi.hoisted(() => ({
  getScreeningState: vi.fn(async () => ({ active: false })),
  startScreening: vi.fn(async () => ({ active: true, currentSceneName: "main.py", currentIndex: 0 })),
  nextScreeningPage: vi.fn(async () => ({ active: true, currentSceneName: "next.py", currentIndex: 1 })),
  stopScreening: vi.fn(async () => undefined),
}));
const eventHandlers = new Map<string, (...args: unknown[]) => void>();

vi.mock("../../src/features/screening/services/screeningBridgeCompat", () => bridge);
vi.mock("../../wailsjs/runtime/runtime", () => ({
  EventsOn: (name: string, handler: (...args: unknown[]) => void) => {
    eventHandlers.set(name, handler);
    return () => eventHandlers.delete(name);
  },
}));

import { useScreeningWorkspace } from "../../src/features/screening/model/useScreeningWorkspace";

describe("useScreeningWorkspace", () => {
  beforeEach(() => {
    eventHandlers.clear();
    vi.clearAllMocks();
  });

  function mountWorkspace() {
    const currentFile = ref("main.py");
    const scripts = ref(["main.py", "second.py"]);
    const onError = vi.fn();
    let workspace!: ReturnType<typeof useScreeningWorkspace>;
    const component = defineComponent({
      setup() {
        workspace = useScreeningWorkspace({ currentFile, onError, scripts });
        return () => h("div");
      },
    });
    return { workspace, wrapper: mount(component), onError };
  }

  it("初始化并按当前文件预选，切换场景保持 order", async () => {
    const { workspace, wrapper } = mountWorkspace();
    await Promise.resolve();
    workspace.openScreeningDialog();

    expect(workspace.selectedScreeningScenes.value).toEqual(["main.py"]);
    expect(workspace.screeningDialogItems.value).toEqual([
      { sceneName: "main.py", order: 1 },
      { sceneName: "second.py", order: null },
    ]);

    workspace.toggleScreeningScene("second.py");
    expect(workspace.selectedScreeningScenes.value).toEqual(["main.py", "second.py"]);
    workspace.toggleScreeningScene("main.py");
    expect(workspace.selectedScreeningScenes.value).toEqual(["second.py"]);
    wrapper.unmount();
  });

  it("开始、翻页、停止 screening", async () => {
    const { workspace, wrapper } = mountWorkspace();
    workspace.openScreeningDialog();
    await workspace.beginScreening();
    expect(bridge.startScreening).toHaveBeenCalledWith({
      sceneNames: ["main.py"], startIndex: 0, poolSize: 3, animation: "crossfade",
    });
    expect(workspace.isScreeningActive.value).toBe(true);
    expect(workspace.currentScreeningSceneName.value).toBe("main.py");

    await workspace.goToNextScreeningPage();
    expect(workspace.currentScreeningSceneName.value).toBe("next.py");
    await workspace.stopScreening();
    expect(bridge.stopScreening).toHaveBeenCalledOnce();
    expect(workspace.isScreeningActive.value).toBe(false);
    wrapper.unmount();
  });

  it("忽略空选择，并把运行时事件同步到状态", async () => {
    const { workspace, wrapper } = mountWorkspace();
    workspace.openScreeningDialog();
    workspace.toggleScreeningScene("main.py");
    await workspace.beginScreening();
    expect(bridge.startScreening).not.toHaveBeenCalled();

    eventHandlers.get("screening:state")?.({ active: true, currentSceneName: "event.py", currentIndex: 2 });
    expect(workspace.currentScreeningSceneName.value).toBe("event.py");
    expect(workspace.currentScreeningIndex.value).toBe(2);
    wrapper.unmount();
  });
});
