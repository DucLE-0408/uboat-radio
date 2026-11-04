import type { Ctx } from "../ctx";
import { setText } from "../dom";

/** Player-visible notices (refused orders, storage warnings). Live region; text via textContent; fades after 9 s of wall time. */
export function mountToast(ctx: Ctx, root: HTMLElement): { frame(): void } {
  const el = document.createElement("div");
  el.className = "sc toast lbl";
  el.setAttribute("role", "status"); el.setAttribute("aria-live", "assertive");
  el.style.cssText = "left:50%;bottom:calc(6px * var(--px));transform:translateX(-50%);max-width:calc(500px * var(--px));background:#1b1405;border:calc(1px * var(--px)) solid #e9b96a;color:#e9b96a;padding:calc(3px * var(--px)) calc(6px * var(--px));white-space:normal;text-transform:none;line-height:1.3;z-index:5;";
  el.hidden = true;
  root.append(el);
  let lastSeq = 0, shownAt = 0;
  ctx.store.on(["ui"], () => {
    const n = ctx.store.state.notice;
    if (n && n.seq !== lastSeq) { lastSeq = n.seq; shownAt = performance.now(); setText(el, n.text); el.hidden = false; }
  });
  return { frame: () => { if (!el.hidden && performance.now() - shownAt > 9000) el.hidden = true; } };
}
