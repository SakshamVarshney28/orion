import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";
import { fetcher } from "./fetcher";

/* ---------------- STATE ---------------- */

const setSuggestionEffect = StateEffect.define<string | null>();

const suggestionState = StateField.define<string | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setSuggestionEffect)) return effect.value;
    }
    return value;
  },
});

/* ---------------- WIDGET ---------------- */

class SuggestionWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.text;
    span.style.opacity = "0.4";
    span.style.pointerEvents = "none";
    return span;
  }
}

/* ---------------- GLOBAL STATE ---------------- */

let debounceTimer: number | undefined;
let abortController: AbortController | null = null;
let requestId = 0;

const CACHE = new Map<string, string>();

/* ---------------- PAYLOAD ---------------- */

const generatePayload = (view: EditorView, fileName: string) => {
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const offset = pos - line.from;

  const beforeCursor = line.text.slice(0, offset);
  const afterCursor = line.text.slice(offset);

  if (beforeCursor.trim().length < 3) return null;

  const getLines = (from: number, to: number) => {
    const out: string[] = [];
    for (let i = from; i <= to; i++) {
      if (i >= 1 && i <= view.state.doc.lines) {
        out.push(view.state.doc.line(i).text);
      }
    }
    return out.join("\n");
  };

  return {
    fileName,
    before: getLines(line.number - 10, line.number),
    after: getLines(line.number + 1, line.number + 10),
    textBeforeCursor: beforeCursor,
    textAfterCursor: afterCursor,
  };
};

/* ---------------- PLUGIN ---------------- */

const createPlugin = (fileName: string) =>
  ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        this.run(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.run(update.view);
        }
      }

      run(view: EditorView) {
        if (debounceTimer) window.clearTimeout(debounceTimer);

        debounceTimer = window.setTimeout(async () => {
          const payload = generatePayload(view, fileName);
          if (!payload) return;

          const key = payload.textBeforeCursor;

          // cache hit
          if (CACHE.has(key)) {
            view.dispatch({
              effects: setSuggestionEffect.of(CACHE.get(key) ?? null),
            });
            return;
          }

          // abort previous safely
          if (abortController) {
            try {
              abortController.abort();
            } catch {}
          }

          abortController = new AbortController();
          const id = ++requestId;

          const suggestion = await fetcher(
            payload,
            abortController.signal
          );

          // ignore outdated response
          if (id !== requestId) return;

          if (suggestion) CACHE.set(key, suggestion);

          view.dispatch({
            effects: setSuggestionEffect.of(suggestion),
          });
        }, 400);
      }
    }
  );

/* ---------------- RENDER ---------------- */

const renderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      const changed =
        update.docChanged ||
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(setSuggestionEffect))
        );

      if (changed) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView) {
      const suggestion = view.state.field(suggestionState);
      if (!suggestion) return Decoration.none;

      const pos = view.state.selection.main.head;

      return Decoration.set([
        Decoration.widget({
          widget: new SuggestionWidget(suggestion),
          side: 1,
        }).range(pos),
      ]);
    }
  },
  { decorations: (v) => v.decorations }
);

/* ---------------- KEYMAP ---------------- */

const keymapPlugin = keymap.of([
  {
    key: "Tab",
    run(view) {
      const suggestion = view.state.field(suggestionState);
      if (!suggestion) return false;

      const pos = view.state.selection.main.head;

      view.dispatch({
        changes: { from: pos, insert: suggestion },
        selection: { anchor: pos + suggestion.length },
        effects: setSuggestionEffect.of(null),
      });

      return true;
    },
  },
]);

/* ---------------- EXPORT ---------------- */

export const suggestion = (fileName: string) => [
  suggestionState,
  createPlugin(fileName),
  renderPlugin,
  keymapPlugin,
];