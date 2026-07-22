import { ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeScriptRepository } from "../support/fakeScriptRepository";
import { mountScriptWorkspaceMachine } from "../support/mountScriptWorkspaceMachine";

describe("useScriptWorkspaceMachine integration", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("同步工作区后串联选择文件与自动保存", async () => {
    const repository = createFakeScriptRepository();
    const { machine, wrapper } = mountScriptWorkspaceMachine({ repository });
    await machine.syncWorkspace("main.py");

    expect(machine.scripts.value).toEqual(["main.py", "second.py"]);
    expect(machine.currentFile.value).toBe("main.py");
    expect(machine.codeContent.value).toBe("print('a')");

    machine.updateCode("print('edited')");
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.saveScript).toHaveBeenCalledWith("main.py", "print('edited')");

    await machine.selectScript("second.py");
    expect(machine.currentFile.value).toBe("second.py");
    expect(machine.codeContent.value).toBe("print('second')");
    wrapper.unmount();
  });

  it("切换工作区时保存当前文件，并加载目标快照", async () => {
    const repository = createFakeScriptRepository();
    const { machine, wrapper } = mountScriptWorkspaceMachine({ repository });
    await machine.syncWorkspace("main.py");
    machine.updateCode("print('before switch')");
    await machine.switchWorkspace("workspace-b");

    expect(repository.saveScript).toHaveBeenCalledWith("main.py", "print('before switch')");
    expect(machine.currentWorkspace.value).toBe("workspace-b");
    expect(machine.currentFile.value).toBe("other.py");
    expect(machine.codeContent.value).toBe("print('b')");
    wrapper.unmount();
  });

  it("创建、重命名、排序、删除场景后保持列表与当前文件一致", async () => {
    const repository = createFakeScriptRepository();
    const { machine, wrapper } = mountScriptWorkspaceMachine({ repository });
    await machine.syncWorkspace("main.py");

    const creating = machine.createScript("created.py");
    await vi.advanceTimersByTimeAsync(300);
    await creating;
    await machine.renameScript("created.py", "renamed.py");
    await machine.reorderScripts(["renamed.py", "second.py", "main.py"]);

    expect(machine.currentFile.value).toBe("renamed.py");
    expect(machine.scripts.value).toEqual(["renamed.py", "second.py", "main.py"]);

    const deleting = machine.deleteScript("renamed.py");
    await vi.advanceTimersByTimeAsync(2000);
    await deleting;
    expect(machine.scripts.value).not.toContain("renamed.py");
    wrapper.unmount();
  });

  it("工作区创建、重命名、删除链路更新当前工作区", async () => {
    const repository = createFakeScriptRepository();
    const { machine, wrapper } = mountScriptWorkspaceMachine({ repository });
    await machine.syncWorkspace("main.py");

    await machine.createWorkspace("workspace-c");
    await machine.renameWorkspace("workspace-c", "workspace-renamed");
    await machine.deleteWorkspace("workspace-renamed");

    expect(machine.currentWorkspace.value).toBe("workspace-a");
    wrapper.unmount();
  });

  it("同步暂停时不触发自动保存，恢复后继续保存", async () => {
    const repository = createFakeScriptRepository();
    const isSyncPaused = ref(true);
    const { machine, wrapper } = mountScriptWorkspaceMachine({ repository, isSyncPaused });
    await machine.syncWorkspace("main.py");
    machine.updateCode("print('paused')");

    await vi.advanceTimersByTimeAsync(1000);
    expect(repository.saveScript).not.toHaveBeenCalled();

    isSyncPaused.value = false;
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.saveScript).toHaveBeenCalledWith("main.py", "print('paused')");
    wrapper.unmount();
  });
});
