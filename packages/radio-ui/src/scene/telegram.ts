import type { Tell } from "@uboat/sim-core";
import { setClass, setText } from "../dom";
import type { SceneCtx } from "./scope";
import { formatDtg } from "../store";
import { paint, place, sliceVars, u } from "./px";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

const SHORT: Readonly<Record<Tell, string>> = { fist: "FIST ≠ KNOWN", bearing: "DF BEARING OFF", timestamp: "DTG STALE", grid: "GRID INVALID" };
const LONG: Readonly<Record<Tell, string>> = {
  fist: "Keying style does not match this station's known fist.",
  bearing: "HF/DF bearing disagrees with the position the message claims.",
  timestamp: "DTG is too old or lies in the future.",
  grid: "The grid reference is unreadable or lies on land.",
};

/** Telegram (observed header, challenge cell, verdict, tells) and the command dock under it. */
export function mountTelegram(ctx: SceneCtx, root: HTMLElement): void {
  const { store, actions, watch } = ctx;
  const tg = mk("section", "sc tg"); tg.setAttribute("aria-label", "Telegram"); place(tg, 148, 108, 268, 104); paint(tg, "telegram");
  const dl = mk("dl", "sc"); dl.style.inset = "0"; tg.append(dl);
  const rows: { v: HTMLElement }[] = ["FROM", "NET", "DTG", "FIST", "DF BRG"].map((k, i) => {
    const dt = mk("dt", "lbl"); dt.textContent = k; place(dt, 8, 8 + i * 13, 46, 11); dl.append(dt);
    const dd = mk("dd", ""); place(dd, 54, 8 + i * 13, 124, 11); dd.textContent = "—"; dl.append(dd);
    return { v: dd };
  });
  const chH = mk("div", "lbl"); chH.textContent = "Challenge"; chH.style.position = "absolute"; place(chH, 184, 8, 76, 9); chH.style.display = "flex"; chH.style.alignItems = "center"; chH.style.justifyContent = "center"; chH.style.color = "#4d1a2a"; tg.append(chH);
  const chB = mk("div", "typ tg-ch"); chB.style.position = "absolute"; place(chB, 184, 18, 76, 30); chB.style.display = "flex"; chB.style.flexDirection = "column"; chB.style.alignItems = "center"; chB.style.justifyContent = "center"; chB.style.fontSize = u(12); chB.style.gap = u(1); chB.setAttribute("aria-live", "polite"); tg.append(chB);
  const chL1 = mk("div", ""), chL2 = mk("div", ""); chB.append(chL1, chL2);
  const stamp = mk("div", "stampv"); stamp.style.position = "absolute"; place(stamp, 202, 52, 58, 22); stamp.style.display = "flex"; stamp.style.alignItems = "center"; stamp.style.justifyContent = "center"; stamp.setAttribute("aria-live", "polite"); tg.append(stamp);
  const tell = mk("div", "stell"); tell.style.position = "absolute"; place(tell, 12, 78, 244, 18); tell.style.display = "flex"; tell.style.alignItems = "center"; tg.append(tell);

  // command dock
  const dock = mk("section", "sc dock"); dock.setAttribute("aria-label", "Commands"); place(dock, 148, 216, 268, 22);
  const defs: readonly [string, string, () => void][] = [
    ["Repeat", "Ask the sender to repeat the message (Alt+R)", () => actions.repeat()],
    ["Challenge", "Send an authentication challenge (Alt+C)", () => actions.challenge()],
    ["Check", "Check the challenge reply against your table (Alt+K)", () => actions.check()],
    ["Accept", "Accept this order (Alt+Y)", () => actions.resolve("accept")],
    ["Reject", "Reject this order as forged (Alt+N)", () => actions.resolve("reject")],
  ];
  let x = 2;
  for (const [label, hint, on] of defs) {
    const w = label.length * 6 + 12, b = mk("button", "sbtn"); b.type = "button"; b.textContent = label; b.setAttribute("aria-label", hint); b.title = hint;
    place(b, x, 2, w, 18); sliceVars(b, "btn"); b.addEventListener("click", on); dock.append(b); x += w + 3;
  }

  const refresh = (): void => {
    const s = store.state, rx = store.activeView();
    const a = rx?.analysis.get(s.activeAttempt);
    const known = rx ? watch.worldCtx().knownFists[rx.from] : undefined;
    setText(rows[0]!.v, rx ? rx.from : "—");
    setText(rows[1]!.v, rx ? rx.net : "—");
    setText(rows[2]!.v, rx ? formatDtg(rx.sentAtMin) : "—");
    setText(rows[3]!.v, rx ? `${rx.txFist.wpm.toFixed(1)} wpm${known ? ` (known ${known.wpm.toFixed(0)})` : ""}` : "—");
    setText(rows[4]!.v, rx ? `${String(Math.round(rx.dfBearingDeg) % 360).padStart(3, "0")}°` : "—");
    const ch = rx?.challenge;
    setText(chL1, ch ? `${ch.row} × ${ch.col}` : "—");
    setText(chL2, ch ? (ch.result === null ? (ch.reply ? `reply ${ch.reply}` : "waiting…") : ch.result === "ok" ? "AUTH OK" : ch.result === "wrong" ? "AUTH FAIL" : "CELL USED") : "");
    setText(stamp, a ? (a.matches ? "CHECK OK" : "NO MATCH") : "DECODE");
    setClass(stamp, "ok", !!a && a.matches); setClass(stamp, "bad", !!a && !a.matches);
    const tells = a?.tells ?? [];
    setText(tell, a ? (tells.length === 0 ? "No inconsistency found" : tells.map((t) => SHORT[t]).join(" · ")) : "");
    tell.title = tells.map((t) => LONG[t]).join(" ");
    tell.setAttribute("aria-label", a ? (tells.length === 0 ? "No inconsistency found in the header." : tells.map((t) => LONG[t]).join(" ")) : "");
  };
  ctx.scope.on(["rx", "analysis", "challenge", "clock"], refresh);
  refresh();
  root.append(tg, dock);
}
