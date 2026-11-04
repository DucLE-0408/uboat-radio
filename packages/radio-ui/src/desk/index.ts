// Desk UI (docs/specs/desk-ui), Stage 1 slice: the desk frame, stations and one two-sided Input sheet.
// Presentation only: it reads the P5 store and reuses the P5 boat cutaway; every decision still goes through ctx.actions (Stage 2+).
import type { Ctx } from "../ctx";
import { h, setClass, setText } from "../dom";
import { t } from "../i18n";
import { formatClock, formatDtg } from "../store";
import { assetErrors, preloadSprites } from "../scene/assets";
import { mountBoat } from "../scene/boat";
import { makeDecor } from "../scene/decor";
import { computeScale, paint, place, setFrame } from "../scene/px";
import { Reveal } from "../scene/reveal";
import { createScope, type SceneCtx } from "../scene/scope";
import { mountSummary } from "../scene/summary";
import { mountToast } from "../scene/toast";
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
const PAPER = { x: 262, y: 150, w: 112, h: 148 };
const MIN_W = 1280, MIN_H = 720;

const box = (cls: string, x: number, y: number, w: number, hh: number, sprite?: string): HTMLElement => {
  const e = h("div", { class: `sc ${cls}` }); place(e, x, y, w, hh); if (sprite) paint(e, sprite); return e;
};
const label = (cls: string, text: string, x: number, y: number, w: number, hh: number): HTMLElement => {
  const e = h("div", { class: `dlbl ${cls}`, text }); place(e, x, y, w, hh); return e;
};

export function mountDesk(base: Ctx, app: HTMLElement): { frame(): void; dispose(): void } {
  const scope = createScope(base);
  const ctx: SceneCtx = { ...base, scope, reveal: new Reveal() };
  const { store } = ctx;
  const decor = makeDecor(base.cosmeticSeed);
  app.classList.add("p5"); document.body.classList.add("p5");
  const scene = h("div", { class: "scene desk deskui l-desktop", attrs: { role: "main", "aria-label": t("desk.aria") } });
  scene.dataset["layout"] = "desktop";
  // Desktop only (R1): below 1280x720 the desk is not laid out; the player is pointed to the radio room.
  const small = h("div", { class: "desk-small", attrs: { role: "alert" } }, h("p", { text: t("desk.desktopOnly") }),
    h("a", { attrs: { href: `${location.pathname}?ui=p5` }, text: t("desk.toRoom") }));
  app.append(scene, small);
  const fit = (): void => {
    const ok = window.innerWidth >= MIN_W && window.innerHeight >= MIN_H;
    scene.hidden = !ok; small.hidden = ok;
    document.documentElement.style.setProperty("--px", String(Math.max(2, computeScale(window.innerWidth, window.innerHeight))));
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

  // ---- Teletyper
  const tty = h("section", { class: "sc dtty", attrs: { "aria-label": t("desk.teletyper") } }); place(tty, G.tty.x, G.tty.y, G.tty.w, G.tty.h); paint(tty, "desk-tty");
  const ttyLamp = box("lamp", 15, 107, 10, 10, "desk-tty-lamp");
  const ttyState = label("typ ttys", "", 32, 107, 108, 10);
  tty.append(label("plate", t("desk.teletyper"), 72, 95, 60, 8), ttyLamp, ttyState, label("key center", t("desk.tt.repeat"), 146, 108, 48, 10));
  scene.append(tty);

  // ---- Echo stamper
  const st = h("section", { class: "sc dst", attrs: { "aria-label": t("desk.stamper") } }); place(st, G.stamper.x, G.stamper.y, G.stamper.w, G.stamper.h); paint(st, "desk-stamper");
  const sw = box("sw", 13, 16, 20, 30, "desk-st-switch"); setFrame(sw, "desk-st-switch", 0);
  const ready = box("lamp", 166, 22, 12, 12, "desk-st-lamp");
  st.append(label("strip", t("desk.stamper"), 4, 2, 120, 8), sw, label("dim", t("desk.st.true"), 38, 18, 30, 7), label("dim", t("desk.st.false"), 38, 40, 30, 7),
    ready, label("dim center", t("desk.st.ready"), 148, 40, 48, 7));
  scene.append(st);

  // ---- cipher machine, pushed in: rotor windows show the indicator of the current message
  const mach = h("section", { class: "sc dmach", attrs: { "aria-label": t("desk.machine") } }); place(mach, G.machine.x, G.machine.y, G.machine.w, G.machine.h); paint(mach, "desk-machine-tab");
  const wins = [0, 1, 2, 3].map((k) => label("win typ center", "", 24 + k * 22, 15, 14, 14));
  mach.append(...wins, label("dim center", t("desk.machine"), 16, 37, 96, 7));
  scene.append(mach);

  // ---- Mission sheet and ration counter on the desk top
  const mis = h("section", { class: "sc dmis", attrs: { "aria-label": t("desk.mission") } }); place(mis, 150, 112, 128, 70); paint(mis, "desk-mission");
  mis.append(label("ink", t("desk.mission"), 6, 9, 116, 7));
  (["desk.mission.1", "desk.mission.2", "desk.mission.3", "desk.mission.4"] as const).forEach((k, r) => mis.append(label("ink typ small", t(k), 16, 17 + r * 12, 108, 8)));
  scene.append(mis);
  const ration = h("div", { class: "sc dration", attrs: { role: "status" } }); place(ration, 352, 112, 64, 18);
  const rationV = h("span", { class: "typ", text: "0" }); // the counter is wired in G2 (R10)
  ration.append(h("span", { class: "dlbl", text: t("desk.score") }), rationV);
  scene.append(ration);

  // ---- Input sheet (two faces; flipping is presentation state only)
  const paper = h("section", { class: "sc dpaper", attrs: { "aria-label": t("desk.paper.input") } }); place(paper, PAPER.x, PAPER.y, PAPER.w, PAPER.h); paint(paper, "paper-input");
  const front = h("div", { class: "face" }), back = h("div", { class: "face" });
  const fv = { from: label("ink typ", "", 50, 21, 54, 9), time: label("ink typ", "", 50, 33, 54, 9), ind: label("ink typ", "", 50, 45, 54, 9) };
  const groups = [...Array(20).keys()].map((n) => label("ink typ center grp", "", 10 + (n % 4) * 24, 64 + Math.floor(n / 4) * 15, 22, 13));
  const empty = label("dim center", t("desk.paper.none"), 8, 96, 96, 9);
  front.append(label("strip", t("desk.paper.input"), 4, 5, 104, 9), label("ink fld", t("desk.paper.from"), 6, 22, 42, 7), label("ink fld", t("desk.paper.time"), 6, 34, 42, 7),
    label("ink fld", t("desk.paper.indicator"), 6, 46, 42, 7), fv.from, fv.time, fv.ind, ...groups, empty);
  back.append(label("ink", t("desk.paper.back"), 4, 4, 104, 7), label("faint center", t("desk.paper.echo"), 8, 40, 96, 9),
    label("faint center", t("desk.paper.stamp"), 8, 89, 44, 7), label("faint center", t("desk.paper.stamp"), 60, 89, 44, 7), label("ink", t("desk.paper.sign"), 10, 131, 60, 7));
  const flip = h("button", { class: "dflip", attrs: { type: "button", "aria-label": t("desk.paper.flip"), title: t("desk.paper.flip") }, text: "⟲" }); place(flip, PAPER.w - 18, 4, 14, 11);
  let face: "front" | "back" = "front";
  const showFace = (): void => { front.hidden = face !== "front"; back.hidden = face !== "back"; setFrame(paper, "paper-input", face === "front" ? 0 : 1); paper.dataset["face"] = face; };
  flip.addEventListener("click", () => { face = face === "front" ? "back" : "front"; showFace(); });
  paper.append(front, back, flip); showFace();
  scene.append(paper);
  scene.append(label("note typ", t("desk.preview"), G.top.x + 10, G.top.y + G.top.h - 26, G.top.w - 20, 18));

  const toast = mountToast(ctx, scene);
  mountSummary(ctx, scene);

  const refresh = (): void => {
    const s = store.state;
    const rx = s.activeRx !== null ? s.rx.get(s.activeRx) ?? null : null;
    const at = rx ? rx.attempts.find((a) => a.attempt === s.activeAttempt) ?? rx.attempts[rx.attempts.length - 1] ?? null : null;
    const live = rx !== null && rx.resolved === null;
    setFrame(ttyLamp, "desk-tty-lamp", live ? 1 : 0);
    setText(ttyState, live ? t("desk.tt.incoming") : t("desk.tt.idle"));
    setFrame(ready, "desk-st-lamp", live ? 1 : 0);
    setText(fv.from, rx?.from ?? ""); setText(fv.time, rx ? formatDtg(rx.sentAtMin) : ""); setText(fv.ind, at?.indicator ?? "");
    const toks = at ? ctx.watch.copy(at.tokens).split(" ").filter((x) => x.length > 0) : []; // what the line printed: letters, ? where noise ate a symbol
    groups.forEach((g, n) => setText(g, toks[n] ?? ""));
    empty.hidden = rx !== null;
    wins.forEach((w, k) => setText(w, at?.indicator[k] ?? ""));
    setText(txClock, `${t("desk.ctl.tx")} ${formatClock(s.tx.totalSec)}`);
    setClass(scene, "silent", s.boat.silence);
  };
  scope.on(["rx", "copy", "clock", "boat", "tx", "ui"], refresh);
  refresh();
  void preloadSprites().then((fails) => { for (const code of assetErrors) ctx.diag.err("asset", code); if (fails > 0) scene.classList.add("no-sprites"); });

  return {
    frame: () => { const now = performance.now(); boat.frame(now); toast.frame(); },
    dispose: () => {
      window.removeEventListener("resize", fit);
      ctx.morse.stop(); scope.dispose();
      app.classList.remove("p5"); document.body.classList.remove("p5");
      scene.remove(); small.remove();
    },
  };
}
