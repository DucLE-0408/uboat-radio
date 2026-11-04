import type { Tell } from "@uboat/sim-core";
import { BALANCE } from "@uboat/sim-core";
import { h, panel, setClass, setText } from "../dom";
import type { Ctx, Panel } from "../ctx";
import { formatDtg } from "../store";

const TELL_TEXT: Readonly<Record<Tell, string>> = {
  fist: "Keying style does not match this station's known fist.",
  bearing: "HF/DF bearing disagrees with the position the message claims.",
  timestamp: "DTG is too old or lies in the future.",
  grid: "The grid reference is unreadable or lies on land.",
};

/** Observed header, check-letter verdict (no cause given, R4.1) and the tells found by assess (R4.2). */
export function mountVerify(ctx: Ctx): Panel {
  const { store, watch } = ctx;
  const verdict = h("span", { class: "verdict", text: "not decoded yet" });
  const header = h("dl", { class: "kv" });
  const tells = h("div", { attrs: { "aria-live": "polite" } });
  const rows = new Map<string, HTMLElement>();
  for (const k of ["Callsign", "DTG sent", "Fist measured", "Fist known", "HF/DF bearing"]) {
    const v = h("dd", { text: "–" });
    rows.set(k, v);
    header.append(h("dt", { text: k }), v);
  }
  const el = panel("verify", "Verification", h("div", {}, verdict), header, tells);

  const fistText = (f: { wpm: number; dahRatio: number; gapStretch: number; jitter: number }): string =>
    `${f.wpm.toFixed(1)} wpm · dah×${f.dahRatio.toFixed(2)} · gap×${f.gapStretch.toFixed(2)} · jitter ${(f.jitter * 100).toFixed(0)}%`;

  const refresh = (): void => {
    const s = store.state;
    const rx = store.activeView();
    const a = rx?.analysis.get(s.activeAttempt);
    const set = (k: string, v: string): void => setText(rows.get(k) as HTMLElement, v);
    if (!rx) { for (const k of rows.keys()) set(k, "–"); }
    else {
      set("Callsign", `${rx.from} (net ${rx.net})`);
      set("DTG sent", `${formatDtg(rx.sentAtMin)} (now ${formatDtg(BALANCE.watch.startMin + s.tSec / 60)})`);
      set("Fist measured", fistText(rx.txFist));
      const known = watch.worldCtx().knownFists[rx.from];
      set("Fist known", known ? fistText(known) : "unknown station");
      set("HF/DF bearing", `${String(Math.round(rx.dfBearingDeg)).padStart(3, "0")}°`);
    }
    if (!a) { setText(verdict, "not decoded yet"); setClass(verdict, "match", false); setClass(verdict, "nomatch", false); tells.replaceChildren(); return; }
    setText(verdict, a.matches ? "CHECK LETTER MATCHES" : "CHECK LETTER DOES NOT MATCH");
    setClass(verdict, "match", a.matches);
    setClass(verdict, "nomatch", !a.matches);
    const want = a.tells.length === 0 ? ["No inconsistency found in the header."] : a.tells.map((t) => TELL_TEXT[t]);
    if (tells.childElementCount !== want.length || [...tells.children].some((c, i) => c.textContent !== want[i])) {
      tells.replaceChildren(...want.map((t) => h("div", { class: a.tells.length ? "tell" : "dim", text: t })));
    }
  };
  store.on(["analysis", "rx", "clock"], refresh);
  refresh();
  return { el };
}
