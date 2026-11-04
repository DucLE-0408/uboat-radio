// Desk UI (docs/specs/desk-ui): the desk frame, stations, paper sheets, tools and the Echo stamper.
// Presentation only: it reads the P5 store and reuses the P5 boat cutaway; every decision goes through ctx.actions.
import type { Ctx } from "../ctx";
import { h, setAttr, setClass, setText } from "../dom";
import { t } from "../i18n";
import { formatClock, formatDtg, type RxView } from "../store";
import { cosmeticRng } from "../audio/morse";
import { schedule } from "@uboat/sim-core";
import { assetErrors, preloadSprites } from "../scene/assets";
import { mountBoat } from "../scene/boat";
import { makeDecor } from "../scene/decor";
import { computeScale, paint, place, setFrame } from "../scene/px";
import { Reveal } from "../scene/reveal";
import { createScope, type SceneCtx } from "../scene/scope";
import { mountMachine } from "../scene/machine";
import { mountSummary } from "../scene/summary";
import { mountToast } from "../scene/toast";
import { EchoPress, type EchoDecision } from "./echo";
import { DESK_KEY, PaperModel, parseLayout, type MarkResult, type Paper, type StampColor } from "./papers";
import { canTrash, checkHandOver } from "./rules";
import { Printer, tokenEnds } from "./printer";
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
const DRAWER = { x: 146, y: 196, w: 104, h: 96 }, BIN = { x: 148, y: 318, w: 28, h: 32 };
/** The P5 machine is drawn at x 424; shifted by this much it slides over the right part of the desk (R4.1, design s2). */
const MACHINE_SHIFT = -208;
type Tool = StampColor | "pen" | "clip";
const inRect = (x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

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
  const { store, watch, actions, reveal } = ctx;
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

  // ---- Echo stamper (R6.1–R6.3): TRUE/FALSE switch, READY lamp, arm. The arm decides the selected Input's message, once.
  const st = h("section", { class: "sc dst", attrs: { "aria-label": t("desk.stamper") } }); place(st, G.stamper.x, G.stamper.y, G.stamper.w, G.stamper.h); paint(st, "desk-stamper");
  let verdict: EchoDecision = "accept";
  const sw = h("button", { class: "dsw", attrs: { type: "button" } }); place(sw, 13, 16, 20, 30); paint(sw, "desk-st-switch");
  sw.addEventListener("click", () => { verdict = verdict === "accept" ? "reject" : "accept"; stations(performance.now()); });
  const ready = box("lamp", 166, 22, 12, 12, "desk-st-lamp");
  const arm = h("button", { class: "dkey darm", attrs: { type: "button" }, text: t("desk.st.press") }); place(arm, 70, 14, 64, 32);
  arm.addEventListener("click", () => pressEcho());
  st.append(label("strip", t("desk.stamper"), 4, 2, 120, 8), sw, label("dim", t("desk.st.true"), 38, 18, 30, 7), label("dim", t("desk.st.false"), 38, 40, 30, 7),
    arm, ready, label("dim center", t("desk.st.ready"), 148, 40, 48, 7));
  scene.append(st);

  // ---- cipher machine: pushed in it shows the rotor windows; pulled out the P5 machine slides over the desk (R4.1)
  const mach = h("section", { class: "sc dmach", attrs: { "aria-label": t("desk.machine") } }); place(mach, G.machine.x, G.machine.y, G.machine.w, G.machine.h); paint(mach, "desk-machine-tab");
  const wins = [0, 1, 2, 3].map((k) => label("win typ center", "", 24 + k * 22, 15, 14, 14));
  const pull = h("button", { class: "dkey dpull", attrs: { type: "button", "aria-expanded": "false" }, text: t("desk.mach.pull") }); place(pull, 136, 12, 56, 22);
  mach.append(...wins, label("dim center", t("desk.machine"), 16, 37, 96, 7), pull);
  scene.append(mach);
  const machWrap = h("div", { class: "sc dmachwrap" }); place(machWrap, MACHINE_SHIFT, 0, 640, 360); machWrap.hidden = true;
  scene.append(machWrap);
  const machine = mountMachine(ctx, machWrap);
  const push = h("button", { class: "dkey dpush", attrs: { type: "button" }, text: t("desk.mach.push") }); place(push, 424 + 76, 108 + 224, 56, 14);
  machWrap.append(push);
  const setMachine = (out: boolean): void => { machWrap.hidden = !out; pull.setAttribute("aria-expanded", String(out)); setText(pull, out ? t("desk.mach.push") : t("desk.mach.pull")); };
  pull.addEventListener("click", () => setMachine(machWrap.hidden === true));
  push.addEventListener("click", () => setMachine(false));

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
  // A watch that has not started yet (time 0, no traffic) is a new watch: a layout saved for an earlier watch with the same
  // seed must not carry its stamps and hand-overs onto it.
  const freshWatch = store.state.tSec === 0 && store.state.order.length === 0;
  try { if (!freshWatch) model.restore(parseLayout(storage?.getItem(DESK_KEY) ?? null, ctx.seed)); } catch { /* unreadable storage: default layout */ }
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
    select: (p) => { // always re-sync the active message/attempt: a repeat or PageUp/PageDown may have moved it since the last click
      const same = selected === p.id;
      selected = p.id;
      if (p.rxId !== null) focusMessage(p);
      if (!same) { syncPapers(); stations(performance.now()); }
    },
    activate: (p) => applyTool(p),
    dropAt: (p, cx, cy, from) => {
      const r = scene.getBoundingClientRect(), lx = (cx - r.left) / px, ly = (cy - r.top) / px;
      if (inRect(lx, ly, G.door)) handOver(p, from);
      else if (inRect(lx, ly, BIN)) trash(p, from);
    },
  };
  let selected: string | null = null;
  /** Makes the sheet's message (and attempt) the active one, so typing, decoding and resolving act on it. */
  const focusMessage = (p: Paper): void => {
    const rxId = p.rxId, rx = rxId === null ? undefined : store.state.rx.get(rxId);
    if (!rx || rxId === null) return;
    if (store.state.activeRx !== rxId) store.selectRx(rxId);
    for (let k = 0; k < rx.attempts.length && p.attempt !== null && store.state.activeAttempt !== p.attempt; k++) store.cycleAttempt(1);
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

  // Mission sheet (R7): steps tick from real actions on the selected (or active) message; no manual ticks
  const STEPS = ["printed", "decoded", "echo", "outStamp", "signed", "clipped", "handed"] as const;
  type Step = (typeof STEPS)[number];
  const missionMsg = (): number | null => { const p = selected ? model.get(selected) : undefined; return p?.rxId ?? store.state.activeRx; };
  const stepDone = (rxId: number): Readonly<Record<Step, boolean>> => {
    const rx = store.state.rx.get(rxId), mine = model.list().filter((q) => q.rxId === rxId);
    const ins = mine.filter((q) => q.kind === "input"), outs = mine.filter((q) => q.kind === "output");
    return {
      printed: ins.some((q) => printer.done(q.id, performance.now())),
      decoded: (rx?.analysis.size ?? 0) > 0 || outs.some((q) => q.decoded !== null),
      echo: rx?.resolved != null,
      outStamp: outs.some((q) => q.stamps.includes("red")),
      signed: ins.some((q) => q.signed),
      clipped: ins.some((i) => i.clip !== null && outs.some((o) => o.clip === i.clip)),
      handed: ins.some((q) => q.place === "handed"),
    };
  };
  const mission = (p: Paper): Live => {
    const view = mountSheet(host, p, "desk-mission", t("desk.mission"), "dmis");
    const title = label("ink", t("desk.mission"), 6, 9, 116, 7);
    view.front.append(title);
    const rows = STEPS.map((k, r) => {
      const tick = label("ink typ tick center", "", 6, 18 + r * 12, 7, 7), txt = label("ink typ small", t(`desk.m.${k}`), 16, 17 + r * 12, 108, 8);
      view.front.append(tick, txt);
      return { tick, txt };
    });
    return {
      view,
      refresh: () => {
        const rxId = missionMsg();
        setText(title, rxId === null ? t("desk.mission") : t("desk.m.title", { rx: rxId }));
        const done = rxId === null ? null : stepDone(rxId);
        rows.forEach((row, r) => { const on = done?.[STEPS[r] as Step] === true; setText(row.tick, on ? "✓" : ""); setClass(row.txt, "done", on); });
        setClass(view.el, "complete", done !== null && STEPS.every((k) => done[k]));
      },
    };
  };

  /** Ink and clip overlays of one sheet; the Echo mark comes from the sim's MSG_RESOLVED state, never from desk.v1. */
  const marks = (p: Paper, view: SheetView, echoAt: readonly [number, number] | null, slots: readonly (readonly [number, number])[], signAt: readonly [number, number],
    ph: { readonly echo: HTMLElement | null; readonly stamps: readonly HTMLElement[] }): (() => void) => {
    const echoEl = echoAt ? box("dmark", echoAt[0], echoAt[1], 88, 40, "mark-echo") : null;
    const echoTxt = echoEl ? label("echo center", "", 4, 12, 80, 16) : null;
    if (echoEl && echoTxt) { echoEl.append(echoTxt); view.back.append(echoEl); }
    const stampEls = slots.map(([x, y]) => { const e = box("dmark", x, y, 40, 26, "mark-regular"); view.back.append(e); return e; });
    const signEl = box("dmark", signAt[0], signAt[1], 56, 12, "mark-sign"); view.back.append(signEl);
    const clips = [view.front, view.back].map((f) => { const c = box("dclip", 52, -8, 10, 22, "mark-clip"); f.append(c); return c; });
    return () => {
      const res = p.rxId === null ? null : store.state.rx.get(p.rxId)?.resolved ?? null;
      if (echoEl && echoTxt) {
        echoEl.hidden = res === null;
        if (res) { setFrame(echoEl, "mark-echo", res.decision === "accept" ? 0 : 1); setText(echoTxt, t(res.decision === "accept" ? "desk.st.markTrue" : "desk.st.markFalse")); setClass(echoTxt, "false", res.decision === "reject"); }
      }
      if (ph.echo) ph.echo.hidden = res !== null; // the printed box label disappears under the ink
      stampEls.forEach((e, k) => { const c = p.stamps[k]; e.hidden = c === undefined; if (c) setFrame(e, "mark-regular", c === "blue" ? 0 : 1); });
      ph.stamps.forEach((e, k) => { e.hidden = ph.stamps.length === 1 ? p.stamps.length > 0 : p.stamps[k] !== undefined; });
      signEl.hidden = !p.signed;
      for (const c of clips) c.hidden = p.clip === null;
      view.el.hidden = p.place !== "desk";
      setClass(view.el, "sel", selected === p.id);
    };
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
    const phEcho = label("faint center", t("desk.paper.echo"), 8, 40, 96, 9);
    const phStamps = [label("faint center", t("desk.paper.stamp"), 8, 89, 44, 7), label("faint center", t("desk.paper.stamp"), 60, 89, 44, 7)];
    view.back.append(label("ink", t("desk.paper.back"), 4, 4, 88, 7), phEcho, ...phStamps, label("ink", t("desk.paper.sign"), 10, 131, 60, 7),
      flipButton(host, p, view, 94, 2));
    let last = -1;
    const mk = marks(p, view, [12, 25], [[10, 80], [62, 80]], [12, 117], { echo: phEcho, stamps: phStamps });
    return {
      view,
      refresh: (now) => {
        const rx = store.state.rx.get(rxId), a = rx?.attempts.find((x) => x.attempt === attempt);
        if (!rx || !a) return;
        mk();
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
    let lastAn: unknown = undefined, decodedCopy: string | null = null;
    /** The snapshot always equals what the sheet shows, so a reload after the decision restores exactly that. */
    const keep = (snap: Paper["decoded"]): void => { if (JSON.stringify(snap) !== JSON.stringify(p.decoded)) { p.decoded = snap; host.changed(); } };
    const phRed = label("faint center", t("desk.paper.stampRed"), 8, 50, 96, 9);
    view.back.append(label("ink", t("desk.paper.back"), 4, 4, 88, 7), phRed, label("ink", t("desk.paper.sign"), 10, 131, 60, 7),
      flipButton(host, p, view, 94, 2));
    const mk = marks(p, view, null, [[12, 36], [60, 36]], [12, 117], { echo: null, stamps: [phRed] });
    return {
      view,
      refresh: () => {
        const rx = store.state.rx.get(rxId), a = rx?.attempts.find((x) => x.attempt === attempt);
        if (!rx || !a) return;
        mk();
        setText(fv.from, rx.from); setText(fv.ind, a.indicator);
        const an = rx.analysis.get(attempt), text = store.copyText(rxId, attempt);
        if (an !== lastAn) { lastAn = an; decodedCopy = an ? text : null; } // a decode replaces the analysis object
        if (an && text === decodedCopy) {
          grid.set(an.words.map((w) => ({ text: w.plain, bad: !w.ok })), t("desk.out.plainLabel"));
          setText(status, t("desk.out.damaged", { n: an.damagedGroups }));
          keep({ mode: "plain", words: an.words.map((w) => w.plain), bad: an.words.map((w) => !w.ok), damaged: an.damagedGroups });
        } else if (!an && p.decoded && rx.resolved !== null && text.length === 0) { // restored after the decision: the store has neither analysis nor copy
          const d = p.decoded;
          grid.set(d.words.map((w, k) => ({ text: w, bad: d.bad[k] === true })), t(d.mode === "plain" ? "desk.out.plainLabel" : "desk.out.copyLabel"));
          setText(status, d.mode === "plain" ? t("desk.out.damaged", { n: d.damaged }) : "");
        } else {
          const ws = groupsOf(text), typing = text.length > 0 && !text.endsWith(" "); // no decode yet, or the copy was edited after it
          grid.set(ws.map((w, i) => ({ text: w, cur: typing && i === ws.length - 1 })), t("desk.out.copyLabel"));
          setText(status, t("desk.out.hint"));
          keep(ws.length === 0 ? null : { mode: "copy", words: ws, bad: ws.map(() => false), damaged: 0 }); // the sheet now shows the copy, so does the record
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
          if (fresh) { // same segments the Morse audio plays for this attempt (cosmetic RNG), so print and sound share one timeline
            const ends = tokenEnds(a.tokens, schedule(a.tokens, rx.txFist, cosmeticRng(ctx.cosmeticSeed, rx.rxId, a.attempt)));
            printer.start(inId, a.tokens, watch.copy(a.tokens), now, ends.at(-1) ?? 0, ends);
          }
          add(p, input);
        }
        const outId = `out:${key}`;
        // an Output exists once typing started, after a decode, or when the saved layout had one (stamped, clipped, handed)
        if (!views.has(outId) && (store.copyText(rx.rxId, a.attempt).length > 0 || rx.analysis.has(a.attempt) || model.hasPending(outId))) add(model.ensure("output", rx.rxId, a.attempt), output);
      }
    }
    for (const v of views.values()) v.refresh(now);
  };

  // ---------------------------------------------------------------- drawer tools, bin, door (R6.4–R6.6)
  let tool: Tool | null = null, clipFirst: string | null = null;
  const drawerBtn = h("button", { class: "dhandle", attrs: { type: "button", "aria-expanded": "false", "aria-label": t("desk.drawer"), title: t("desk.drawer") } }); place(drawerBtn, 144, 196, 8, 66);
  const tray = h("section", { class: "sc dtray", attrs: { "aria-label": t("desk.drawer") } }); place(tray, DRAWER.x, DRAWER.y, DRAWER.w, DRAWER.h); paint(tray, "desk-drawer"); tray.hidden = true;
  const toolBtns = new Map<Tool, HTMLButtonElement>();
  const TOOLS: readonly (readonly [Tool, number, number, number])[] = [["blue", 0, 4, 4], ["red", 1, 53, 4], ["pen", 2, 4, 49], ["clip", 3, 53, 49]];
  for (const [id, frame, x, y] of TOOLS) {
    const b = h("button", { class: "dtool", attrs: { type: "button", "aria-pressed": "false", "aria-label": t(`desk.tool.${id}`) } }); place(b, x, y, 47, 43);
    const icon = h("span", { class: "sc" }); place(icon, 11, 3, 24, 24); paint(icon, "desk-tools", frame);
    b.append(icon, label("dim center", t(`desk.tool.${id}`), 1, 30, 45, 9));
    b.addEventListener("click", () => armTool(tool === id ? null : id));
    toolBtns.set(id, b); tray.append(b);
  }
  const armTool = (next: Tool | null): void => {
    tool = next; clipFirst = null;
    for (const [id, b] of toolBtns) { b.setAttribute("aria-pressed", String(id === tool)); setClass(b, "on", id === tool); }
    if (tool === null) delete scene.dataset["tool"]; else scene.dataset["tool"] = tool;
    host.announce(tool === null ? t("desk.tool.none") : t("desk.tool.armed", { name: t(`desk.tool.${tool}`) }));
  };
  drawerBtn.addEventListener("click", () => { tray.hidden = !tray.hidden; drawerBtn.setAttribute("aria-expanded", String(!tray.hidden)); if (tray.hidden) armTool(null); });
  const bin = h("button", { class: "dbin", attrs: { type: "button", "aria-label": t("desk.bin"), title: t("desk.bin") } }); place(bin, BIN.x, BIN.y, BIN.w, BIN.h); paint(bin, "desk-bin");
  bin.addEventListener("click", () => { const p = selected ? model.get(selected) : undefined; if (p) trash(p, null); else store.notify(t("desk.sel.none")); });
  const giveBtn = h("button", { class: "dkey dgive", attrs: { type: "button" }, text: t("desk.door.give") }); place(giveBtn, 30, 110, 72, 12);
  giveBtn.addEventListener("click", () => { const p = selected ? model.get(selected) : undefined; if (p) handOver(p, null); else store.notify(t("desk.sel.none")); });
  door.append(giveBtn);
  scene.append(bin, drawerBtn, tray);
  const onEsc = (ev: KeyboardEvent): void => { if (ev.code === "Escape" && tool !== null) { armTool(null); ev.preventDefault(); ev.stopPropagation(); } };
  window.addEventListener("keydown", onEsc, true); // before the game's Esc (pause)

  const refuse = (r: MarkResult): void => { store.notify(t(r === "front" ? "desk.tool.front" : r === "full" ? "desk.tool.full" : r === "already" ? "desk.tool.already" : r === "otherMessage" ? "desk.tool.otherMessage" : "desk.tool.notAllowed")); };
  const applyTool = (p: Paper): boolean => {
    if (tool === null) return false;
    if (tool === "clip") {
      if (clipFirst === p.id) { // the same sheet twice: take it out of its bundle (or just let go of it)
        clipFirst = null;
        if (p.clip !== null && model.unclip(p.id) === "ok") { host.announce(t("desk.tool.unclipped")); host.changed(); syncPapers(); } else host.announce(t("desk.tool.none"));
        return true;
      }
      if (clipFirst === null) { clipFirst = p.id; host.announce(t("desk.tool.clipNext")); return true; }
      const r = model.clipTo(clipFirst, p.id);
      clipFirst = null;
      if (r === "ok") host.announce(t("desk.tool.clipped")); else refuse(r);
    } else {
      const r = tool === "pen" ? model.sign(p.id) : model.stamp(p.id, tool);
      if (r === "ok") host.announce(t("desk.tool.done", { name: t(`desk.tool.${tool}`) })); else refuse(r);
    }
    host.changed(); syncPapers();
    return true;
  };
  const putBack = (p: Paper, from: { x: number; y: number } | null): void => { if (from) { model.moveWith(p.id, from.x, from.y); host.changed(); } };
  const trash = (p: Paper, from: { x: number; y: number } | null): void => {
    if (!canTrash(p.kind)) { store.notify(t("desk.bin.refuse")); putBack(p, from); }
  };
  const handOver = (p: Paper, from: { x: number; y: number } | null): void => {
    const bundle = model.group(p.id);
    const res = checkHandOver(bundle, (id) => store.state.rx.get(id)?.resolved != null);
    if (!res.ok) { store.notify(t(`desk.give.${res.reason}`)); putBack(p, from); return; }
    model.handOver(bundle.map((q) => q.id));
    if (selected !== null && bundle.some((q) => q.id === selected)) selected = null;
    store.notify(res.problems.length === 0 ? t("desk.give.ok", { rx: res.rxId }) : t("desk.give.okWith", { rx: res.rxId, list: res.problems.map((k) => t(`desk.rule.${k}`)).join("; ") }));
    host.changed(); syncPapers();
  };

  // ---------------------------------------------------------------- Echo press (exactly one resolve per message)
  const echo = new EchoPress();
  const isResolved = (rxId: number): boolean => store.state.rx.get(rxId)?.resolved != null;
  const readyReason = (): "needInput" | "needBack" | "already" | null => {
    const p = selected ? model.get(selected) : undefined;
    if (!p || p.kind !== "input" || p.place !== "desk") return "needInput";
    if (isResolved(p.rxId as number)) return "already";
    if (p.face !== "back") return "needBack";
    return null;
  };
  const pressEcho = (): void => {
    const why = readyReason();
    if (why !== null) { store.notify(t(`desk.st.${why}`)); return; }
    const p = model.get(selected as string) as Paper;
    const r = echo.press(p.rxId as number, verdict, isResolved, (id, d) => { focusMessage(p); actions.resolve(d); return isResolved(id); });
    if (r === "sent") host.announce(t(verdict === "accept" ? "desk.st.markTrue" : "desk.st.markFalse"));
    syncPapers(); stations(performance.now());
  };

  const toast = mountToast(ctx, scene);
  mountSummary(ctx, scene);

  let blink = false, nextBlink = 0, lastDecode = store.state.decodeSeq;
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
    setFrame(ready, "desk-st-lamp", readyReason() === null ? 1 : 0);
    setFrame(sw, "desk-st-switch", verdict === "accept" ? 0 : 1);
    sw.setAttribute("aria-label", t(verdict === "accept" ? "desk.st.switchTrue" : "desk.st.switchFalse"));
    arm.setAttribute("aria-label", t("desk.st.pressHint"));
    if (s.decodeSeq !== lastDecode) { // the lampboard replays the deciphered letters, like the P5 machine (decorative)
      lastDecode = s.decodeSeq;
      const an = rx?.analysis.get(s.activeAttempt);
      reveal.start(an ? an.words.reduce((n, w) => n + w.plain.length, 0) : 0, now, ctx.flags.reduceMotion === true);
    }
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
      boat.frame(now); toast.frame(); machine.frame(now);
      if (printer.busy()) { for (const v of views.values()) v.refresh(now); stations(now); }
      else if (blink) { blink = false; stations(now); }
    },
    dispose: () => {
      window.removeEventListener("resize", fit); window.removeEventListener("pagehide", onHide); window.removeEventListener("keydown", onEsc, true);
      machine.dispose();
      onHide();
      ctx.morse.stop(); scope.dispose();
      app.classList.remove("p5"); document.body.classList.remove("p5");
      scene.remove(); small.remove();
    },
  };
}
