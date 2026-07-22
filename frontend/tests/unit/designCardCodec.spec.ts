import { describe, expect, it } from "vitest";
import {
  extractDesignCardReferenceIDs,
  formatDesignCardPlaceholder,
  formatDesignCardReference,
  fromEditableDesignCardMarkdown,
  parseDesignCardPlaceholder,
  toEditableDesignCardMarkdown,
} from "../../src/features/designCard/services/designCardMarkdownCodec";
import type { DesignCard } from "../../src/features/designCard/services/designCardTypes";

const cards: DesignCard[] = [
  { id: "card-a", createdAt: 1, updatedAt: 1, title: "A", order: 1, plan: "plan-a", svg: "<svg />" },
  { id: "card-b", createdAt: 2, updatedAt: 2, title: "B", order: 2, plan: "plan-b", svg: "<svg />" },
];

describe("designCardMarkdownCodec", () => {
  it("格式化并提取 Design Card reference", () => {
    expect(formatDesignCardReference("card-a")).toBe(':::design-card{id="card-a"}');
    expect(extractDesignCardReferenceIDs('x :::design-card{id="card-a"} y :::design-card{id="card-b"}'))
      .toEqual(["card-a", "card-b"]);
  });

  it("在原始 reference 与可编辑 placeholder 间往返", () => {
    const markdown = '前文\n:::design-card{id="card-a"}\n后文';
    const editable = toEditableDesignCardMarkdown(markdown, cards);
    expect(editable).toContain("[design-card-01]");
    expect(fromEditableDesignCardMarkdown(editable, cards)).toBe(markdown);
  });

  it("保留未知 card 与非法 placeholder", () => {
    expect(toEditableDesignCardMarkdown(':::design-card{id="missing"}', cards))
      .toBe(formatDesignCardPlaceholder(0));
    expect(fromEditableDesignCardMarkdown("[design-card-99]", cards)).toBe("[design-card-99]");
    expect(parseDesignCardPlaceholder(" [design-card-02] ")).toBe(2);
    expect(parseDesignCardPlaceholder("[design-card-1]")).toBe(0);
  });
});
