import { setText } from "../dom";
import { place } from "./px";
import type { SceneCtx } from "./scope";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

/** Danger plates on the banner (text + position, never colour alone): HF/DF fix, escort dispatched, depth charges. */
export function mountAlerts(ctx: SceneCtx, root: HTMLElement): void {
  const { store } = ctx;
  const box = mk("section", "sc alerts"); box.setAttribute("aria-label", "Danger"); box.setAttribute("aria-live", "assertive"); place(box, 380, 12, 200, 34);
  const defs: readonly [string, (s: typeof store.state) => boolean][] = [
    ["!! HF/DF FIX ON US", (s) => s.tx.locatedAtSec !== null && s.tSec - s.tx.locatedAtSec < 120],
    ["!! ESCORT DISPATCHED", (s) => s.tx.escortAtSec !== null && s.tSec - s.tx.escortAtSec < 600],
    ["!! DEPTH CHARGES", (s) => s.tx.depthChargeAtSec !== null && s.tSec - s.tx.depthChargeAtSec < 12],
  ];
  const plates = defs.map(([txt], i) => { const p = mk("div", "alertp lbl"); place(p, 0, i * 11, 200, 10); setText(p, txt); p.hidden = true; box.append(p); return p; });
  root.append(box);
  let seq = store.state.alertSeq, flashUntil = 0;
  const banner = (): HTMLElement | null => root.querySelector(".sbanner");
  ctx.scope.on(["alert", "tx", "clock"], () => {
    defs.forEach(([, on], i) => { (plates[i] as HTMLElement).hidden = !on(store.state); });
    if (store.state.alertSeq !== seq) { seq = store.state.alertSeq; banner()?.classList.add("hit"); flashUntil = performance.now() + 700; setTimeout(() => { if (performance.now() >= flashUntil) banner()?.classList.remove("hit"); }, 720); }
  });
  ctx.scope.own(() => banner()?.classList.remove("hit"));
}
