import { describe, expect, it } from "vitest";
import {
  hasDesignCardDragData,
  readDesignCardDragData,
  writeDesignCardDragData,
} from "../../src/features/designCard/services/designCardDragData";
import {
  hasNoteImageDragData,
  readNoteImageDragData,
  writeNoteImageDragData,
} from "../../src/features/notebook/services/noteImageDragData";

function dataTransfer(types = ["application/x-plotkitycat-design-card", "application/x-design-card-id", "text/plain"]) {
  const values = new Map<string, string>();
  const mutableTypes = [...types];
  return {
    types: mutableTypes,
    setData: (type: string, value: string) => {
      values.set(type, value);
      if (!mutableTypes.includes(type)) {
        mutableTypes.push(type);
      }
    },
    getData: (type: string) => values.get(type) ?? "",
  } as unknown as DataTransfer;
}

describe("drag data codecs", () => {
  it("读写 Design Card drag data，并兼容 legacy payload", () => {
    const transfer = dataTransfer();
    writeDesignCardDragData(transfer, { cardId: "card-a", source: "note" });
    expect(hasDesignCardDragData(transfer)).toBe(true);
    expect(readDesignCardDragData(transfer)).toEqual({ cardId: "card-a", source: "note" });

    const legacy = dataTransfer();
    legacy.getData = (type: string) => type === "application/x-design-card-id" ? "legacy-card" : "";
    expect(readDesignCardDragData(legacy)).toEqual({ cardId: "legacy-card", source: "editor" });
  });

  it("读写 Note Image drag data，拒绝损坏 JSON", () => {
    const transfer = dataTransfer();
    writeNoteImageDragData(transfer, { relativePath: "images/a.png", source: "note", startIndex: 1 });
    expect(hasNoteImageDragData(transfer)).toBe(true);
    expect(readNoteImageDragData(transfer)).toMatchObject({ relativePath: "images/a.png", source: "note" });

  });
});
