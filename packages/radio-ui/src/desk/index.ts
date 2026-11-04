// Desk UI (docs/specs/desk-ui): the desk frame, stations and the paper sheets.
// Presentation only: it reads the P5 store and reuses the P5 boat cutaway; every decision goes through ctx.actions.
import type { Ctx } from "../ctx";
import { h, setAttr, setClass, setText } from "../dom";
import { t } from "../i18n";
import { formatClock, formatDtg, type RxView } from "../store";
import { planMorse } from "../audio/morse";
import { assetErrors, preloadSprites } from "../scene/assets";
import { mountBoat } from "../scene/boat";
import { makeDecor } from "../scene/decor";
import { computeScale, paint, place, setFrame } from "../scene/px";
import { Reveal } from "../scene/reveal";
import { createScope, type SceneCtx } from "../scene/scope";
import { mountSummary } from "../scene/summary";
import { mountToast } from "../scene/toast";
import { DESK_KEY, PaperModel, parseLayout, type Paper } from "./papers";
import { Printer } from "./printer";
import { flipButton, groupGrid, mountSheet, type SheetHost, type SheetView } from "./sheets";
import "../scene/scene.css";
import "./desk.css";

/** Station geometry (logical px); mirrors DESK in tools/art/desk.ts. */
const G = {
  top: { x: 144, y: 104, w: 280, h: 248 },
  door: { x: 8, y: 104, w: 132, h: 132 },
  controls: { x: 8, y: 240, w: 132, h: 112 },
  tty: { x: 428, y: 104, w: 204, h: 132 },
  stamper: { x: 428, y: 240, w: 204, h: 60 },
  machine: { x: 428, y: 304, w: 204, h: 48 },
} as const;
const MIN_W = 1280, MIN_H = 720;
const GRID_MIN = 20; // 4 x 5 cells fill the group area; more groups scroll
const SAVE_DELAY_MS = 400;

const box = (cls: string, x: number, y: number, w: number, hh: number, sprite?: string): HTMLElement => {
  const e = h("div", { class: `sc ${cls}` }); place(e, x, y, w, hh); if (sprite) paint(e, sprite); return e;
};
const label = (cls: string, text: string, x: number, y: number, w: number, hh: number): HTMLElement => {
  const e = h("div", { class: `dlbl ${cls}`, text }); place(e, x, y, w, hh); return e;
};
const groupsOf = (text: string): string[] => text.split(" ").filter((x) => x.length > 0);

interface Live { readonly view: SheetView; refresh(now: number): void }

export function mountDesk(base: Ctx, app: HTMLElement): { frame(): void; dispose(): void } {
  const scope = createScope(base);
  const ctx: SceneCtx = { ...base, scope, reveal: new Reveal() };
  const { store, watch, actions } = ctx;
  const decor = makeDecor(base.cosmeticSeed);
  app.classList.add("p5"); document.body.classList.add("p5");
  const scene = h("div", { class: "scene desk deskui l-desktop", attrs: { role: "main", "aria-label": t("desk.aria") } });
  scene.dataset["layout"] = "desktop";
  // Desktop only (R1): below 1280x720 the desk is not laid out; the player is pointed to the radio room.
  const small = h("div", { class: "desk-small", attrs: { role: "alert" } }, h("p", { text: t("desk.desktopOnly") }),
    h("a", { attrs: { href: `${location.pathname}?ui=p5` }, text: t("desk.toRoom") }));
  app.append(scene, small);
  let px = 2;
  const fit = (): void => {
    const ok = window.innerWidth >= MIN_W && window.innerHeight >= MIN_H;
    scene.hidden = !ok; small.hidden = ok;
    px = Math.max(2, computeScale(window.innerWidth, window.innerHeight));
    document.documentElement.style.setProperty("--px", String(px));
  };
  fit();
  window.addEventListener("resize", fit);

  scene.append(h("h2", { text: t("desk.title") }));
  const bg = box("scenebg", 0, 0, 640, 360, "desk-bg"); scene.append(bg);
  const boat = mountBoat(ctx, scene, decor);

  // ---- door (crew arrive in Stage 4)
  const door = h("section", { class: "sc ddoor", attrs: { "aria-label": t("desk.door") } }); place(door, G.door.x, G.door.y, G.door.w, G.door.h); paint(door, "desk-door");
  door.append(label("plate", t("desk.door"), 44, 1, 44, 6), label("dim center", t("desk.door.empty"), 16, 96, 100, 10));
  scene.append(door);

  // ---- boat controls (wired in Stage 4; values shown read-only)
  const ctl = h("section", { class: "sc dctl", attrs: { "aria-label": t("desk.controls") } }); place(ctl, G.controls.x, G.controls.y, G.controls.w, G.controls.h); paint(ctl, "desk-controls");
  const txClock = label("tx typ", "", 12, 89, 108, 9);
  ctl.append(label("strip", t("desk.controls"), 4, 3, 124, 8), label("dim center", t("desk.ctl.dive"), 2, 14, 30, 6), label("dim center", t("desk.ctl.speed"), 36, 14, 48, 6),
    label("dim center", t("desk.ctl.silence"), 88, 43, 42, 6), label("dim center", t("desk.ctl.report"), 88, 73, 42, 6), txClock);
  scene.append(ctl);

  // ---- Teletyper: signal lamp, print state, Repeat (R3)
  const tty = h("section", { class: "sc dtty", attrs: { "aria-label": t("desk.teletyper") } }); place(tty, G.tty.x, G.tty.y, G.tty.w, G.tty.h); paint(tty, "desk-tty");
  const ttyLamp = box("lamp", 15, 107, 10, 10, "desk-tty-lamp");
  const ttyState = label("typ ttys", "", 32, 107, 108, 10);
  ttyState.setAttribute("aria-live", "polite");
  const repeatBtn = h("button", { class: "dkey", attrs: { type: "button", title: t("desk.tt.repeatHint") }, text: t("desk.tt.repeat") }); place(repeatBtn, 146, 106, 48, 14);
  repeatBtn.addEventListener("click", () => actions.repeat());
  tty.append(label("plate", t("desk.teletyper"), 72, 95, 60, 8), ttyLamp, ttyState, repeatBtn);
  scene.append(tty);

  // ---- Echo stamper (Stage 3)
  const st = h("section", { class: "sc dst", attrs: { "aria-label": t("desk.stamper") } }); place(st, G.stamper.x, G.stamper.y, G.stamper.w, G.stamper.h); paint(st, "desk-stamper");
  const sw = box("sw", 13, 16, 20, 30, "desk-st-switch"); setFrame(sw, "desk-st-switch", 0);
  const ready = box("lamp", 166, 22, 12, 12, "desk-st-lamp");
  st.append(label("strip", t("desk.stamper"), 4, 2, 120, 8), sw, label("dim", t("desk.st.true"), 38, 18, 30, 7), label("dim", t("desk.st.false"), 38, 40, 30, 7),
    ready, label("dim center", t("desk.st.ready"), 148, 40, 48, 7));
  scene.append(st);

  // ---- cipher machine, pushed in (Stage 3): rotor windows show the indicator of the current message
  const mach = h("section", { class: "sc dmach", attrs: { "aria-label": t("desk.machine") } }); place(mach, G.machine.x, G.machine.y, G.machine.w, G.machine.h); paint(mach, "desk-machine-tab");
  const wins = [0, 1, 2, 3].map((k) => label("win typ center", "", 24 + k * 22, 15, 14, 14));
  mach.append(...wins, label("dim center", t("desk.machine"), 16, 37, 96, 7));
  scene.append(mach);

  const ration = h("div", { class: "sc dration", attrs: { role: "status" } }); place(ration, 352, 112, 64, 18);
  const rationV = h("span", { class: "typ", text: "0" }); // the counter is wired in G2 (R10)
  ration.append(h("span", { class: "dlbl", text: t("desk.score") }), rationV);
  scene.append(ration);
  scene.append(label("note typ", t("desk.preview"), G.top.x + 10, G.top.y + G.top.h - 26, G.top.w - 20, 18));

  // ---------------------------------------------------------------- papers (R2)
  const layer = h("div", { class: "sc dlayer" }); place(layer, 0, 0, 640, 360);
  const live = h("div", { class: "sr-only", attrs: { "aria-live": "polite" } });
  const help = h("div", { class: "sr-only", attrs: { id: "desk-sheet-help" }, text: t("desk.sheet.help") });
  scene.append(layer, live, help);
  const model = new PaperModel();
  let storage: Storage | null = null;
  try { storage = window.localStorage; } catch { storage = null; }
  try { model.restore(parseLayout(storage?.getItem(DESK_KEY) ?? null, ctx.seed)); } catch { /* unreadable storage: default layout */ }
  let saveTimer: ReturnType<typeof setTimeout> | null = null, saveWarned = false;
  const saveNow = (): void => {
    saveTimer = null;
    try { storage?.setItem(DESK_KEY, model.serialize(ctx.seed)); } catch { if (!saveWarned) { saveWarned = true; ctx.diag.err("save", "DESK_SAVE_FAILED"); } }
  };
  const views = new Map<string, Live>();
  const host: SheetHost = {
    model,
    px: () => px,
    changed: () => { for (const v of views.values()) v.view.sync(); if (saveTimer === null) saveTimer = setTimeout(saveNow, SAVE_DELAY_MS); },
    announce: (text) => setText(live, text),
  };
  const printer = new Printer();
  const add = (p: Paper, make: (p: Paper) => Live): void => {
    model.applyPending(p);
    const v = make(p);
    views.set(p.id, v);
    layer.append(v.view.el);
    v.view.sync();
    v.refresh(performance.now());
  };

  // Mission sheet (ticks arrive in Stage 3)
  const mission = (p: Paper): Live => {
    const view = mountSheet(host, p, "desk-mission", t("desk.mission"), "dmis");
    view.front.append(label("ink", t("desk.mission"), 6, 9, 116, 7));
    (["desk.mission.1", "desk.mission.2", "desk.mission.3", "desk.mission.4"] as const).forEach((k, r) => view.front.append(label("ink typ small", t(k), 16, 17 + r * 12, 108, 8)));
    return { view, refresh: () => {} };
  };

  // Input sheet: what the Teletyper printed for one attempt (R3.2); a repeat prints a new sheet (R3.3)
  const input = (p: Paper): Live => {
    const rxId = p.rxId as number, attempt = p.attempt as number;
    const title = t("desk.paper.inputN", { rx: rxId, n: attempt + 1 }); // attempts are 0-based in the sim, shown 1-based like P5
    const view = mountSheet(host, p, "paper-input", title, "din");
    const fv = { from: label("ink typ", "", 50, 21, 54, 9), time: label("ink typ", "", 50, 33, 54, 9), ind: label("ink typ", "", 50, 45, 54, 9) };
    const grid = groupGrid(7, 61, 98, 78, GRID_MIN);
    view.front.append(label("strip", title, 4, 5, 88, 9), label("ink fld", t("desk.paper.from"), 6, 22, 42, 7), label("ink fld", t("desk.paper.time"), 6, 34, 42, 7),
      label("ink fld", t("desk.paper.indicator"), 6, 46, 42, 7), fv.from, fv.time, fv.ind, grid.el, flipButton(host, p, view, 94, 4));
    view.back.append(label("ink", t("desk.paper.back"), 4, 4, 88, 7), label("faint center", t("desk.paper.echo"), 8, 40, 96, 9),
      label("faint center", t("desk.paper.stamp"), 8, 89, 44, 7), label("faint center", t("desk.paper.stamp"), 60, 89, 44, 7), label("ink", t("desk.paper.sign"), 10, 131, 60, 7),
      flipButton(host, p, view, 94, 2));
    let last = -1;
    return {
      view,
      refresh: (now) => {
        const rx = store.state.rx.get(rxId), a = rx?.attempts.find((x) => x.attempt === attempt);
        if (!rx || !a) return;
        const copy = watch.copy(a.tokens); // what the line printed: letters, ? where noise ate a symbol
        const k = printer.visible(p.id, copy, now);
        if (k === last) return;
        last = k;
        setText(fv.from, rx.from); setText(fv.time, formatDtg(rx.sentAtMin)); setText(fv.ind, a.indicator);
        const shown = groupsOf(copy.slice(0, k));
        grid.set(shown.map((g) => ({ text: g })), t("desk.paper.groupsCount", { n: shown.length }));
        setClass(view.el, "printing", k < copy.length);
      },
    };
  };

  // Output sheet: your copy while you type it, the plain text by group after decoding (R4.2)
  const output = (p: Paper): Live => {
    const rxId = p.rxId as number, attempt = p.attempt as number;
    const title = t("desk.paper.outputN", { rx: rxId, n: attempt + 1 });
    const view = mountSheet(host, p, "paper-output", title, "dout");
    const fv = { from: label("ink typ", "", 50, 21, 54, 9), ind: label("ink typ", "", 50, 33, 54, 9) };
    const grid = groupGrid(7, 49, 98, 78, GRID_MIN);
    const status = label("ink typ small", "", 8, 129, 96, 9);
    view.front.append(label("strip", title, 4, 5, 88, 9), label("ink fld", t("desk.paper.from"), 6, 22, 42, 7), label("ink fld", t("desk.paper.indicator"), 6, 34, 42, 7),
      fv.from, fv.ind, grid.el, status, flipButton(host, p, view, 94, 4));
    view.back.append(label("ink", t("desk.paper.back"), 4, 4, 88, 7), label("faint center", t("desk.paper.stampRed"), 8, 50, 96, 9), label("ink", t("desk.paper.sign"), 10, 131, 60, 7),
      flipButton(host, p, view, 94, 2));
    return {
      view,
      refresh: () => {
        const rx = store.state.rx.get(rxId), a = rx?.attempts.find((x) => x.attempt === attempt);
        if (!rx || !a) return;
        setText(fv.from, rx.from); setText(fv.ind, a.indicator);
        const an = rx.analysis.get(attempt);
        if (an) {
          grid.set(an.words.map((w) => ({ text: w.plain, bad: !w.ok })), t("desk.out.plainLabel"));
          setText(status, t("desk.out.damaged", { n: an.damagedGroups }));
        } else {
          const text = store.copyText(rxId, attempt), ws = groupsOf(text), typing = text.length > 0 && !text.endsWith(" ");
          grid.set(ws.map((w, i) => ({ text: w, cur: typing && i === ws.length - 1 })), t("desk.out.copyLabel"));
          setText(status, t("desk.out.hint"));
        }
        setClass(view.el, "active", store.state.activeRx === rxId && store.state.activeAttempt === attempt);
      },
    };
  };

  add(model.ensure("mission"), mission);
  const known = new Set<string>(); // attempts present at mount are printed already (silent rebuild, R3.4)
  for (const rx of store.state.rx.values()) for (const a of rx.attempts) known.add(`${rx.rxId}:${a.attempt}`);
  const syncPapers = (): void => {
    const now = performance.now();
    for (const id of store.state.order) {
      const rx = store.state.rx.get(id) as RxView | undefined;
      if (!rx) continue;
      for (const a of rx.attempts) {
        const key = `${rx.rxId}:${a.attempt}`;
        const inId = `in:${key}`;
        if (!views.has(inId)) {
          const fresh = !known.has(key) && !store.state.replaying;
          known.add(key);
          const p = model.ensure("input", rx.rxId, a.attempt);
          if (fresh) printer.start(inId, a.tokens, watch.copy(a.tokens), now, planMorse(a.tokens, rx.txFist, rx.from, a.snrDb, ctx.cosmeticSeed, rx.rxId, a.attempt).endSec);
          add(p, input);
        }
        const outId = `out:${key}`;
        if (!views.has(outId) && (store.copyText(rx.rxId, a.attempt).length > 0 || rx.analysis.has(a.attempt))) add(model.ensure("output", rx.rxId, a.attempt), output);
      }
    }
    for (const v of views.values()) v.refresh(now);
  };

  const toast = mountToast(ctx, scene);
  mountSummary(ctx, scene);

  let blink = false, nextBlink = 0;
  const stations = (now: number): void => {
    const s = store.state;
    const rx = s.activeRx !== null ? s.rx.get(s.activeRx) ?? null : null;
    const at = rx ? rx.attempts.find((a) => a.attempt === s.activeAttempt) ?? rx.attempts[rx.attempts.length - 1] ?? null : null;
    const open = rx !== null && rx.resolved === null;
    const printing = printer.busy();
    if (printing && now >= nextBlink) { blink = !blink; nextBlink = now + 260; }
    setFrame(ttyLamp, "desk-tty-lamp", printing ? (blink ? 1 : 0) : open ? 1 : 0);
    setText(ttyState, printing ? t("desk.tt.printing") : open ? t("desk.tt.incoming") : t("desk.tt.idle"));
    repeatBtn.disabled = !open;
    setAttr(repeatBtn, "aria-label", t("desk.tt.repeatHint"));
    setFrame(ready, "desk-st-lamp", open ? 1 : 0);
    wins.forEach((w, k) => setText(w, at?.indicator[k] ?? ""));
    setText(txClock, `${t("desk.ctl.tx")} ${formatClock(s.tx.totalSec)}`);
    setClass(scene, "silent", s.boat.silence);
  };
  scope.on(["rx", "copy", "analysis", "clock", "boat", "tx", "ui"], () => { syncPapers(); stations(performance.now()); });
  syncPapers(); stations(performance.now());
  const onHide = (): void => { if (saveTimer !== null) { clearTimeout(saveTimer); saveNow(); } };
  window.addEventListener("pagehide", onHide);
  void preloadSprites().then((fails) => { for (const code of assetErrors) ctx.diag.err("asset", code); if (fails > 0) scene.classList.add("no-sprites"); });

  return {
    frame: () => {
      const now = performance.now();
      boat.frame(now); toast.frame();
      if (printer.busy()) { for (const v of views.values()) v.refresh(now); stations(now); }
      else if (blink) { blink = false; stations(now); }
    },
    dispose: () => {
      window.removeEventListener("resize", fit); window.removeEventListener("pagehide", onHide);
      onHide();
      ctx.morse.stop(); scope.dispose();
      app.classList.remove("p5"); document.body.classList.remove("p5");
      scene.remove(); small.remove();
    },
  };
}
