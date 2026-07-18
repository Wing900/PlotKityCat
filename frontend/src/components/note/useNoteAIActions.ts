import type {
  AINoteSceneActionRequest,
  AINoteSelectionPayload,
} from "../../features/ai/services/aiTypes";

type NoteAIActionsOptions = {
  buildSelectionPayload: () => AINoteSelectionPayload | null;
  closeContextMenu: () => void;
  currentFile: () => string;
  getDocumentMarkdown: () => string;
  onDesign: (request: AINoteSceneActionRequest) => void;
  onGenerate: (request: AINoteSceneActionRequest) => void;
};

export function useNoteAIActions(options: NoteAIActionsOptions) {
  function runAIGeneration() {
    runAIAction("generate");
  }

  function runAIDesign() {
    runAIAction("design");
  }

  function runAIAction(kind: "generate" | "design") {
    const sceneName = options.currentFile().trim();
    const selection = resolveSelection();
    if (!selection || !sceneName) {
      options.closeContextMenu();
      return;
    }

    const request = { sceneName, selection };
    if (kind === "design") {
      options.onDesign(request);
    } else {
      options.onGenerate(request);
    }
    options.closeContextMenu();
  }

  function resolveSelection(): AINoteSelectionPayload | null {
    const selected = options.buildSelectionPayload();
    if (selected?.items.length) {
      return selected;
    }
    return buildFullDocumentSelection(options.getDocumentMarkdown());
  }

  return {
    runAIDesign,
    runAIGeneration,
  };
}

function buildFullDocumentSelection(markdown: string): AINoteSelectionPayload | null {
  const text = markdown.trim();
  if (!text) {
    return null;
  }
  return {
    items: [{ kind: "text", text }],
  };
}
