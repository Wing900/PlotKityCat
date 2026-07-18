import { type ComputedRef, type ShallowRef } from "vue";
import {
  Compartment,
  Decoration,
  type DecorationSet,
  EditorState,
  EditorView,
} from "../../lib/codemirror";

type EditorDecorationsOptions = {
  editorView: ShallowRef<EditorView | null>;
  normalizedCode: ComputedRef<string>;
  getAnimatedLineRanges: () => Array<{ startLine: number; endLine: number }> | undefined;
  getAnimationKey: () => number | undefined;
  getIsStreaming: () => boolean | undefined;
};

export function useEditorDecorations(options: EditorDecorationsOptions) {
  const decorationsCompartment = new Compartment();

  function buildDecorations(): DecorationSet {
    const view = options.editorView.value;
    const doc = view?.state.doc ?? EditorState.create({ doc: options.normalizedCode.value }).doc;
    const decorations = [];

    const animatedLines = new Set<number>();
    void options.getAnimationKey();
    for (const range of options.getAnimatedLineRanges() ?? []) {
      for (let line = range.startLine; line <= range.endLine; line += 1) {
        animatedLines.add(line);
      }
    }

    for (const lineNumber of animatedLines) {
      if (lineNumber >= 1 && lineNumber <= doc.lines) {
        decorations.push(Decoration.line({ class: "cm-repair-revealed" }).range(doc.line(lineNumber).from));
      }
    }

    if (options.getIsStreaming() && doc.lines > 0) {
      decorations.push(Decoration.line({ class: "cm-streaming-line" }).range(doc.line(doc.lines).from));
    }

    return Decoration.set(decorations, true);
  }

  function reconfigureDecorations() {
    options.editorView.value?.dispatch({
      effects: decorationsCompartment.reconfigure(EditorView.decorations.of(buildDecorations())),
    });
  }

  return {
    buildDecorations,
    decorationsCompartment,
    reconfigureDecorations,
  };
}
