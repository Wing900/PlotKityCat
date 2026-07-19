import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

// mock scriptBridgeCompat (wailsjs 包装)
vi.mock("../../../scripts/services/scriptBridgeCompat", () => ({
  addScriptNoteImages: vi.fn(async () => ({
    markdown: "md",
    images: [
      { name: "a.png", alt: "a", relativePath: "assets/a.png", dataUrl: "data:x" },
    ],
  })),
  removeScriptNoteImage: vi.fn(async () => ({
    markdown: "md",
    images: [],
  })),
  saveScriptNote: vi.fn(async () => undefined),
}));

vi.mock("../../services/notebookStorage", () => ({
  normalizeNoteDocument: (doc: unknown) => doc,
}));

import { useNoteImages } from "./useNoteImages";
import {
  addScriptNoteImages,
  removeScriptNoteImage,
  saveScriptNote,
} from "../../../scripts/services/scriptBridgeCompat";

function makeFile(name: string, type = "image/png") {
  return new File(["x"], name, { type });
}

// FileReader mock for jsdom
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(_file: File) {
    this.result = "data:image/png;base64,xxx";
    queueMicrotask(() => this.onload?.());
  }
}
// @ts-expect-error mock FileReader
globalThis.FileReader = MockFileReader;

function makeOpts(overrides: Record<string, unknown> = {}) {
  return {
    currentDocument: ref({
      markdown: "hello",
      images: [] as Array<{ name: string; alt: string; relativePath: string; dataUrl: string }>,
    }),
    currentFile: ref("scene.py"),
    onError: vi.fn(),
    persistCurrentDocument: vi.fn(async () => undefined),
    saveState: ref<"idle" | "saving" | "saved">("idle"),
    ...overrides,
  };
}

describe("useNoteImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addImages 无 currentFile 或空 files 跳过", async () => {
    const opts = makeOpts({ currentFile: ref("") });
    const n = useNoteImages(opts);
    await n.addImages({ files: [makeFile("a.png")] });
    expect(addScriptNoteImages).not.toHaveBeenCalled();

    const opts2 = makeOpts();
    await useNoteImages(opts2).addImages({ files: [] });
    expect(addScriptNoteImages).not.toHaveBeenCalled();
  });

  it("addImages 过滤非图片 + 写 markdown 引用 + save", async () => {
    const opts = makeOpts();
    const n = useNoteImages(opts);
    await n.addImages({
      files: [makeFile("a.png"), makeFile("doc.pdf", "application/pdf")],
    });
    expect(opts.persistCurrentDocument).toHaveBeenCalledWith("scene.py");
    expect(addScriptNoteImages).toHaveBeenCalled();
    expect(saveScriptNote).toHaveBeenCalled();
    expect(opts.saveState.value).toBe("saved");
    expect(opts.currentDocument.value.markdown).toContain("assets/a.png");
  });

  it("addImages 失败调 onError", async () => {
    vi.mocked(addScriptNoteImages).mockRejectedValueOnce(new Error("upload fail"));
    const opts = makeOpts();
    const n = useNoteImages(opts);
    await n.addImages({ files: [makeFile("a.png")] });
    expect(opts.onError).toHaveBeenCalledWith("upload fail");
  });

  it("removeImage 无 path 跳过", async () => {
    const opts = makeOpts();
    const n = useNoteImages(opts);
    await n.removeImage("");
    expect(removeScriptNoteImage).not.toHaveBeenCalled();
  });

  it("removeImage 成功移除引用 + save", async () => {
    const opts = makeOpts();
    opts.currentDocument.value = {
      markdown: 'hello\n\n![a](<assets/a.png>)\n\nworld',
      images: [{ name: "a.png", alt: "a", relativePath: "assets/a.png", dataUrl: "" }],
    };
    const n = useNoteImages(opts);
    await n.removeImage("assets/a.png");
    expect(removeScriptNoteImage).toHaveBeenCalledWith("scene.py", "assets/a.png");
    expect(saveScriptNote).toHaveBeenCalled();
    expect(opts.currentDocument.value.markdown).not.toContain("assets/a.png");
    expect(opts.saveState.value).toBe("saved");
  });

  it("moveImage 无相对路径跳过", async () => {
    const opts = makeOpts();
    const n = useNoteImages(opts);
    await n.moveImage({ relativePath: "", insertAt: 0 });
    expect(saveScriptNote).not.toHaveBeenCalled();
  });

  it("moveImage markdown 未变则不 save", async () => {
    const opts = makeOpts();
    opts.currentDocument.value = {
      markdown: "plain text no image",
      images: [],
    };
    const n = useNoteImages(opts);
    await n.moveImage({ relativePath: "assets/missing.png", insertAt: 0 });
    // findImageReference 找不到 -> markdown 不变 -> 不 save
    expect(saveScriptNote).not.toHaveBeenCalled();
  });

  it("moveImage 成功移动引用", async () => {
    const opts = makeOpts();
    opts.currentDocument.value = {
      markdown: 'start\n\n![a](<assets/a.png>)\n\nend',
      images: [{ name: "a.png", alt: "a", relativePath: "assets/a.png", dataUrl: "" }],
    };
    const n = useNoteImages(opts);
    // 把图片移到末尾
    await n.moveImage({ relativePath: "assets/a.png", insertAt: 999 });
    expect(saveScriptNote).toHaveBeenCalled();
    expect(opts.saveState.value).toBe("saved");
    expect(opts.currentDocument.value.markdown).toContain("assets/a.png");
  });
});