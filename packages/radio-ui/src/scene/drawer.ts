import { setClass, setText } from "../dom";
import { place, sliceVars } from "./px";
import type { SceneCtx } from "./scope";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };
const L = (i: number): string => String.fromCharCode(65 + i);
const idx = (s: string | null): number => (s === null ? -1 : s.charCodeAt(0) - 65);

/** Full 26x26 authentication table in a drawer. Alt+L (or the Table button) opens it with lookup on; Esc closes. */
export function mountAuthDrawer(ctx: SceneCtx, root: HTMLElement): void {
  const { store, watch, actions } = ctx;
  const table = watch.dayTable(); // the player's own pre-shared book (observation helper)
  const d = mk("aside", "sc drawer"); place(d, 148, 8, 484, 344);
  d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "Authentication table"); d.hidden = true;
  const title = mk("div", "lbl dtitle"); title.textContent = "Auth table (today)"; place(title, 10, 8, 200, 10);
  const close = mk("button", "sbtn"); close.type = "button"; close.textContent = "Close"; close.setAttribute("aria-label", "Close the table (Esc)"); place(close, 420, 4, 56, 16); sliceVars(close, "btn");
  close.addEventListener("click", () => actions.closeDrawer());
  const tbl = mk("table", "authtbl"); tbl.setAttribute("aria-label", "Authentication table, rows by columns"); place(tbl, 10, 26, 438, 298);
  const cells: HTMLTableCellElement[][] = [], colH: HTMLElement[] = [], rowH: HTMLElement[] = [];
  const head = mk("tr", ""); head.append(mk("th", ""));
  for (let c = 0; c < 26; c++) { const th = mk("th", ""); th.textContent = L(c); colH.push(th); head.append(th); }
  tbl.append(head);
  for (let r = 0; r < 26; r++) {
    const tr = mk("tr", ""), th = mk("th", ""); th.textContent = L(r); rowH.push(th); tr.append(th);
    const row: HTMLTableCellElement[] = [];
    for (let c = 0; c < 26; c++) { const td = mk("td", ""); td.textContent = (table[r] as readonly string[])[c] as string; td.addEventListener("click", () => actions.lookupCell(L(r), L(c))); row.push(td); tr.append(td); }
    cells.push(row); tbl.append(tr);
  }
  const read = mk("div", "typ dread"); place(read, 10, 326, 470, 14); read.setAttribute("aria-live", "polite");
  d.append(title, close, tbl, read);
  root.append(d);

  let prevR = -1, prevC = -1, prevChal: HTMLElement | null = null, opener: Element | null = null;
  const hl = (r: number, c: number, on: boolean): void => {
    if (r >= 0) { (cells[r] as HTMLTableCellElement[]).forEach((td) => setClass(td, "r", on)); setClass(rowH[r] as HTMLElement, "hl", on); }
    if (c >= 0) { cells.forEach((row) => setClass(row[c] as HTMLElement, "c", on)); setClass(colH[c] as HTMLElement, "hl", on); }
    if (r >= 0 && c >= 0) setClass((cells[r] as HTMLTableCellElement[])[c] as HTMLElement, "cur", on);
  };
  const refresh = (): void => {
    const s = store.state, lk = s.lookup;
    const open = s.drawer === "auth";
    if (open && d.hidden) {
      opener = document.activeElement;
      d.hidden = false;
      for (const el of root.querySelectorAll<HTMLElement>(":scope > .sc")) if (el !== d) el.setAttribute("inert", "");
      close.focus();
    } else if (!open && !d.hidden) {
      d.hidden = true;
      for (const el of root.querySelectorAll<HTMLElement>(":scope > [inert]")) el.removeAttribute("inert");
      if (opener instanceof HTMLElement) opener.focus();
      opener = null;
    }
    const r = idx(lk.row), c = idx(lk.col);
    if (prevR !== r || prevC !== c) { hl(prevR, prevC, false); hl(r, c, true); prevR = r; prevC = c; }
    const rx = store.activeView(), ch = rx?.challenge ?? null;
    const target = ch ? ((cells[idx(ch.row)] as HTMLTableCellElement[])[idx(ch.col)] as HTMLElement) : null;
    if (prevChal !== target) { if (prevChal) setClass(prevChal, "chal", false); if (target) setClass(target, "chal", true); prevChal = target; }
    const look = r >= 0 && c >= 0 ? `ROW ${lk.row} x COL ${lk.col} = ${(table[r] as readonly string[])[c]}` : `Type ROW then COLUMN letter (row ${lk.row ?? "_"}, col ${lk.col ?? "_"})`;
    const chal = ch ? `   Challenge #${rx?.rxId}: ${ch.row}${ch.col}, reply ${ch.reply ?? "waiting"}${ch.result === null ? "" : ch.result === "ok" ? ", AUTH OK" : ch.result === "wrong" ? ", AUTH FAIL" : ", CELL USED"}` : "";
    setText(read, look + chal);
  };
  ctx.scope.on(["drawer", "challenge", "rx"], refresh);
  refresh();
}
