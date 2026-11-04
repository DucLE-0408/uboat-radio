import { h, panel, setClass, setText } from "../dom";
import type { Ctx, Panel } from "../ctx";

const L = (i: number): string => String.fromCharCode(65 + i);

/** 26x26 day table (built once) with a row/column cursor. Alt+L then two letters, or click a cell. */
export function mountAuthTable(ctx: Ctx): Panel {
  const { store, watch, actions } = ctx;
  const table = watch.dayTable(); // the player's own pre-shared book, an observation helper
  const cells: HTMLTableCellElement[][] = [];
  const colHeads: HTMLElement[] = [];
  const rowHeads: HTMLElement[] = [];
  const tbl = h("table", { class: "auth", attrs: { "aria-label": "authentication table, rows by columns" } });
  const head = h("tr", {}, h("th", { class: "rh", text: "" }));
  for (let c = 0; c < 26; c++) { const th = h("th", { text: L(c) }); colHeads.push(th); head.append(th); }
  tbl.append(head);
  for (let r = 0; r < 26; r++) {
    const tr = h("tr");
    const rh = h("th", { class: "rh", text: L(r) });
    rowHeads.push(rh);
    tr.append(rh);
    const row: HTMLTableCellElement[] = [];
    for (let c = 0; c < 26; c++) {
      const td = h("td", { text: (table[r] as readonly string[])[c] as string, on: { click: () => actions.lookupCell(L(r), L(c)) } });
      row.push(td);
      tr.append(td);
    }
    cells.push(row);
    tbl.append(tr);
  }
  const readout = h("div", { class: "hi", attrs: { "aria-live": "polite" } });
  const chal = h("div", { class: "dim" });
  const hint = h("div", { class: "legend", text: "Alt+L: type ROW then COLUMN letter · Enter/Alt+L leaves lookup" });
  const wrap = h("div", { class: "authwrap" }, tbl);
  const el = panel("auth", "Auth table (today)", wrap, readout, chal, hint);

  let prevRow = -1, prevCol = -1, prevChal: HTMLElement | null = null;
  const idx = (s: string | null): number => (s === null ? -1 : s.charCodeAt(0) - 65);
  const mark = (r: number, c: number, on: boolean, cls: "r" | "c" | "cur"): void => {
    if (cls === "cur") { if (r >= 0 && c >= 0) setClass((cells[r] as HTMLTableCellElement[])[c] as HTMLElement, "cur", on); return; }
    if (cls === "r" && r >= 0) { (cells[r] as HTMLTableCellElement[]).forEach((td) => setClass(td, "r", on)); setClass(rowHeads[r] as HTMLElement, "hl", on); }
    if (cls === "c" && c >= 0) { cells.forEach((row) => setClass(row[c] as HTMLElement, "c", on)); setClass(colHeads[c] as HTMLElement, "hl", on); }
  };

  const refresh = (): void => {
    const lk = store.state.lookup;
    const r = idx(lk.row), c = idx(lk.col);
    if (prevRow !== r || prevCol !== c) {
      mark(prevRow, prevCol, false, "cur"); mark(prevRow, prevCol, false, "r"); mark(prevRow, prevCol, false, "c");
      mark(r, c, true, "r"); mark(r, c, true, "c"); mark(r, c, true, "cur");
      prevRow = r; prevCol = c;
    }
    setText(readout, r >= 0 && c >= 0
      ? `ROW ${lk.row} × COL ${lk.col} = ${(table[r] as readonly string[])[c]}`
      : lk.active ? `Lookup: row ${lk.row ?? "_"} × col ${lk.col ?? "_"}` : "Lookup off");
    // highlight the cell of the challenge we sent for the active message
    const rx = store.activeView();
    const ch = rx?.challenge;
    const target = ch ? ((cells[idx(ch.row)] as HTMLTableCellElement[])[idx(ch.col)] as HTMLElement) : null;
    if (prevChal !== target) { if (prevChal) setClass(prevChal, "chal", false); if (target) setClass(target, "chal", true); prevChal = target; }
    setText(chal, ch
      ? `Challenge #${rx?.rxId}: ${ch.row}${ch.col} · reply: ${ch.reply ?? "waiting…"} · ${ch.result === null ? (ch.reply ? "compare with the table, then check (Alt+K)" : "") : ch.result === "ok" ? "AUTH OK" : ch.result === "wrong" ? "AUTH FAILED" : "CELL ALREADY USED"}`
      : "No challenge sent for this message.");
  };
  store.on(["challenge", "rx"], refresh);
  refresh();
  return { el };
}
