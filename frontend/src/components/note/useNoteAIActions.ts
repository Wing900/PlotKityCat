import type {
  AINoteSceneActionRequest,
  AINoteSelectionPayload,
} from "../../features/ai/services/aiTypes";
import type { DesignCard } from "../../features/designCard/services/designCardTypes";
import type { NoteDocument } from "../../features/notebook/services/notebookStorage";
import { buildFullAINoteSelectionPayload } from "../../features/notebook/selection/noteSelection";

type NoteAIActionsOptions = {
  buildSelectionPayload: () => AINoteSelectionPayload | null;
  closeContextMenu: () => void;
  currentFile: () => string;
  getDocument: () => NoteDocument;
  getDesignCards: () => DesignCard[];
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
    return buildFullAINoteSelectionPayload(options.getDocument(), options.getDesignCards());
  }

  return {
    runAIDesign,
    runAIGeneration,
  };
}
