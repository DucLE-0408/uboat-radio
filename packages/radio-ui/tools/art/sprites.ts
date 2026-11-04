// Placeholder pixel art (TEMPORARY), generated deterministically. Muted purple/navy, pink-grey paper, worn brass, restrained green.
// Original work: no pixels are taken from the reference screenshot. Neutral emblems only (no national insignia).
import { artRng, bayer, CLEAR, Img, rgb } from "./pix.ts";

export const P = {
  ink: rgb("#0c0a18"), n0: rgb("#14122b"), n1: rgb("#1d1a41"), n2: rgb("#2a2658"), n3: rgb("#3a3475"), p1: rgb("#4c4390"), p2: rgb("#6a5fae"), lav: rgb("#938acb"),
  s0: rgb("#23263f"), s1: rgb("#38405f"), s2: rgb("#535c82"), s3: rgb("#7a84a8"), s4: rgb("#a5aecb"),
  b0: rgb("#3b2c22"), b1: rgb("#6b5233"), b2: rgb("#9a7b45"), b3: rgb("#c7a45e"),
  pa0: rgb("#8d7885"), pa1: rgb("#b49fa9"), pa2: rgb("#d2bfc6"), pa3: rgb("#ebdde0"), pink: rgb("#c58fa0"),
  tx: rgb("#3a2c3f"), tx2: rgb("#5d4a63"),
  g0: rgb("#173d2c"), g1: rgb("#2f8f5a"), g2: rgb("#6fe39a"), g3: rgb("#c9ffe0"),
  r0: rgb("#4d1a2a"), r1: rgb("#b13a56"), r2: rgb("#ff7b8c"),
  w0: rgb("#10224f"), w1: rgb("#1c3a7a"), w2: rgb("#2f5bab"), w3: rgb("#5e8fd6"),
  skin0: rgb("#8a5f58"), skin1: rgb("#b98873"), skin2: rgb("#dcb598"), hair: rgb("#2a2226"), amber: rgb("#e9b96a"),
} as const;

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

/** Cutaway of the boat (surface state). */
function bannerSub(): Sprite {
  const W = 624, H = 92, i = new Img(W, H), rng = artRng(23);
  i.vgrad(0, 0, W, 44, P.n1, P.p1);                // dusk sky through the viewport
  i.vgrad(0, 44, W, 48, P.w1, P.w0);               // sea
  for (let y = 46; y < H; y += 5) for (let x = (y * 7) % 11; x < W; x += 11) i.hline(x, y, 3, P.w2); // wave dashes
  for (let x = 0; x < W; x += 3) i.set(x, 44 + (x % 6 < 3 ? 0 : 1), P.w3);                          // waterline glint
  // hull (cutaway): rounded plates with a lit interior
  const hx = 96, hy = 34, hw = 430, hh = 40;
  i.ellipse(hx + 14, hy + 20, 18, 20, P.s1); i.ellipse(hx + hw - 14, hy + 20, 18, 20, P.s1);
  i.rect(hx + 12, hy, hw - 24, hh, P.s1);
  i.rect(hx + 8, hy + 4, hw - 16, hh - 8, P.s0);
  i.dither(hx + 10, hy + 6, hw - 20, hh - 12, P.n2, P.n3, 0.35); // lit interior wall
  for (let k = 0; k < 7; k++) { const bx = hx + 40 + k * 58; i.rect(bx, hy + 6, 3, hh - 12, P.s2); i.vline(bx + 3, hy + 6, hh - 12, P.s0); } // bulkheads
  i.rect(hx + 10, hy + hh - 10, hw - 20, 4, P.b1); i.hline(hx + 10, hy + hh - 10, hw - 20, P.b2);                                             // deck
  for (let k = 0; k < 14; k++) { const px = hx + 24 + k * 29; i.hline(px, hy + 8, 18, P.s3); i.hline(px, hy + 9, 18, P.s0); }                    // pipes
  for (let k = 0; k < 7; k++) { const lx = hx + 52 + k * 58; i.rect(lx, hy + 10, 4, 3, P.amber); i.set(lx + 1, hy + 13, P.b3); }                    // lamps
  // crew silhouettes
  for (const cx of [hx + 70, hx + 134, hx + 188, hx + 250, hx + 304, hx + 362]) {
    i.rect(cx, hy + 18, 5, 12, P.ink); i.ellipse(cx + 2, hy + 16, 2, 2, P.skin0); i.rect(cx - 1, hy + 18, 1, 6, P.ink); i.rect(cx + 5, hy + 18, 1, 6, P.ink);
  }
  // outline and rivet line
  i.frame(hx + 8, hy + 4, hw - 16, hh - 8, P.s2);
  for (let k = 0; k < 40; k++) i.set(hx + 12 + k * 10, hy + 2, P.s3);
  // conning tower, periscope, bow, stern
  i.rect(hx + 190, hy - 18, 54, 20, P.s1); i.frame(hx + 190, hy - 18, 54, 20, P.s0); i.rect(hx + 196, hy - 14, 42, 8, P.n2);
  for (let k = 0; k < 4; k++) i.rect(hx + 200 + k * 10, hy - 12, 6, 4, P.amber);
  i.rect(hx + 244, hy - 30, 2, 14, P.s3); i.rect(hx + 244, hy - 30, 8, 2, P.s3);
  i.rect(hx + 150, hy - 6, 20, 6, P.s1); i.line(hx + 150, hy - 6, hx + 170, hy - 6, P.s3); // gun deck
  i.rect(hx + hw - 6, hy + 26, 20, 4, P.s1); i.ellipse(hx + hw + 18, hy + 28, 5, 6, P.s2);  // stern screw housing
  i.line(hx + hw + 14, hy + 20, hx + hw + 22, hy + 36, P.b2); i.line(hx + hw + 22, hy + 20, hx + hw + 14, hy + 36, P.b2);
  i.rect(hx - 18, hy + 22, 22, 4, P.s2);                                                     // bow
  // viewport frame with rivets
  i.frame(0, 0, W, H, P.ink); i.frame(1, 1, W - 2, H - 2, P.s1); i.frame(2, 2, W - 4, H - 4, P.s0);
  for (let x = 10; x < W; x += 52) { i.rivet(x, 2, P.s3, P.s0); i.rivet(x, H - 4, P.s3, P.s0); }
  i.wear(rng, 3, 3, W - 6, H - 6, P.n3, 300);
  return { id: "banner-sub", img: i, note: "submarine cutaway, surface state (static for stage 2)" };
}

/** Operator in an alcove under a hanging lamp. */
function portrait(): Sprite {
  const W = 132, H = 152, i = new Img(W, H), rng = artRng(31);
  i.vgrad(0, 0, W, H, P.n2, P.n0);
  for (let y = 0; y < H; y += 12) i.hline(0, y, W, P.n1);
  i.wear(rng, 0, 0, W, H, P.n3, 200);
  // lamp + light
  i.rect(64, 0, 4, 12, P.s1); i.ellipse(66, 16, 9, 6, P.s2); i.ellipse(66, 20, 6, 3, P.amber); i.hline(60, 22, 12, P.b3);
  for (let y = 10; y < 150; y++) for (let x = 0; x < W; x++) { const dx = x - 66, dy = y - 20; if (bayer(x, y) < Math.max(0, 1 - Math.sqrt(dx * dx * 0.5 + dy * dy * 0.25) / 80) * 0.5) i.set(x, y, P.p1); }
  // shoulders / uniform
  i.ellipse(66, 150, 50, 36, P.s0); i.ellipse(66, 152, 46, 34, P.n1); i.rect(40, 118, 52, 34, P.n1);
  i.line(48, 122, 40, 152, P.s0); i.line(84, 122, 92, 152, P.s0);
  for (let k = 0; k < 3; k++) i.set(66, 128 + k * 8, P.b3);                                  // buttons
  i.rect(54, 116, 24, 6, P.pa1); i.rect(60, 116, 12, 4, P.skin1);                          // collar + neck
  // head (lit from the lamp above-left)
  i.ellipse(66, 86, 19, 26, P.skin1); i.shadeEllipse(66, 86, 19, 26, P.skin1, P.skin0, -0.6, -0.5);
  i.ellipse(64, 80, 12, 14, P.skin2); i.shadeEllipse(64, 80, 12, 14, P.skin2, P.skin1, -0.4, -0.4);
  i.ellipse(66, 106, 11, 6, P.skin1); i.shadeEllipse(66, 106, 11, 6, P.skin1, P.skin0, 0, 1);
  i.ellipse(47, 90, 3, 5, P.skin1); i.ellipse(85, 90, 3, 5, P.skin0);
  // cap
  i.rect(42, 64, 48, 12, P.s0); i.ellipse(66, 62, 24, 10, P.s1); i.rect(42, 74, 48, 3, P.ink); i.ellipse(66, 66, 5, 4, P.b2); i.set(66, 66, P.b3);
  // glasses
  i.ellipse(58, 86, 6, 5, P.s4); i.ellipse(74, 86, 6, 5, P.s4); i.ellipse(58, 86, 4, 3, P.pa3); i.ellipse(74, 86, 4, 3, P.pa3); i.hline(63, 85, 6, P.s4);
  i.set(59, 86, P.tx); i.set(75, 86, P.tx);
  i.hline(60, 100, 12, P.skin0); i.hline(62, 101, 8, P.r0);                                 // mouth
  i.vline(66, 90, 6, P.skin0);                                                              // nose
  // headphones
  i.rect(41, 78, 4, 18, P.s1); i.rect(87, 78, 4, 18, P.s1); i.line(44, 66, 88, 66, P.s3); i.vline(43, 66, 12, P.s3); i.vline(89, 66, 12, P.s3);
  i.bevel(38, 82, 8, 14, P.s3, P.s2, P.s0); i.bevel(86, 82, 8, 14, P.s3, P.s2, P.s0);
  // alcove frame
  i.frame(0, 0, W, H, P.ink); i.frame(1, 1, W - 2, H - 2, P.s1);
  return { id: "portrait", img: i, frames: { w: W, h: H, count: 1 }, note: "operator portrait, idle frame only (stage 5 adds states)" };
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
  i.wear(r, 2, 2, w - 4, h - 5, P.s0, 3);
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
    sceneBg(), bannerSub(), portrait(), gauges(),
    paper("telegram", 268, 104, 61, "telegram"), paper("secret-paper", 268, 110, 67, "secret"),
    machine(), key("key-round", 16, 16, 71), slicedKey("keywide-up", false), slicedKey("keywide-down", true), lamp(), statusLamp(),
    button("btn-up", "up"), button("btn-down", "down"), button("btn-off", "off"), pause(), noise(),
  ];
}
