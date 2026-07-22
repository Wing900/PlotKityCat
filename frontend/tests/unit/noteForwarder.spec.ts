import { describe, expect, it } from "vitest";
import { forwardNoteDocumentToBlocks } from "../../src/features/notebook/rendering/noteForwarder";
import type { NoteDocument } from "../../src/features/notebook/services/notebookStorage";
import type { DesignCard } from "../../src/features/designCard/services/designCardTypes";

const card: DesignCard = {
  id: "card-a", createdAt: 1, updatedAt: 1, title: "A", order: 1, plan: "plan", svg: "<svg />",
};
const document: NoteDocument = {
  markdown: '标题\n\n![图](images/a.png)\n:::design-card{id="card-a"}\n结尾',
  images: [{ name: "a.png", alt: "图", dataUrl: "data:image/png;base64,a", relativePath: "images/a.png" }],
};

describe("noteForwarder", () => {
  it("将 markdown、image、design-card 拆成有序 blocks", () => {
    const blocks = forwardNoteDocumentToBlocks(document, [card]);
    expect(blocks.map((block) => block.kind)).toEqual(["markdown", "image", "design-card", "markdown"]);
    expect(blocks[1]).toMatchObject({ kind: "image", image: document.images[0] });
    expect(blocks[2]).toMatchObject({ kind: "design-card", card, displayIndex: 1 });
    expect(blocks[0]).toMatchObject({ kind: "markdown", html: expect.stringContaining("标题") });
  });

  it("未知 Design Card 保留 cardId 并标记空 card", () => {
    const blocks = forwardNoteDocumentToBlocks({ ...document, markdown: ':::design-card{id="missing"}' });
    expect(blocks[0]).toMatchObject({ kind: "design-card", cardId: "missing", card: null, displayIndex: 0 });
  });
});
