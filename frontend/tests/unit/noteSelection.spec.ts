import { describe, expect, it } from "vitest";
import {
  buildAINoteSelectionPayload,
  collectSelectedImagesForContextMenu,
  extractImagePathsFromSelection,
  normalizeImageReferencePath,
  resolveImagesFromSelectedText,
} from "../../src/features/notebook/selection/noteSelection";
import type { NoteDocument } from "../../src/features/notebook/services/notebookStorage";

const image = (relativePath: string) => ({
  name: relativePath.split("/").pop() ?? "image",
  alt: "demo",
  dataUrl: "data:image/png;base64,demo",
  relativePath,
});

const document: NoteDocument = {
  markdown: "![one](images/one.png)",
  images: [image("images/one.png"), image("images/two.png")],
};

describe("noteSelection", () => {
  it("规范化路径并解析 Markdown image", () => {
    expect(normalizeImageReferencePath(" <images\\one.png> ")).toBe("images/one.png");
    expect(extractImagePathsFromSelection("![one](<images/one.png>) ![two](images/two.png)"))
      .toEqual(["images/one.png", "images/two.png"]);
    expect(resolveImagesFromSelectedText(document, "![one](./images/one.png)"))
      .toEqual([document.images[0]]);
  });

  it("按 selectedAt 合并文本引用与手动图片选择并去重", () => {
    expect(collectSelectedImagesForContextMenu(
      document,
      { text: "![one](images/one.png)", selectedAt: 20 },
      { "images/one.png": 10, "images/two.png": 30 },
    ).map((item) => item.relativePath)).toEqual(["images/one.png", "images/two.png"]);

    expect(buildAINoteSelectionPayload(
      document,
      { text: "说明文字", selectedAt: 20 },
      { "images/two.png": 10 },
    )).toEqual({
      items: [
        { kind: "image", ...document.images[1] },
        { kind: "text", text: "说明文字" },
      ],
    });
  });

  it("空选择返回 null", () => {
    expect(buildAINoteSelectionPayload(document, null, {})).toBeNull();
  });
});
