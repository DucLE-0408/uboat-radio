import { setClass, setText } from "../dom";
import { formatClock, type Drawer } from "../store";
import { place, sliceVars } from "./px";
import type { SceneCtx } from "./scope";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };
const L = (i: number): string => String.fromCharCode(65 + i);
const idx = (s: string | null): number => (s === null ? -1 : s.charCodeAt(0) - 65);
const NS = "http://www.w3.org/2000/svg";
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

interface Shell { readonly el: HTMLElement; readonly content: HTMLElement; readonly close: HTMLButtonElement }

function shell(ctx: SceneCtx, id: Drawer, title: string): Shell {
  const d = mk("aside", `sc drawer d-${id}`); place(d, 148, 8, 484, 344);
  d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", title); d.hidden = true;
  const t = mk("div", "lbl dtitle"); t.textContent = title; place(t, 10, 8, 300, 10);
  const close = mk("button", "sbtn dclose"); close.type = "button"; close.textContent = "Close"; close.setAttribute("aria-label", `Close ${title} (Esc)`); place(close, 420, 4, 56, 16); sliceVars(close, "btn");
  close.addEventListener("click", () => ctx.actions.closeDrawer());
  const content = mk("div", "dcontent"); place(content, 0, 24, 484, 320);
  d.append(t, close, content);
  return { el: d, content, close };
}

/** Auth table, sonar and event log drawers. One is open at a time; the rest of the scene is inert while it is open; Esc closes. */
export function mountDrawers(ctx: SceneCtx, root: HTMLElement): void {
  const { store } = ctx;
  const auth = buildAuth(ctx), sonar = buildSonar(ctx), log = buildLog(ctx);
  const all: [Drawer, Shell][] = [["auth", auth], ["sonar", sonar], ["log", log]];
  for (const [, sh] of all) root.append(sh.el);
  let opener: Element | null = null, openId: Drawer | null = null;
  const sync = (): void => {
    const want = store.state.drawer;
    if (want === openId) return;
    if (openId === null && want !== null) opener = document.activeElement;
    openId = want;
    for (const [id, sh] of all) sh.el.hidden = id !== want;
    const inline = root.dataset["layout"] === "mobile"; // mobile: drawers are tabs, not modal overlays
    for (const el of root.querySelectorAll<HTMLElement>(":scope > .sc")) {
      if (!inline && want !== null && !el.classList.contains("drawer")) el.setAttribute("inert", ""); else el.removeAttribute("inert");
    }
    if (inline) return;
    if (want !== null) (all.find(([id]) => id === want) as [Drawer, Shell])[1].close.focus();
    else { if (opener instanceof HTMLElement) opener.focus(); opener = null; }
  };
  ctx.scope.on(["drawer"], sync);
  sync();
}

/** Full 26x26 authentication table. Alt+L (or the Table button) opens it with lookup on. */
function buildAuth(ctx: SceneCtx): Shell {
  const { store, watch, actions } = ctx;
  const sh = shell(ctx, "auth", "Auth table (today)");
  const table = watch.dayTable(); // the player's own pre-shared book (observation helper)
  const tbl = mk("table", "authtbl"); tbl.setAttribute("aria-label", "Authentication table, rows by columns"); place(tbl, 10, 2, 438, 298);
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
  const read = mk("div", "typ dread"); place(read, 10, 302, 470, 14); read.setAttribute("aria-live", "polite");
  // touch pickers (used by the tablet/mobile layouts): choose ROW then COLUMN with large targets
  const picker = mk("div", "picker");
  const mkPick = (kind: "row" | "col"): HTMLElement => {
    const g = mk("div", "pick"); g.setAttribute("role", "group"); g.setAttribute("aria-label", kind === "row" ? "Row letter" : "Column letter");
    for (let i = 0; i < 26; i++) { const b = mk("button", "sbtn pk"); b.type = "button"; b.textContent = L(i); b.addEventListener("click", () => { const lk = store.state.lookup; actions.lookupCell(kind === "row" ? L(i) : lk.row ?? "A", kind === "col" ? L(i) : lk.col ?? "A"); }); g.append(b); }
    return g;
  };
  picker.append(mkPick("row"), mkPick("col"));
  const wrap = mk("div", "tblwrap"); wrap.append(tbl);
  sh.content.append(wrap, read, picker);

  let prevR = -1, prevC = -1, prevChal: HTMLElement | null = null;
  const hl = (r: number, c: number, on: boolean): void => {
    if (r >= 0) { (cells[r] as HTMLTableCellElement[]).forEach((td) => setClass(td, "r", on)); setClass(rowH[r] as HTMLElement, "hl", on); }
    if (c >= 0) { cells.forEach((row) => setClass(row[c] as HTMLElement, "c", on)); setClass(colH[c] as HTMLElement, "hl", on); }
    if (r >= 0 && c >= 0) setClass((cells[r] as HTMLTableCellElement[])[c] as HTMLElement, "cur", on);
  };
  const refresh = (): void => {
    const lk = store.state.lookup;
    const r = idx(lk.row), c = idx(lk.col);
    if (prevR !== r || prevC !== c) { hl(prevR, prevC, false); hl(r, c, true); prevR = r; prevC = c; }
    const rx = store.activeView(), ch = rx?.challenge ?? null;
    const target = ch ? ((cells[idx(ch.row)] as HTMLTableCellElement[])[idx(ch.col)] as HTMLElement) : null;
    if (prevChal !== target) { if (prevChal) setClass(prevChal, "chal", false); if (target) setClass(target, "chal", true); prevChal = target; }
    const look = r >= 0 && c >= 0 ? `ROW ${lk.row} x COL ${lk.col} = ${(table[r] as readonly string[])[c]}` : `Type ROW then COLUMN letter (row ${lk.row ?? "_"}, col ${lk.col ?? "_"})`;
    const chal = ch ? `   Challenge #${rx?.rxId}: ${ch.row}${ch.col}, reply ${ch.reply ?? "waiting"}${ch.result === null ? "" : ch.result === "ok" ? ", AUTH OK" : ch.result === "wrong" ? ", AUTH FAIL" : ", CELL USED"}` : "";
    setText(read, look + chal);
  };
  ctx.scope.on(["challenge", "rx", "drawer"], refresh);
  refresh();
  return sh;
}

/** Bearing dial + contact list + hydrophone. Shows noisy bearing, blade rate and class only; there is no range anywhere. */
function buildSonar(ctx: SceneCtx): Shell {
  const { store, actions } = ctx;
  const sh = shell(ctx, "sonar", "Sonar / hydrophone");
  const dial = svg("svg", { class: "dial", viewBox: "-90 -90 180 180", role: "img", "aria-label": "Hydrophone bearing dial, north up" });
  dial.append(svg("circle", { r: "78" }), svg("circle", { r: "40" }), svg("line", { x1: "0", y1: "-78", x2: "0", y2: "78" }), svg("line", { x1: "-78", y1: "0", x2: "78", y2: "0" }));
  for (const [t, x, y] of [["N", 0, -80], ["E", 84, 3], ["S", 0, 88], ["W", -84, 3]] as const) { const tx = svg("text", { x: String(x), y: String(y) }); tx.textContent = t; dial.append(tx); }
  const hdg = svg("line", { class: "hdg", x1: "0", y1: "0", x2: "0", y2: "-34" }); dial.append(hdg);
  const dialBox = mk("div", "dialbox"); place(dialBox, 14, 10, 180, 180); dialBox.append(dial);
  const note = mk("div", "typ snote"); place(note, 206, 10, 266, 40); note.textContent = "Bearings are noisy estimates. Distance is not measured. Fast screws (blade rate >= 9 Hz) suggest an escort; slow screws could be a merchant or a U-boat.";
  const quiet = mk("div", "typ squiet"); place(quiet, 206, 60, 266, 14); quiet.textContent = "Hydrophone: quiet.";
  const tbl = mk("table", "sonartbl"); place(tbl, 206, 60, 266, 120);
  tbl.setAttribute("aria-label", "Hydrophone contacts");
  const thead = mk("thead", ""); const hr = mk("tr", ""); for (const h of ["#", "Bearing", "Blade rate", "Class", ""]) { const th = mk("th", ""); th.textContent = h; hr.append(th); } thead.append(hr);
  const body = mk("tbody", ""); tbl.append(thead, body);
  const listening = mk("div", "typ slisten"); place(listening, 14, 200, 458, 14); listening.setAttribute("aria-live", "polite");
  sh.content.append(dialBox, note, quiet, tbl, listening);

  const blips = new Map<number, SVGGElement>(), rows = new Map<number, { tr: HTMLElement; tds: HTMLElement[]; btn: HTMLButtonElement }>();
  const refresh = (): void => {
    const s = store.state;
    hdg.setAttribute("transform", `rotate(${s.boat.headingDeg})`);
    const heard = [...s.sonar.values()].filter((c) => c.audible);
    quiet.hidden = heard.length > 0; tbl.hidden = heard.length === 0;
    for (const c of s.sonar.values()) {
      let g = blips.get(c.id);
      if (!g) { g = svg("g"); g.append(svg("circle", { r: "5", class: "blip" })); dial.append(g); blips.set(c.id, g); }
      g.style.display = c.audible ? "" : "none";
      (g.firstChild as SVGCircleElement).setAttribute("class", `blip ${c.guess}`);
      const a = (c.bearingDeg * Math.PI) / 180;
      g.setAttribute("transform", `translate(${(Math.sin(a) * 60).toFixed(1)} ${(-Math.cos(a) * 60).toFixed(1)})`); // fixed radius: no range information
      let r = rows.get(c.id);
      if (!r) {
        const tr = mk("tr", ""), tds = [mk("td", ""), mk("td", ""), mk("td", ""), mk("td", ""), mk("td", "")];
        const btn = mk("button", "sbtn"); btn.type = "button"; btn.addEventListener("click", () => actions.toggleHydrophone(c.id)); sliceVars(btn, "btn"); (tds[4] as HTMLElement).append(btn);
        tr.append(...tds); body.append(tr); r = { tr, tds, btn }; rows.set(c.id, r);
      }
      r.tr.hidden = !c.audible;
      setText(r.tds[0] as HTMLElement, String(c.id));
      setText(r.tds[1] as HTMLElement, `${String(Math.round(c.bearingDeg) % 360).padStart(3, "0")}° ±`);
      setText(r.tds[2] as HTMLElement, `${c.bladeRateHz.toFixed(1)} Hz`);
      setText(r.tds[3] as HTMLElement, c.guess === "escort" ? "ESCORT (fast)" : "slow");
      setClass(r.tds[3] as HTMLElement, "alert", c.guess === "escort");
      const on = s.hydrophone === c.id;
      setText(r.btn, on ? "Stop" : "Listen"); r.btn.setAttribute("aria-pressed", String(on)); r.btn.setAttribute("aria-label", `${on ? "Stop listening to" : "Listen to"} contact ${c.id}`); setClass(r.btn, "on", on);
    }
    setText(listening, s.hydrophone === null ? "" : `Listening to contact ${s.hydrophone} (stereo pan follows the bearing, beat follows the blade rate).`);
  };
  ctx.scope.on(["sonar", "boat", "drawer"], refresh);
  refresh();
  return sh;
}

/** Event log (sanitised player-visible lines only). */
function buildLog(ctx: SceneCtx): Shell {
  const { store } = ctx;
  const sh = shell(ctx, "log", "Event log");
  const list = mk("ul", "evlog"); list.setAttribute("role", "log"); list.setAttribute("aria-label", "Event log"); place(list, 10, 2, 464, 312);
  sh.content.append(list);
  let shown = 0, first: unknown = null;
  const refresh = (): void => {
    const lines = store.state.log;
    if (lines[0] !== first) { list.replaceChildren(); shown = 0; first = lines[0]; }
    for (let i = shown; i < lines.length; i++) {
      const l = lines[i]!, li = mk("li", l.level === "info" ? "" : l.level), t = mk("time", ""); t.textContent = formatClock(l.tSec);
      li.append(t, document.createTextNode(l.text)); list.append(li);
    }
    shown = lines.length;
    while (list.childElementCount > 150) list.firstElementChild?.remove();
    list.scrollTop = list.scrollHeight;
  };
  ctx.scope.on(["log"], refresh);
  refresh();
  return sh;
}
