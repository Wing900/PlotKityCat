import { describe, expect, it, beforeEach } from "vitest";
import {
  createEmptyNoteDocument,
  createNotePanelStorage,
  normalizeNoteDocument,
} from "../../src/features/notebook/services/notebookStorage";

describe("notebookStorage", () => {
  beforeEach(() => localStorage.clear());

  it("创建空文档", () => {
    expect(createEmptyNoteDocument()).toEqual({ markdown: "", images: [] });
  });

  it("规范化 markdown 与有效图片", () => {
    expect(normalizeNoteDocument({
      markdown: 42,
      images: [
        { name: "", alt: 1, dataUrl: "data:image/png;base64,x", relativePath: "img/a.png" },
        { name: "invalid", dataUrl: "" },
        "invalid",
      ],
    })).toEqual({
      markdown: "",
        images: [{ name: "", alt: "", dataUrl: "data:image/png;base64,x", relativePath: "img/a.png" }],
    });
  });

  it("持久化 note panel 状态，缺省值保持打开", () => {
    const storage = createNotePanelStorage();
    expect(storage.loadPanelState()).toBe(true);
    storage.savePanelState(false);
    expect(storage.loadPanelState()).toBe(false);
    storage.savePanelState(true);
    expect(storage.loadPanelState()).toBe(true);
  });
});
