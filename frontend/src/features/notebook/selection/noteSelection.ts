import type {
  AINoteSelectionItem,
  AINoteSelectionPayload,
} from "../../ai/services/aiTypes";
import type { DesignCard } from "../../designCard/services/designCardTypes";
import { parseDesignCardPlaceholder } from "../../designCard/services/designCardMarkdownCodec";
import type { NoteDocument, NoteImage } from "../services/notebookStorage";

export type OrderedTextSelection = {
  text: string;
  selectedAt: number;
};

export type OrderedImageSelection = Record<string, number>;

type OrderedSelectionItem = AINoteSelectionItem & { selectedAt: number };

export function buildAINoteSelectionPayload(
  document: NoteDocument,
  textSelection: OrderedTextSelection | null,
  selectedImageOrder: OrderedImageSelection,
  designCards: DesignCard[] = [],
): AINoteSelectionPayload | null {
  const orderedItems: OrderedSelectionItem[] = [];
  const addedImagePaths = new Set<string>();

  if (textSelection?.text) {
    orderedItems.push({
      kind: "text",
      text: expandDesignCardReferences(textSelection.text, designCards),
      selectedAt: textSelection.selectedAt,
    });
    const referencedImages = resolveImagesFromSelectedText(document, textSelection.text);
    if (referencedImages.length > 0) {
      referencedImages.forEach((image) => {
        addedImagePaths.add(image.relativePath);
        orderedItems.push({
          kind: "image",
          name: image.name,
          alt: image.alt,
          dataUrl: image.dataUrl,
          relativePath: image.relativePath,
          selectedAt: textSelection.selectedAt,
        });
      });
    }
  }

  document.images.forEach((image) => {
    const selectedAt = selectedImageOrder[image.relativePath];
    if (!selectedAt || addedImagePaths.has(image.relativePath)) {
      return;
    }

    orderedItems.push({
      kind: "image",
      name: image.name,
      alt: image.alt,
      dataUrl: image.dataUrl,
      relativePath: image.relativePath,
      selectedAt,
    });
  });

  orderedItems.sort((left, right) => left.selectedAt - right.selectedAt);
  if (!orderedItems.length) {
    return null;
  }

  return {
    items: orderedItems.map(({ selectedAt: _selectedAt, ...item }) => item),
  };
}

// Full-document actions use the same multimodal context builder as explicit
// selections. Only images referenced by the document are included, so unused
// assets do not get sent to the model.
export function buildFullAINoteSelectionPayload(
  document: NoteDocument,
  designCards: DesignCard[] = [],
): AINoteSelectionPayload | null {
  const text = document.markdown.trim();
  if (!text) {
    return null;
  }
  return buildAINoteSelectionPayload(document, { text, selectedAt: 1 }, {}, designCards);
}

function expandDesignCardReferences(text: string, designCards: DesignCard[]) {
  if (!text || designCards.length === 0) {
    return text;
  }

  const cardsById = new Map(designCards.map((card) => [card.id, card]));
  const cardsByDisplayIndex = new Map(designCards.map((card, index) => [index + 1, card]));
  return text
    .replace(/:::design-card\{id="([^"]+)"\}/g, (match, cardId: string) => {
      const card = cardsById.get(cardId);
      return card ? formatDesignCardSelectionText(card, getDesignCardDisplayIndex(designCards, card)) : match;
    })
    .replace(/\[design-card-(\d{2,})]/g, (match: string) => {
      const displayIndex = parseDesignCardPlaceholder(match);
      const card = cardsByDisplayIndex.get(displayIndex);
      return card ? formatDesignCardSelectionText(card, displayIndex) : match;
    });
}

function formatDesignCardSelectionText(card: DesignCard, displayIndex: number) {
  const label = displayIndex > 0
    ? `设计卡片 ${String(displayIndex).padStart(2, "0")}`
    : "设计卡片";
  return [
    `[${label}]`,
    card.title ? `标题:\n${card.title}` : "",
    `设计说明:\n${card.plan || "无"}`,
    `SVG:\n${card.svg || "无"}`,
  ].filter(Boolean).join("\n\n");
}

function getDesignCardDisplayIndex(cards: DesignCard[], card: DesignCard) {
  return cards.findIndex((item) => item.id === card.id) + 1;
}

export function collectSelectedImagesForContextMenu(
  document: NoteDocument,
  textSelection: OrderedTextSelection | null,
  selectedImageOrder: OrderedImageSelection,
): NoteImage[] {
  const images: Array<NoteImage & { selectedAt: number }> = [];
  const addedPaths = new Set<string>();

  if (textSelection?.text) {
    resolveImagesFromSelectedText(document, textSelection.text).forEach((image) => {
      if (addedPaths.has(image.relativePath)) {
        return;
      }

      images.push({ ...image, selectedAt: textSelection.selectedAt });
      addedPaths.add(image.relativePath);
    });
  }

  document.images.forEach((image) => {
    const selectedAt = selectedImageOrder[image.relativePath];
    if (!selectedAt || addedPaths.has(image.relativePath)) {
      return;
    }

    images.push({ ...image, selectedAt });
    addedPaths.add(image.relativePath);
  });

  images.sort((left, right) => left.selectedAt - right.selectedAt);
  return images.map(({ selectedAt: _selectedAt, ...image }) => image);
}

export function resolveImagesFromSelectedText(document: NoteDocument, text: string): NoteImage[] {
  const paths = extractImagePathsFromSelection(text);
  if (!paths.length) {
    return [];
  }

  const imagesByPath = new Map(
    document.images.map((image) => [normalizeImageReferencePath(image.relativePath), image]),
  );
  const images: NoteImage[] = [];
  const addedPaths = new Set<string>();

  for (const path of paths) {
    const image = imagesByPath.get(normalizeImageReferencePath(path));
    if (!image || addedPaths.has(image.relativePath)) {
      continue;
    }

    images.push(image);
    addedPaths.add(image.relativePath);
  }

  return images;
}

export function extractImagePathsFromSelection(text: string): string[] {
  const paths: string[] = [];
  const markdownImagePattern = /!\[[^\]]*]\((?:<([^>]+)>|([^)]+?))(?:\s+"[^"]*")?\)/g;
  for (const match of text.matchAll(markdownImagePattern)) {
    const path = normalizeImageReferencePath(match[1] ?? match[2] ?? "");
    if (path) {
      paths.push(path);
    }
  }

  if (paths.length === 0) {
    const path = normalizeImageReferencePath(text);
    if (path) {
      paths.push(path);
    }
  }

  return paths;
}

export function normalizeImageReferencePath(path: string): string {
  return path
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "");
}
