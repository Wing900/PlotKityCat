import { ref } from "vue";
import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspacePaneLayout } from "../../src/features/plot/model/workspace/useWorkspacePaneLayout";

describe("useWorkspacePaneLayout", () => {
  beforeEach(() => localStorage.clear());

  function createLayout(isPanelOpen = true) {
    const noteWorkspace = { isPanelOpen: ref(isPanelOpen), setPanelOpen: (open: boolean) => { noteWorkspace.isPanelOpen.value = open; } };
    return { noteWorkspace, layout: useWorkspacePaneLayout({ noteWorkspace: noteWorkspace as never }) };
  }

  it("根据持久化布局初始化并同步 note panel", () => {
    localStorage.setItem("plotkitycat:workspace:layout-mode", "note");
    const { layout, noteWorkspace } = createLayout(false);
    expect(layout.workspaceLayoutMode.value).toBe("note");
    layout.setWorkspaceLayoutMode("code");
    expect(noteWorkspace.isPanelOpen.value).toBe(false);
    layout.showSplitPane();
    expect(noteWorkspace.isPanelOpen.value).toBe(true);
  });

  it("切换 code 与 note pane", () => {
    const { layout } = createLayout();
    layout.toggleCodePane();
    expect(layout.workspaceLayoutMode.value).toBe("code");
    layout.toggleCodePane();
    expect(layout.workspaceLayoutMode.value).toBe("split");
    layout.toggleNotePane();
    expect(layout.workspaceLayoutMode.value).toBe("note");
    layout.toggleNotePane();
    expect(layout.workspaceLayoutMode.value).toBe("split");
  });
});
