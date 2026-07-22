import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useNoteDesignCardReferences } from "../../src/features/notebook/model/noteWorkspace/useNoteDesignCardReferences";
import { createEmptyNoteDocument } from "../../src/features/notebook/services/notebookStorage";

describe("useNoteDesignCardReferences", () => {
  it("插入 reference、避免 editor 重复，并支持 immediate persist", () => {
    const document = ref({ ...createEmptyNoteDocument(), markdown: "标题" });
    const updateMarkdown = vi.fn((markdown: string) => { document.value.markdown = markdown; });
    const persistImmediately = vi.fn();
    const references = useNoteDesignCardReferences({ currentDocument: document, updateMarkdown, persistImmediately });

    references.insertDesignCardReference({ cardId: "card-a", persist: "immediate", source: "editor" });
    references.insertDesignCardReference({ cardId: "card-a", source: "editor" });
    expect(updateMarkdown).toHaveBeenCalledTimes(1);
    expect(document.value.markdown).toContain(':::design-card{id="card-a"}');
    expect(persistImmediately).toHaveBeenCalledTimes(1);
  });

  it("移除全部 reference，空 cardId 安全跳过", () => {
    const document = ref({ ...createEmptyNoteDocument(), markdown: 'a\n:::design-card{id="card-a"}\n\nb\n:::design-card{id="card-a"}' });
    const updateMarkdown = vi.fn((markdown: string) => { document.value.markdown = markdown; });
    const references = useNoteDesignCardReferences({ currentDocument: document, updateMarkdown, persistImmediately: vi.fn() });

    references.removeDesignCardReference({ cardId: "card-a", persist: "immediate" });
    references.removeDesignCardReference({ cardId: "" });
    expect(document.value.markdown).toBe("a\n\nb");
    expect(updateMarkdown).toHaveBeenCalledTimes(1);
  });
});
