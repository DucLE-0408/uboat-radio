// Placeholder pixel art (TEMPORARY), generated deterministically. Art pass toward the user's reference: slate bulkheads,
// dusty-rose paper, green-black machine, restrained green. Flat colour clusters; no full-surface noise or dither.
// Original work: no pixels are taken from the reference screenshot. Neutral emblems only (no national insignia).
import { artRng, Img, type RGBA } from "./pix.ts";
import { keyRound, keyWide, lampSheet, machineCasing, statusLampSheet } from "./machine.ts";
import { boatSprites, portraitSheet } from "./sprites2.ts";
import { T } from "./tone.ts";

import { P } from "./palette.ts";
export { P };

export interface Sprite { readonly id: string; readonly img: Img; readonly frames?: { readonly w: number; readonly h: number; readonly count: number }; readonly note: string }

const k = T.k;
const c = (r: readonly RGBA[], n: number): RGBA => r[n] as RGBA;
const screw = (i: Img, x: number, y: number, ramp: readonly RGBA[]): void => i.stamp(x, y, [".a.", "abc", ".c."], { a: c(ramp, ramp.length - 1), b: c(ramp, 3), c: c(ramp, 0) });

/** Vertical pipe (4 px) with cylinder shading. */
function vpipe(i: Img, x: number, y: number, h: number): void { for (let j = 0; j < h; j++) { i.set(x, y + j, k[3] as RGBA); i.set(x + 1, y + j, k[5] as RGBA); i.set(x + 2, y + j, k[4] as RGBA); i.set(x + 3, y + j, k[1] as RGBA); } }
function hpipe(i: Img, x: number, y: number, w: number): void { i.hline(x, y, w, k[5] as RGBA); i.hline(x, y + 1, w, k[4] as RGBA); i.hline(x, y + 2, w, k[3] as RGBA); i.hline(x, y + 3, w, k[1] as RGBA); }
function flange(i: Img, x: number, y: number, vertical: boolean): void {
  if (vertical) { i.rect(x - 1, y, 6, 3, k[5] as RGBA); i.hline(x - 1, y, 6, k[6] as RGBA); i.hline(x - 1, y + 2, 6, k[1] as RGBA); }
  else { i.rect(x, y - 1, 3, 6, k[5] as RGBA); i.vline(x, y - 1, 6, k[6] as RGBA); i.vline(x + 2, y - 1, 6, k[1] as RGBA); }
}

/** Whole-scene background: bulkhead plates, recessed station alcoves, pipe runs in the gutters. */
function sceneBg(): Sprite {
  const W = 640, H = 360, i = new Img(W, H);
  i.rect(0, 0, W, H, k[2] as RGBA);
  for (const x of [0, 216, 432]) { i.vline(x + 214, 0, H, k[1] as RGBA); }               // plate seams (sparse)
  i.frame(0, 0, W, H, k[0] as RGBA); i.hline(1, 1, W - 2, k[4] as RGBA); i.vline(1, 1, H - 2, k[3] as RGBA);
  // pipe runs: one across under the banner, one down each column gutter
  hpipe(i, 2, 102, W - 4); vpipe(i, 142, 106, H - 108); vpipe(i, 418, 106, H - 108);
  for (const x of [60, 300, 560]) flange(i, x, 102, false);
  for (const y of [180, 300]) { flange(i, 142, y, true); flange(i, 418, y, true); }
  // recessed alcoves: a 2 px dark lip around each station
  const alcove = (x: number, y: number, w: number, h: number): void => { i.rect(x - 2, y - 2, w + 4, h + 4, k[0] as RGBA); i.hline(x - 2, y + h + 1, w + 4, k[3] as RGBA); };
  alcove(8, 8, 624, 92); alcove(8, 108, 132, 152); alcove(8, 264, 132, 88); alcove(148, 108, 268, 104); alcove(148, 242, 268, 110); alcove(424, 108, 208, 244);
  i.rect(148, 216, 268, 22, k[1] as RGBA); i.hline(148, 216, 268, k[0] as RGBA); i.hline(148, 237, 268, k[3] as RGBA); // command shelf
  return { id: "scene-bg", img: i, note: "scene background: bulkhead plates, pipe runs, recessed alcoves" };
}

function gauges(): Sprite {
  const W = 132, H = 88, i = new Img(W, H), m = T.m, e = T.e;
  i.rect(0, 0, W, H, c(m, 2)); i.frame(0, 0, W, H, c(m, 0)); i.hline(1, 1, W - 2, c(m, 4)); i.vline(1, 1, H - 2, c(m, 3)); i.hline(1, H - 2, W - 2, c(m, 1));
  for (const [x, y] of [[3, 3], [W - 6, 3], [3, H - 6], [W - 6, H - 6]] as const) screw(i, x, y, m);
  for (let n = 0; n < 4; n++) { const y = 10 + n * 13; i.rect(7, y - 1, 76, 13, c(m, 0)); i.rect(8, y, 74, 11, c(e, 0)); i.hline(8, y, 74, c(e, 1)); i.hline(7, y + 12, 76, c(m, 4)); }
  for (let n = 0; n < 3; n++) { const cx = 97, cy = 18 + n * 20; i.ellipse(cx, cy, 8, 8, c(m, 0)); i.ellipse(cx, cy, 7, 7, c(m, 3)); i.hline(cx - 4, cy - 7, 6, c(m, 5)); }
  i.rect(6, 64, 120, 20, c(m, 1)); i.hline(6, 64, 120, c(m, 0)); i.hline(6, 83, 120, c(m, 3));
  return { id: "gauges", img: i, note: "painted instrument plate: readout windows, lamp sockets, button shelf (live text overlaid)" };
}

function paper(id: string, W: number, H: number, kind: "telegram" | "secret"): Sprite {
  const i = new Img(W, H), pa = T.pa, hb = T.hb;
  i.rect(0, 0, W, H, c(pa, 3));
  i.frame(0, 0, W, H, c(pa, 0)); i.hline(1, 1, W - 2, c(pa, 4)); i.vline(1, 1, H - 2, c(pa, 4)); i.hline(1, H - 2, W - 2, c(pa, 2));
  // one soft fold crease across the sheet (the only texture: clean paper otherwise)
  const fy = Math.floor(H * 0.52); i.hline(2, fy, W - 4, c(pa, 2)); i.hline(2, fy + 1, W - 4, c(pa, 4));
  // dog-eared corner
  for (let j = 0; j < 5; j++) for (let x = W - 5 + j; x < W; x++) i.set(x, j, [0, 0, 0, 0]);
  i.line(W - 6, 0, W - 1, 5, c(pa, 1)); for (let j = 1; j < 5; j++) i.hline(W - 6 + j, j, 5 - j, c(pa, 2));
  const box = (x: number, y: number, w: number, h: number, fill: RGBA): void => { i.rect(x, y, w, h, fill); i.frame(x, y, w, h, c(pa, 1)); };
  if (kind === "telegram") {
    for (let n = 0; n < 5; n++) { const y = 8 + n * 13; box(8, y, 47, 11, c(hb, 1)); i.hline(9, y + 1, 45, c(hb, 2)); box(54, y, 124, 11, c(pa, 4)); }
    box(184, 8, 76, 40, c(pa, 4)); box(184, 8, 76, 9, c(hb, 1)); i.hline(185, 9, 74, c(hb, 2));
    box(184, 52, 76, 22, c(pa, 2));
    // neutral anchor emblem for the stamp area
    const ax = 194, ay = 63, ink = c(pa, 0);
    i.vline(ax, ay - 6, 12, ink); i.hline(ax - 3, ay - 4, 7, ink); i.ellipse(ax, ay - 7, 1, 1, ink); i.line(ax - 5, ay + 2, ax, ay + 6, ink); i.line(ax + 5, ay + 2, ax, ay + 6, ink);
    box(8, 77, 252, 21, c(pa, 4));
  } else {
    i.rect(1, 1, W - 2, 20, c(hb, 1)); i.hline(1, 1, W - 2, c(hb, 2)); i.hline(1, 21, W - 2, c(hb, 0));
    for (let y = 38; y < H - 14; y += 18) i.hline(8, y, W - 16, c(pa, 1));
    i.hline(8, H - 14, W - 16, c(pa, 2));
  }
  return { id, img: i, note: `${kind} paper (labels and values are live text)` };
}

function button(id: string, state: "up" | "down" | "off"): Sprite {
  const w = 16, h = 18, i = new Img(w, h);
  const [fill, hi, lo] = state === "up" ? [k[4], k[6], k[2]] : state === "down" ? [k[3], k[1], k[4]] : [k[2], k[3], k[1]];
  i.rrect(0, 0, w, h, 2, k[0] as RGBA);
  i.rrect(1, 1, w - 2, h - 2, 1, fill as RGBA);
  i.hline(2, 1, w - 4, hi as RGBA); i.hline(2, h - 2, w - 4, lo as RGBA); i.hline(2, h - 3, w - 4, (state === "up" ? k[3] : fill) as RGBA);
  return { id, img: i, note: `9-slice command button (${state}), 4px corners` };
}

function pause(): Sprite {
  const w = 24, h = 24, sheet = new Img(w * 2, h);
  for (const [f, down] of [[0, false], [1, true]] as const) {
    const i = new Img(w, h); i.ellipse(12, 12, 11, 11, k[0] as RGBA); i.ellipse(12, 12, 10, 10, (down ? k[3] : k[5]) as RGBA); i.ellipse(12, down ? 12 : 13, 8, 8, (down ? k[2] : k[3]) as RGBA);
    i.rect(8, 7, 3, 10, c(T.pa, 4)); i.rect(14, 7, 3, 10, c(T.pa, 4)); i.vline(10, 7, 10, c(T.pa, 2)); i.vline(16, 7, 10, c(T.pa, 2));
    sheet.blit(i, f * w, 0);
  }
  return { id: "pause", img: sheet, frames: { w, h, count: 2 }, note: "pause button, frame 0 up, frame 1 pressed" };
}

function noise(): Sprite {
  const i = new Img(64, 64), r = artRng(77);
  for (let n = 0; n < 520; n++) i.set(Math.floor(r() * 64), Math.floor(r() * 64), [255, 255, 255, 18 + Math.floor(r() * 18)]);
  for (let y = 0; y < 64; y += 2) i.hline(0, y, 64, [0, 0, 0, 26]);
  return { id: "crt-noise", img: i, note: "optional CRT scanline/noise overlay tile (off by default, never on in the default scene)" };
}

export function buildSprites(): Sprite[] {
  return [
    sceneBg(), ...boatSprites(), portraitSheet(), gauges(),
    paper("telegram", 268, 104, "telegram"), paper("secret-paper", 268, 110, "secret"),
    machineCasing(), keyRound(), keyWide(false), keyWide(true), lampSheet(), statusLampSheet(),
    button("btn-up", "up"), button("btn-down", "down"), button("btn-off", "off"), pause(), noise(),
  ];
}
