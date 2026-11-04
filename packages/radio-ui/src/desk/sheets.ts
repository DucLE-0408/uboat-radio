// Paper sheets on the desk (R2): DOM for one sheet, mouse drag, keyboard pick-up/move/drop, flip. Content is filled by the caller.
import { h, setClass, setText } from "../dom";
import { t } from "../i18n";
import { paint, place, setFrame } from "../scene/px";
import { SIZE, type Paper, type PaperModel } from "./papers";

export interface SheetHost {
  readonly model: PaperModel;
  /** Current integer pixel scale (CSS px per logical px). */
  px(): number;
  /** Layout changed (move, flip, raise): re-stack and persist. */
  changed(): void;
  /** Short live announcement for keyboard users. */
  announce(text: string): void;
}

export interface SheetView {
  readonly el: HTMLElement;
  readonly front: HTMLElement;
  readonly back: HTMLElement;
  /** Re-apply position, stacking and face from the model. */
  sync(): void;
}

const STEP = 4, BIG_STEP = 16;

export function mountSheet(host: SheetHost, paper: Paper, sprite: string | null, title: string, cls: string): SheetView {
  const { w, h: hh } = SIZE[paper.kind];
  const el = h("section", { class: `sc dpaper ${cls}`, attrs: { tabindex: "0", "aria-label": title, "aria-roledescription": t("desk.sheet.role"), "aria-describedby": "desk-sheet-help" } });
  el.dataset["id"] = paper.id;
  if (sprite) paint(el, sprite);
  const front = h("div", { class: "face" }), back = h("div", { class: "face" });
  el.append(front, back);
  let shownFace = "";
  const sync = (): void => {
    place(el, paper.x, paper.y, w, hh);
    el.style.zIndex = String(paper.z);
    if (shownFace !== paper.face) {
      shownFace = paper.face;
      front.hidden = paper.face !== "front"; back.hidden = paper.face !== "back";
      if (sprite) setFrame(el, sprite, paper.face === "front" ? 0 : 1);
      el.dataset["face"] = paper.face;
    }
  };

  // ---- mouse / pen drag
  let drag: { id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null = null;
  el.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0 || (ev.target as HTMLElement).closest("button")) return;
    host.model.raise(paper.id);
    drag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, ox: paper.x, oy: paper.y, moved: false };
    el.setPointerCapture(ev.pointerId);
    setClass(el, "dragging", true);
    host.changed();
    ev.preventDefault(); // no text selection, no focus: typing keeps going to the copy
  });
  el.addEventListener("pointermove", (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const k = host.px();
    const dx = (ev.clientX - drag.sx) / k, dy = (ev.clientY - drag.sy) / k;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 1) return;
    drag.moved = true;
    host.model.moveTo(paper.id, drag.ox + dx, drag.oy + dy);
    sync();
  });
  const end = (ev: PointerEvent): void => {
    if (!drag || ev.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    setClass(el, "dragging", false);
    if (moved) host.changed();
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  // ---- keyboard: Enter/Space picks the sheet up, arrows move it, Enter/Space puts it down, Esc puts it back (R2.3)
  let held: { x: number; y: number } | null = null;
  const drop = (cancel: boolean): void => {
    if (!held) return;
    if (cancel) host.model.moveTo(paper.id, held.x, held.y);
    held = null;
    setClass(el, "held", false);
    el.setAttribute("aria-pressed", "false");
    sync(); host.changed();
    host.announce(cancel ? t("desk.sheet.cancelled", { name: title }) : t("desk.sheet.dropped", { name: title }));
  };
  el.setAttribute("aria-pressed", "false");
  el.addEventListener("keydown", (ev) => {
    if (ev.target !== el) return;               // keys inside the sheet (flip button, group list) keep their own meaning
    const c = ev.code;
    if (c === "Enter" || c === "NumpadEnter" || c === "Space") {
      if (held) drop(false);
      else {
        held = { x: paper.x, y: paper.y };
        host.model.raise(paper.id); host.changed();
        setClass(el, "held", true); el.setAttribute("aria-pressed", "true");
        host.announce(t("desk.sheet.picked", { name: title }));
      }
    } else if (held && c === "Escape") drop(true);
    else if (held && (c === "ArrowLeft" || c === "ArrowRight" || c === "ArrowUp" || c === "ArrowDown")) {
      const s = ev.shiftKey ? BIG_STEP : STEP;
      host.model.nudge(paper.id, c === "ArrowLeft" ? -s : c === "ArrowRight" ? s : 0, c === "ArrowUp" ? -s : c === "ArrowDown" ? s : 0);
      sync();
    } else return;                               // letters, digits, Backspace... still type the copy
    ev.preventDefault(); ev.stopPropagation();
  });
  el.addEventListener("blur", () => drop(false));

  return { el, front, back, sync };
}

/** Flip button in a sheet's header. */
export function flipButton(host: SheetHost, paper: Paper, view: { sync(): void }, x: number, y: number): HTMLButtonElement {
  const b = h("button", { class: "dflip", attrs: { type: "button", "aria-label": t("desk.paper.flip"), title: t("desk.paper.flip") }, text: "⟲" });
  place(b, x, y, 14, 11);
  b.addEventListener("click", () => { host.model.flip(paper.id); view.sync(); host.changed(); });
  return b;
}

/** Group cells: one per group; longer traffic scrolls instead of being cut. */
export function groupGrid(x: number, y: number, w: number, hh: number, min: number): { el: HTMLElement; set(groups: readonly { text: string; bad?: boolean; cur?: boolean }[], label: string): void } {
  const el = h("div", { class: "dgrid", attrs: { role: "list", tabindex: "0" } }); place(el, x, y, w, hh);
  const cells: HTMLElement[] = [];
  return {
    el,
    set: (groups, label) => {
      const n = Math.max(min, groups.length);
      while (cells.length < n) { const c = h("div", { class: "dcell typ", attrs: { role: "listitem" } }); cells.push(c); el.append(c); }
      while (cells.length > n) cells.pop()?.remove();
      cells.forEach((c, k) => { const g = groups[k]; setText(c, g?.text ?? ""); setClass(c, "bad", g?.bad === true); setClass(c, "cur", g?.cur === true); });
      el.setAttribute("aria-label", label);
    },
  };
}
