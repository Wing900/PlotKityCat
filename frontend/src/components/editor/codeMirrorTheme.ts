import {
  EditorView,
} from "../../lib/codemirror";

export const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    minHeight: "0",
    width: "100%",
    backgroundColor: "transparent",
    color: "var(--text)",
    fontFamily: "\"Cascadia Code\", \"JetBrains Mono\", \"Consolas\", \"Courier New\", monospace",
    fontSize: "13px",
    lineHeight: "1.8",
    outline: "0",
  },
  "&.cm-focused": {
    outline: "0 !important",
  },
  ".cm-scroller": {
    height: "100%",
    overflow: "auto",
    fontFamily: "inherit",
    paddingTop: "0",
    boxSizing: "border-box",
    scrollbarWidth: "thin",
    scrollbarColor: "color-mix(in srgb, var(--muted), transparent 82%) transparent",
  },
  ".cm-scroller::-webkit-scrollbar": {
    width: "8px",
    height: "0",
  },
  ".cm-scroller::-webkit-scrollbar-track": {
    background: "transparent",
  },
  ".cm-scroller::-webkit-scrollbar-thumb": {
    border: "0",
    background: "color-mix(in srgb, var(--muted), transparent 84%)",
  },
  ".cm-scroller::-webkit-scrollbar-thumb:hover": {
    background: "color-mix(in srgb, var(--muted), transparent 74%)",
  },
  ".cm-scroller::-webkit-scrollbar-corner": {
    background: "transparent",
  },
  ".cm-content": {
    boxSizing: "border-box",
    minWidth: "0",
    minHeight: "0",
    padding: "14px 18px 34px 6px",
    caretColor: "var(--text)",
    lineHeight: "1.8",
  },
  ".cm-line": {
    padding: "0",
    lineHeight: "1.8",
    minHeight: "1.8em",
  },
  ".cm-python-keyword": {
    color: "var(--syntax-keyword)",
    fontWeight: "600",
  },
  ".cm-python-builtin": {
    color: "var(--syntax-builtin)",
    fontWeight: "500",
  },
  ".cm-python-string": {
    color: "var(--syntax-string)",
  },
  ".cm-python-number": {
    color: "var(--syntax-number)",
    fontWeight: "500",
  },
  ".cm-python-comment": {
    color: "var(--syntax-comment)",
    fontStyle: "italic",
  },
  ".cm-python-decorator": {
    color: "var(--syntax-decorator)",
    fontWeight: "500",
  },
  ".cm-python-operator": {
    color: "var(--syntax-operator)",
    fontWeight: "500",
  },
  ".cm-gutters": {
    border: "0",
    backgroundColor: "transparent",
    color: "var(--muted)",
    boxSizing: "border-box",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "42px",
    padding: "0 12px 0 0",
    color: "var(--muted)",
    opacity: "0.36",
    fontFamily: "inherit",
    fontSize: "13px",
    lineHeight: "1.8",
    minHeight: "1.8em",
  },
  ".cm-lineNumbers .cm-gutterElement:first-child": {
    height: "0",
    minHeight: "0",
    lineHeight: "0",
    paddingTop: "0",
    paddingBottom: "0",
    overflow: "hidden",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--hover-fill)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "color-mix(in srgb, var(--muted), transparent 76%)",
  },
  ".cm-search-match": {
    backgroundColor: "color-mix(in srgb, #ffd76a, transparent 42%)",
    borderRadius: "4px",
  },
  ".cm-search-match-active": {
    backgroundColor: "color-mix(in srgb, #ffb347, transparent 22%)",
    borderRadius: "4px",
    boxShadow: "inset 0 0 0 1px color-mix(in srgb, #c46a18, transparent 28%)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--text)",
  },
  ".cm-repair-revealed": {
    animation: "editor-repair-line 360ms ease",
  },
  ".cm-streaming-line": {
    animation: "editor-stream-line 220ms ease",
  },
});
