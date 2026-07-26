import { computed, ref, watch, type Ref } from "vue";
import type { DesignCard } from "../../designCard/services/designCardTypes";
import { createAsyncSerialQueue } from "../../../lib/asyncSerialQueue";
import { getErrorMessage } from "../../../lib/errors";
import {
  getScriptNote,
  saveScriptNote,
  type NoteDocumentLike,
} from "../../scripts/services/scriptBridgeCompat";
import { useNoteDesignCardReferences } from "./noteWorkspace/useNoteDesignCardReferences";
import { useNoteImages } from "./noteWorkspace/useNoteImages";
import { forwardNoteDocumentToBlocks } from "../rendering/noteForwarder";
import {
  createEmptyNoteDocument,
  createNotePanelStorage,
  normalizeNoteDocument,
  type NoteDocument,
} from "../services/notebookStorage";

type SaveState = "idle" | "saving" | "saved";
type ErrorHandler = (message: string) => void;

const saveDebounceMs = 260;

export function useNoteWorkspace(
  currentFile: Ref<string>,
  onError: ErrorHandler,
  designCards: Ref<DesignCard[]> = ref([] as DesignCard[]),
) {
  const panelStorage = createNotePanelStorage();
  const isPanelOpen = ref(panelStorage.loadPanelState());
  const currentDocument = ref<NoteDocument>(createEmptyNoteDocument());
  const saveState = ref<SaveState>("idle");

  let saveTimer = 0;
  let loadingToken = 0;
  const saveQueue = createAsyncSerialQueue();

  watch(
    currentFile,
    (filename, previousFilename) => {
      void flushPendingSave(previousFilename).catch(() => undefined);
      if (!filename) {
        currentDocument.value = createEmptyNoteDocument();
        saveState.value = "idle";
        return;
      }

      const token = ++loadingToken;
      saveState.value = "idle";
      void loadRemoteNote(filename, token);
    },
    { immediate: true },
  );

  const renderBlocks = computed(() =>
    forwardNoteDocumentToBlocks(currentDocument.value, designCards.value),
  );

  const hasContent = computed(
    () =>
      currentDocument.value.markdown.trim() !== "" ||
      currentDocument.value.images.length > 0,
  );

  function hydrateFromScriptDocument(note: {
    noteMarkdown?: unknown;
    noteImages?: unknown;
  }) {
    void flushPendingSave(currentFile.value).catch(() => undefined);
    currentDocument.value = normalizeNoteDocument({
      markdown:
        typeof note.noteMarkdown === "string" ? note.noteMarkdown : currentDocument.value.markdown,
      images: Array.isArray(note.noteImages) ? note.noteImages : currentDocument.value.images,
    });
    saveState.value = "idle";
  }

  function updateMarkdown(markdown: string) {
    currentDocument.value = {
      ...currentDocument.value,
      markdown,
    };
    schedulePersist();
  }

  function togglePanel() {
    setPanelOpen(!isPanelOpen.value);
  }

  function setPanelOpen(isOpen: boolean) {
    isPanelOpen.value = isOpen;
    panelStorage.savePanelState(isPanelOpen.value);
  }

  function schedulePersist() {
    if (!currentFile.value) {
      return;
    }

    saveState.value = "saving";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveTimer = 0;
      void enqueueSave(currentFile.value, currentDocument.value.markdown);
    }, saveDebounceMs);
  }

  async function flushPendingSave(sceneName = currentFile.value) {
    while (saveTimer || saveQueue.current()) {
      if (saveTimer) {
        window.clearTimeout(saveTimer);
        saveTimer = 0;
        await enqueueSave(sceneName, currentDocument.value.markdown);
        continue;
      }

      const pendingSave = saveQueue.current();
      if (pendingSave) {
        await pendingSave;
      }
    }
  }

  function enqueueSave(sceneName: string, markdown: string) {
    return saveQueue.enqueue(() => persistDocument(sceneName, markdown));
  }

  async function persistCurrentDocument(sceneName = currentFile.value) {
    await enqueueSave(sceneName, currentDocument.value.markdown);
  }

  async function persistDocument(sceneName: string, markdown: string) {
    if (!sceneName) {
      saveState.value = "idle";
      return;
    }

    try {
      await saveScriptNote(sceneName, markdown);
      if (currentFile.value === sceneName) {
        saveState.value = "saved";
      }
    } catch (error) {
      if (currentFile.value === sceneName) {
        saveState.value = "idle";
      }
      onError(getErrorMessage(error));
      throw error;
    }
  }

  async function loadRemoteNote(filename: string, token: number) {
    try {
      const document = await getScriptNote(filename);
      if (token !== loadingToken) {
        return;
      }

      currentDocument.value = normalizeNoteDocument(document as NoteDocumentLike);
    } catch (error) {
      if (token !== loadingToken) {
        return;
      }

      currentDocument.value = createEmptyNoteDocument();
      onError(getErrorMessage(error));
    }
  }

  const { insertDesignCardReference, removeDesignCardReference } = useNoteDesignCardReferences({
    currentDocument,
    persistImmediately: () => {
      void flushPendingSave(currentFile.value).catch(() => undefined);
    },
    updateMarkdown,
  });
  const { addImages, moveImage, removeImage } = useNoteImages({
    currentDocument,
    currentFile,
    onError,
    persistCurrentDocument,
    saveState,
  });

  return {
    addImages,
    currentDocument,
    flushPendingSave,
    hasContent,
    hydrateFromScriptDocument,
    insertDesignCardReference,
    isPanelOpen,
    moveImage,
    removeDesignCardReference,
    removeImage,
    renderBlocks,
    saveState,
    setPanelOpen,
    togglePanel,
    updateMarkdown,
  };
}
