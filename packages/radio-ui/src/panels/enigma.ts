import { h, panel, setClass, setText } from "../dom";
import type { Ctx, Panel } from "../ctx";

export function mountEnigma(ctx: Ctx): Panel {
  const { store } = ctx;
  const meta = h("dl", { class: "kv" });
  const out = h("div", { class: "pad", attrs: { "aria-label": "deciphered plaintext" } });
  const legend = h("div", { class: "legend" });
  const el = panel("enigma", "Enigma output", meta, out, legend);
  const spans: HTMLElement[] = [];
  const dd = new Map<string, HTMLElement>();
  for (const k of ["Indicator", "Key", "Check letter"]) {
    const v = h("dd", { text: "–" });
    dd.set(k, v);
    meta.append(h("dt", { text: k }), v);
  }

  const refresh = (): void => {
    const s = store.state;
    const rx = store.activeView();
    const att = rx?.attempts.find((a) => a.attempt === s.activeAttempt);
    setText(dd.get("Indicator") as HTMLElement, att ? att.indicator : "–");
    setText(dd.get("Key") as HTMLElement, rx ? `Day 1 · net ${rx.net} (rotors set by your key sheet)` : "–");
    const a = rx?.analysis.get(s.activeAttempt);
    setText(dd.get("Check letter") as HTMLElement, a ? (a.checkLetter ?? "unreadable") : "–");
    const words = a?.words ?? [];
    while (spans.length < words.length) { const sp = h("span", { class: "grp" }); spans.push(sp); out.append(sp); }
    while (spans.length > words.length) (spans.pop() as HTMLElement).remove();
    words.forEach((w, i) => { const sp = spans[i] as HTMLElement; setText(sp, w.plain); setClass(sp, "bad", !w.ok); });
    setText(legend, !a ? "Press Enter to decode your copy." : a.damagedGroups > 0
      ? `${a.damagedGroups} damaged group(s) (underlined): rotors desync inside them — consider asking for a repeat.`
      : "All groups are full 4-letter groups.");
  };
  store.on(["analysis", "rx", "copy"], refresh);
  refresh();
  return { el };
}
