// Placeholder pixel art (TEMPORARY), generated deterministically. Muted purple/navy, pink-grey paper, worn brass, restrained green.
// Original work: no pixels are taken from the reference screenshot. Neutral emblems only (no national insignia).
import { artRng, bayer, CLEAR, Img } from "./pix.ts";
import { boatSprites, portraitSheet } from "./sprites2.ts";

import { P } from "./palette.ts";
export { P };

export interface Sprite { readonly id: string; readonly img: Img; readonly frames?: { readonly w: number; readonly h: number; readonly count: number }; readonly note: string }

function plate(i: Img, x: number, y: number, w: number, h: number, rng: () => number): void {
  i.bevel(x, y, w, h, P.s2, P.s1, P.s0);
  i.wear(rng, x + 1, y + 1, w - 2, h - 2, P.s2, Math.floor(w * h / 60));
  i.wear(rng, x + 1, y + 1, w - 2, h - 2, P.s0, Math.floor(w * h / 90));
}

/** Whole-scene background: riveted steel frame, recessed alcoves, lamp light cone. */
function sceneBg(): Sprite {
  const W = 640, H = 360, i = new Img(W, H), rng = artRng(11);
  i.vgrad(0, 0, W, H, P.n2, P.n0);
  for (let y = 0; y < H; y += 24) i.hline(0, y, W, P.n1); // wall panel seams
  for (let x = 0; x < W; x += 80) i.vline(x, 0, H, P.n1);
  i.wear(rng, 0, 0, W, H, P.n3, 900); i.wear(rng, 0, 0, W, H, P.ink, 700);
  // light cone from the operator's lamp (top-left alcove)
  for (let y = 0; y < 260; y++) for (let x = 0; x < 220; x++) {
    const dx = x - 74, dy = y - 100, d = Math.sqrt(dx * dx * 0.7 + dy * dy * 0.35);
    if (bayer(x, y) < Math.max(0, 1 - d / 150) * 0.55) i.set(x, y, P.n3);
  }
  // outer frame
  i.bevel(0, 0, W, H, P.s2, P.s1, P.s0);
  i.rect(4, 4, W - 8, H - 8, P.n1);
  i.frame(4, 4, W - 8, H - 8, P.s0);
  for (let x = 12; x < W; x += 64) { i.rivet(x, 1, P.s4, P.s0); i.rivet(x, H - 3, P.s4, P.s0); }
  for (let y = 12; y < H; y += 64) { i.rivet(1, y, P.s4, P.s0); i.rivet(W - 3, y, P.s4, P.s0); }
  // recessed alcoves behind each station
  const alcove = (x: number, y: number, w: number, h: number): void => { i.bevel(x - 3, y - 3, w + 6, h + 6, P.s2, P.n0, P.ink, true); i.rect(x, y, w, h, P.n0); };
  alcove(8, 8, 624, 92); alcove(8, 108, 132, 152); alcove(8, 264, 132, 88); alcove(148, 108, 268, 104); alcove(148, 216, 268, 22); alcove(148, 242, 268, 110); alcove(424, 108, 208, 244);
  return { id: "scene-bg", img: i, note: "scene background, frame and alcoves" };
}

function gauges(): Sprite {
  const W = 132, H = 88, i = new Img(W, H), rng = artRng(41);
  plate(i, 0, 0, W, H, rng);
  i.rect(4, 4, W - 8, H - 8, P.s0); i.frame(4, 4, W - 8, H - 8, P.s2);
  for (const [x, y] of [[2, 2], [W - 4, 2], [2, H - 4], [W - 4, H - 4]] as const) i.rivet(x, y, P.s4, P.s0);
  for (let k = 0; k < 4; k++) { i.rect(8, 10 + k * 13, 74, 11, P.n0); i.frame(8, 10 + k * 13, 74, 11, P.s1); }  // readout windows
  for (let k = 0; k < 3; k++) { const cx = 100, cy = 18 + k * 20; i.ellipse(cx, cy, 8, 8, P.s1); i.ellipse(cx, cy, 6, 6, P.n0); i.ellipse(cx, cy, 2, 2, P.s3); i.line(cx, cy, cx + 4, cy - 3 - k, P.amber); }
  return { id: "gauges", img: i, note: "instrument plate (live text overlaid)" };
}

function paper(id: string, W: number, H: number, seed: number, kind: "telegram" | "secret"): Sprite {
  const i = new Img(W, H), rng = artRng(seed);
  i.vgrad(0, 0, W, H, P.pa2, P.pa1);
  i.dither(0, 0, W, H, P.pa2, P.pa3, 0.18);
  i.wear(rng, 0, 0, W, H, P.pa0, Math.floor(W * H / 45));
  i.wear(rng, 0, 0, W, H, P.pa3, Math.floor(W * H / 80));
  i.frame(0, 0, W, H, P.pa0); i.hline(1, 1, W - 2, P.pa3); i.vline(1, 1, H - 2, P.pa3);
  for (let y = 0; y < H; y += 2) { i.set(0, y, CLEAR); i.set(W - 1, y + 1, CLEAR); } // worn edge
  if (kind === "telegram") {
    for (let k = 0; k < 5; k++) { const y = 8 + k * 13; i.rect(8, y, 46, 11, P.pink); i.frame(8, y, 46, 11, P.tx2); i.rect(54, y, 124, 11, P.pa3); i.frame(54, y, 124, 11, P.tx2); } // label + value boxes
    i.rect(184, 8, 76, 40, P.pa3); i.frame(184, 8, 76, 40, P.tx2); i.rect(184, 8, 76, 9, P.pink); i.frame(184, 8, 76, 9, P.tx2);       // challenge cell
    i.rect(184, 52, 76, 22, P.pa3); i.frame(184, 52, 76, 22, P.tx2);                                                                    // stamp area
    // neutral anchor emblem (small) for the stamp area
    const ax = 196, ay = 63; i.vline(ax, ay - 6, 12, P.pa0); i.hline(ax - 3, ay - 3, 7, P.pa0); i.ellipse(ax, ay - 7, 1, 1, P.pa0); i.line(ax - 5, ay + 2, ax, ay + 6, P.pa0); i.line(ax + 5, ay + 2, ax, ay + 6, P.pa0);
    i.rect(8, 76, 252, 22, P.pa3); i.frame(8, 76, 252, 22, P.tx2);                                                                       // tells strip
    i.rect(6, 99, 256, 1, P.pa0);
  } else {
    for (let y = 26; y < H - 14; y += 18) { i.hline(8, y + 14, W - 16, P.pa0); }                     // ruled lines under each text row
    i.rect(0, 0, W, 3, P.pa1); i.hline(0, 3, W, P.pa0);
    for (let x = 0; x < W; x += 7) i.set(x, 3 + (x % 14 === 0 ? 1 : 0), P.pa0);                          // torn top
    i.rect(W - 28, 4, 18, 8, P.s2); i.frame(W - 28, 4, 18, 8, P.s0);                                    // clip
  }
  return { id, img: i, note: `${kind} paper (labels and values are live text)` };
}

function machine(): Sprite {
  const W = 208, H = 244, i = new Img(W, H), rng = artRng(53);
  i.bevel(0, 0, W, H, P.s3, P.s1, P.s0);
  i.dither(2, 2, W - 4, H - 4, P.s1, P.s2, 0.14);
  i.wear(rng, 2, 2, W - 4, H - 4, P.s0, 260); i.wear(rng, 2, 2, W - 4, H - 4, P.s3, 120);
  i.scratches(rng, 4, 4, W - 8, H - 8, P.s2, 14);
  for (const [x, y] of [[3, 3], [W - 5, 3], [3, H - 5], [W - 5, H - 5], [3, 120], [W - 5, 120]] as const) i.rivet(x, y, P.s4, P.s0);
  i.bevel(8, 4, 192, 14, P.b2, P.b1, P.b0); i.wear(rng, 9, 5, 190, 12, P.b0, 40);                       // brass name plate
  for (const x of [45, 77, 109, 141]) { i.bevel(x - 2, 20, 26, 32, P.s0, P.n0, P.s3, true); i.rect(x, 22, 22, 28, P.n0); i.frame(x, 22, 22, 28, P.ink); i.hline(x + 1, 23, 20, P.s1); } // 4 rotor windows
  i.bevel(176, 4 + 18, 24, 30, P.s0, P.n0, P.s3, true); i.rect(180, 26, 16, 22, P.n0);                    // status lamp bay
  i.bevel(8, 56, 192, 60, P.s0, P.n0, P.s3, true); i.rect(10, 58, 188, 56, P.n0);                          // lampboard bay
  i.dither(10, 58, 188, 56, P.n0, P.n1, 0.2);
  i.bevel(6, 120, 196, 98, P.s0, P.s0, P.s3, true); i.rect(8, 122, 192, 94, P.n0);                         // keyboard bay
  i.dither(8, 122, 192, 94, P.n0, P.s0, 0.25);
  for (let x = 12; x < 196; x += 8) i.set(x, 226, P.s0);
  i.bevel(8, 224, 192, 16, P.s1, P.s0, P.ink);                                                              // vent strip
  for (let x = 12; x < 196; x += 4) i.vline(x, 228, 8, P.ink);
  return { id: "machine", img: i, note: "cipher machine casing: name plate, 4 rotor windows, lamp bay, key bay" };
}

function key(id: string, w: number, h: number, seed: number): Sprite {
  const mk = (down: boolean): Img => {
    const i = new Img(w, h), r = artRng(seed + (down ? 1 : 0));
    const top = down ? P.s2 : P.s3, mid = down ? P.s1 : P.s2, bot = P.s0;
    i.ellipse(Math.floor(w / 2), Math.floor(h / 2), Math.floor(w / 2) - 0, Math.floor(h / 2) - 0, P.ink);
    if (w === h) {
      i.ellipse(Math.floor(w / 2), Math.floor(h / 2), w / 2 - 1, h / 2 - 1, P.b1); // brass ring
      i.ellipse(Math.floor(w / 2), Math.floor(h / 2) + (down ? 1 : 0), w / 2 - 3, h / 2 - 3, mid); // cap
      i.hline(4, down ? 4 : 3, w - 8, top);
    } else {
      i.bevel(0, down ? 1 : 0, w, h - 1, top, mid, bot);
      i.wear(r, 1, 1, w - 2, h - 3, P.s0, 4);
    }
    return i;
  };
  const sheet = new Img(w * 2, h);
  sheet.blit(mk(false), 0, 0); sheet.blit(mk(true), w, 0);
  return { id, img: sheet, frames: { w, h, count: 2 }, note: "key cap, frame 0 = up, frame 1 = pressed" };
}

function slicedKey(id: string, down: boolean): Sprite {
  const w = 16, h = 16, i = new Img(w, h), r = artRng(down ? 83 : 81);
  i.bevel(0, down ? 1 : 0, w, h - 1, down ? P.s2 : P.s3, down ? P.s1 : P.s2, P.s0);
  i.frame(0, 0, w, h, P.ink); for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]] as const) i.set(x, y, CLEAR);
  void r; // no specks: they would be stretched into dashes by the 9-slice
  return { id, img: i, note: `9-slice wide key (${down ? "pressed" : "up"}), 4px corners` };
}

function lamp(): Sprite {
  const w = 14, h = 14, sheet = new Img(w * 2, h);
  for (const [f, on] of [[0, false], [1, true]] as const) {
    const i = new Img(w, h);
    i.ellipse(7, 7, 6, 6, P.s0); i.ellipse(7, 7, 5, 5, on ? P.g1 : P.n1);
    if (on) { i.ellipse(7, 7, 3, 3, P.g2); i.set(6, 6, P.g3); i.set(7, 6, P.g3); i.frame(0, 0, w, h, CLEAR); } else { i.set(5, 5, P.n3); }
    i.ellipse(7, 7, 6, 6, CLEAR); i.ellipse(7, 7, 6, 6, P.s0); i.ellipse(7, 7, 5, 5, on ? P.g1 : P.n1);
    if (on) { i.ellipse(7, 7, 3, 3, P.g2); i.set(6, 6, P.g3); i.set(7, 6, P.g3); } else i.set(5, 5, P.n3);
    sheet.blit(i, f * w, 0);
  }
  return { id: "lamp", img: sheet, frames: { w, h, count: 2 }, note: "lamp, frame 0 = off, frame 1 = lit (restrained green)" };
}

function statusLamp(): Sprite {
  const w = 16, h = 22, sheet = new Img(w * 3, h);
  [P.n1, P.g1, P.r1].forEach((c, f) => {
    const i = new Img(w, h); i.bevel(0, 0, w, h, P.s2, P.s1, P.s0); i.ellipse(8, 11, 5, 7, P.s0);
    i.ellipse(8, 11, 4, 6, c); if (f > 0) i.ellipse(8, 9, 2, 3, f === 1 ? P.g3 : P.r2);
    sheet.blit(i, f * w, 0);
  });
  return { id: "status-lamp", img: sheet, frames: { w, h, count: 3 }, note: "status lamp: 0 off, 1 green, 2 red" };
}

function button(id: string, state: "up" | "down" | "off"): Sprite {
  const w = 16, h = 18, i = new Img(w, h);
  const c = state === "up" ? [P.p2, P.p1, P.n2] : state === "down" ? [P.n2, P.n3, P.p1] : [P.s2, P.s1, P.s0];
  i.bevel(0, 0, w, h, c[0] as never, c[1] as never, c[2] as never, state === "down");
  i.frame(0, 0, w, h, P.ink); i.set(0, 0, CLEAR); i.set(w - 1, 0, CLEAR); i.set(0, h - 1, CLEAR); i.set(w - 1, h - 1, CLEAR);
  i.hline(2, 2, w - 4, state === "down" ? P.n2 : state === "up" ? P.lav : P.s3);
  return { id, img: i, note: `9-slice command button (${state}), 4px corners` };
}

function pause(): Sprite {
  const w = 24, h = 24, sheet = new Img(w * 2, h);
  for (const [f, down] of [[0, false], [1, true]] as const) {
    const i = new Img(w, h); i.ellipse(12, 12, 11, 11, P.ink); i.ellipse(12, 12, 10, 10, down ? P.s1 : P.s2); i.ellipse(12, 12, 8, 8, down ? P.n1 : P.n2);
    i.rect(8, 7, 3, 10, P.pa2); i.rect(14, 7, 3, 10, P.pa2); i.hline(5, 4, 10, P.s3);
    sheet.blit(i, f * w, 0);
  }
  return { id: "pause", img: sheet, frames: { w, h, count: 2 }, note: "pause button, frame 0 up, frame 1 pressed" };
}

function noise(): Sprite {
  const i = new Img(64, 64), r = artRng(77);
  for (let k = 0; k < 520; k++) i.set(Math.floor(r() * 64), Math.floor(r() * 64), [255, 255, 255, 18 + Math.floor(r() * 18)]);
  for (let y = 0; y < 64; y += 2) i.hline(0, y, 64, [0, 0, 0, 26]);
  return { id: "crt-noise", img: i, note: "optional CRT scanline/noise overlay tile (off by default)" };
}

export function buildSprites(): Sprite[] {
  return [
    sceneBg(), ...boatSprites(), portraitSheet(), gauges(),
    paper("telegram", 268, 104, 61, "telegram"), paper("secret-paper", 268, 110, 67, "secret"),
    machine(), key("key-round", 16, 16, 71), slicedKey("keywide-up", false), slicedKey("keywide-down", true), lamp(), statusLamp(),
    button("btn-up", "up"), button("btn-down", "down"), button("btn-off", "off"), pause(), noise(),
  ];
}
