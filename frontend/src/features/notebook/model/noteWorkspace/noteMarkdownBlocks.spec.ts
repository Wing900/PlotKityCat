import { describe, it, expect } from "vitest";
import {
  insertBlockReference,
  collapseBlankLines,
  escapeRegExp,
} from "./noteMarkdownBlocks";

describe("insertBlockReference", () => {
  it("空 block 直接返回原文", () => {
    expect(insertBlockReference("content", "")).toBe("content");
  });

  it("空 markdown 返回 block", () => {
    expect(insertBlockReference("", "B")).toBe("B");
  });

  it("无 insertAt 追加到末尾 (trim 尾空白 + 双换行)", () => {
    expect(insertBlockReference("a  \n  ", "B")).toBe("a\n\nB");
    expect(insertBlockReference("a", "B")).toBe("a\n\nB");
  });

  it("insertAt 在中间插入并补空行", () => {
    const result = insertBlockReference("hello world", "X", 5);
    expect(result).toContain("hello");
    expect(result).toContain("world");
    expect(result).toContain("X");
  });

  it("atomic block 内插入被推到块边界", () => {
    const md = 'before :::design-card{id="abc"} after';
    // 在 atomic 块内插入 -> 推到块首或块尾
    const result = insertBlockReference(md, "X", 20);
    expect(result).toContain("X");
    expect(result).toContain('design-card{id="abc"}');
  });
});

describe("collapseBlankLines", () => {
  it("3+ 换行压缩为 2", () => {
    expect(collapseBlankLines("a\n\n\n\nb")).toBe("a\n\nb");
    expect(collapseBlankLines("a\n\nb")).toBe("a\n\nb");
    expect(collapseBlankLines("a\nb")).toBe("a\nb");
  });
});

describe("escapeRegExp", () => {
  it("转义正则元字符", () => {
    expect(escapeRegExp("a.b*c+d")).toBe("a\\.b\\*c\\+d");
    expect(escapeRegExp("(group)")).toBe("\\(group\\)");
    expect(escapeRegExp("[bracket]")).toBe("\\[bracket\\]");
    expect(escapeRegExp("plain")).toBe("plain");
  });
});