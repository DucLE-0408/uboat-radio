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
  /** The sheet was clicked or focused: it becomes the selected sheet (and its message the active one). */
  select(paper: Paper): void;
  /** A tool is armed (stamp, pen, clip): apply it to this sheet. Returns true when the click was used by the tool. */
  activate(paper: Paper): boolean;
  /** A mouse drag ended over the screen point (client px): the door or the bin may take the sheet. */
  dropAt(paper: Paper, clientX: number, clientY: number, from: { readonly x: number; readonly y: number }): void;
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
    ev.preventDefault(); // no text selection, no focus: typing keeps going to the copy
    host.select(paper);
    if (host.activate(paper)) return;
    host.model.raiseGroup(paper.id);
    drag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, ox: paper.x, oy: paper.y, moved: false };
    el.setPointerCapture(ev.pointerId);
    setClass(el, "dragging", true);
    host.changed();
  });
  el.addEventListener("pointermove", (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const k = host.px();
    const dx = (ev.clientX - drag.sx) / k, dy = (ev.clientY - drag.sy) / k;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 1) return;
    drag.moved = true;
    host.model.moveWith(paper.id, drag.ox + dx, drag.oy + dy); // a clipped bundle moves as one
    host.changed();
  });
  const end = (ev: PointerEvent): void => {
    if (!drag || ev.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    setClass(el, "dragging", false);
    if (d.moved) { host.changed(); host.dropAt(paper, ev.clientX, ev.clientY, { x: d.ox, y: d.oy }); }
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  // ---- keyboard: Enter/Space picks the sheet up, arrows move it, Enter/Space puts it down, Esc puts it back (R2.3)
  let held: { x: number; y: number } | null = null;
  const drop = (cancel: boolean): void => {
    if (!held) return;
    if (cancel) host.model.moveWith(paper.id, held.x, held.y);
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
      if (ev.repeat) { ev.preventDefault(); ev.stopPropagation(); return; } // holding the key must not drop what it just picked up
      if (held) drop(false);
      else if (host.activate(paper)) { /* an armed tool was applied */ }
      else {
        held = { x: paper.x, y: paper.y };
        host.model.raiseGroup(paper.id); host.changed();
        setClass(el, "held", true); el.setAttribute("aria-pressed", "true");
        host.announce(t("desk.sheet.picked", { name: title }));
      }
    } else if (held && c === "Escape") drop(true);
    else if (held && (c === "ArrowLeft" || c === "ArrowRight" || c === "ArrowUp" || c === "ArrowDown")) {
      const s = ev.shiftKey ? BIG_STEP : STEP;
      host.model.nudge(paper.id, c === "ArrowLeft" ? -s : c === "ArrowRight" ? s : 0, c === "ArrowUp" ? -s : c === "ArrowDown" ? s : 0);
      host.changed();
    } else return;                               // letters, digits, Backspace... still type the copy
    ev.preventDefault(); ev.stopPropagation();
  });
  el.addEventListener("blur", () => drop(false));
  el.addEventListener("focus", () => host.select(paper));

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
