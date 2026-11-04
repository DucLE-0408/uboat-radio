import { formatClock } from "../store";
import { sliceVars } from "./px";
import type { SceneCtx } from "./scope";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

/** End-of-watch debrief (R8). Correctness is revealed only here, after resolution. */
export function mountSummary(ctx: SceneCtx, root: HTMLElement): void {
  const { store, actions } = ctx;
  const el = mk("div", "sc summary"); el.style.inset = "0"; el.hidden = true;
  const card = mk("div", "scard"); card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-labelledby", "sc-sum-title");
  el.append(card);
  root.append(el);
  let shown = false;
  const refresh = (): void => {
    const s = store.state;
    if (s.ended === null) { if (shown) { shown = false; el.hidden = true; for (const n of root.querySelectorAll<HTMLElement>(":scope > [inert]")) n.removeAttribute("inert"); } return; }
    if (shown) return;
    shown = true;
    el.hidden = false;
    for (const n of root.querySelectorAll<HTMLElement>(":scope > .sc")) if (n !== el) n.setAttribute("inert", "");
    const right = s.decisions.filter((d) => d.correct).length;
    const h1 = mk("h1", "lbl"); h1.id = "sc-sum-title"; h1.textContent = s.ended === "sunk" ? "Boat lost" : "Dawn: watch complete";
    const dl = mk("dl", "typ sdl");
    const row = (k: string, v: string): void => { const dt = mk("dt", "lbl"); dt.textContent = k; const dd = mk("dd", ""); dd.textContent = v; dl.append(dt, dd); };
    row("Outcome", s.ended === "sunk" ? "The boat was sunk and the keybook lost." : "You brought the boat through the night watch.");
    row("Hull", `${Math.round(s.boat.hull)} / 100`);
    row("Time on the air", formatClock(s.tx.totalSec));
    row("Decisions", s.decisions.length === 0 ? "none taken" : `${right} of ${s.decisions.length} correct`);
    row("Seed", String(ctx.seed));
    const ul = mk("ul", "typ sdec");
    for (const d of s.decisions) { const li = mk("li", d.correct ? "good" : "bad"); li.textContent = `#${d.rxId}: ${d.decision === "accept" ? "accepted" : "rejected"} - ${d.correct ? "correct" : "WRONG"}`; ul.append(li); }
    const row2 = mk("div", "srow");
    const same = mk("button", "sbtn sbig"); same.type = "button"; same.textContent = "Play again: same seed"; sliceVars(same, "btn"); same.addEventListener("click", () => actions.newGame(true));
    const fresh = mk("button", "sbtn sbig"); fresh.type = "button"; fresh.textContent = "Play again: new seed"; sliceVars(fresh, "btn"); fresh.addEventListener("click", () => actions.newGame(false));
    row2.append(same, fresh);
    card.replaceChildren(h1, dl, ul, row2);
    same.focus();
  };
  ctx.scope.on(["ended"], refresh);
  refresh();
}
