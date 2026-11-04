import { button, h, panel, setClass, setText } from "../dom";
import type { Ctx, Panel } from "../ctx";

/** Copy pad: the operator's own transcription, grouped by Space. Groups of != 4 letters are underlined (R3.2). */
export function mountCopy(ctx: Ctx): Panel {
  const { store, actions } = ctx;
  const pad = h("div", { class: "pad", attrs: { role: "textbox", "aria-readonly": "true", "aria-label": "copy pad" } });
  const legend = h("div", { class: "legend", text: "" });
  const decodeBtn = button("Decode copy", "Enter", () => actions.decode());
  const el = panel("copy", "Copy pad", pad, legend, h("div", { class: "row" }, decodeBtn));
  const spans: HTMLElement[] = [];

  const refresh = (): void => {
    const s = store.state;
    const text = s.activeRx === null ? "" : store.copyText(s.activeRx, s.activeAttempt);
    const words = text.length === 0 ? [] : text.split(" ");
    const lastIdx = words.length - 1;
    const typing = !text.endsWith(" ");
    const n = Math.max(words.length, 1);
    while (spans.length < n) { const sp = h("span", { class: "grp" }); spans.push(sp); pad.append(sp); }
    while (spans.length > n) (spans.pop() as HTMLElement).remove();
    for (let i = 0; i < n; i++) {
      const w = words[i] ?? "";
      const sp = spans[i] as HTMLElement;
      setText(sp, w);
      const isCheck = i === lastIdx && w.length === 1 && /[A-Z]/.test(w) && words.length > 1;
      setClass(sp, "bad", w.length > 0 && w.length !== 4 && !isCheck && !(i === lastIdx && typing));
      setClass(sp, "check", isCheck);
      setClass(sp, "cur", i === n - 1 && (typing || words.length === 0));
    }
    const done = words.filter((w) => w.length === 4).length;
    setText(legend, s.activeRx === null ? "No signal yet." : `${done} full groups · underlined = not 4 letters (ask for a repeat?) · last single letter = check letter`);
  };
  store.on(["copy", "rx"], refresh);
  refresh();
  return { el };
}
