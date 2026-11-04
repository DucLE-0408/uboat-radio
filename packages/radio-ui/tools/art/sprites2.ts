// Stage-5 placeholder art (TEMPORARY): layered submarine cutaway and the operator portrait sheet. Original work, deterministic.
import { artRng, bayer, CLEAR, Img, type RGBA } from "./pix.ts";
import { P } from "./palette.ts";
import type { Sprite } from "./sprites.ts";

export const BOAT_W = 500, BOAT_H = 80;
const HX = 22, HY = 32, HW = 430, HH = 40; // hull rect inside the boat sprite

/** Sea and sky of the viewport (no boat, no frame). */
function sea(): Sprite {
  const W = 624, H = 92, i = new Img(W, H), rng = artRng(23);
  i.vgrad(0, 0, W, 44, P.n1, P.p1);
  i.vgrad(0, 44, W, 48, P.w1, P.w0);
  for (let y = 46; y < H; y += 5) for (let x = (y * 7) % 11; x < W; x += 11) i.hline(x, y, 3, P.w2);
  for (let x = 0; x < W; x += 3) i.set(x, 44 + (x % 6 < 3 ? 0 : 1), P.w3);
  for (let k = 0; k < 40; k++) i.set(Math.floor(rng() * W), Math.floor(rng() * 40), P.lav); // a few stars
  return { id: "banner-sea", img: i, note: "viewport sea and dusk sky" };
}

/** Translucent water in front of the boat: lets a diving boat disappear under the surface. */
function water(): Sprite {
  const W = 624, H = 92, i = new Img(W, H);
  for (let y = 44; y < H; y++) for (let x = 0; x < W; x++) {
    const a = Math.min(190, 70 + (y - 44) * 3);
    if (bayer(x, y) < 0.8) i.set(x, y, [16, 34, 90, a]);
  }
  for (let y = 46; y < H; y += 6) for (let x = (y * 5) % 13; x < W; x += 13) i.hline(x, y, 4, [94, 143, 214, 150]);
  for (let x = 0; x < W; x += 3) i.set(x, 44 + (x % 6 < 3 ? 0 : 1), [94, 143, 214, 230]);
  return { id: "banner-water", img: i, note: "translucent foreground water band (boat sinks behind it)" };
}

function frame(): Sprite {
  const W = 624, H = 92, i = new Img(W, H), rng = artRng(29);
  i.frame(0, 0, W, H, P.ink); i.frame(1, 1, W - 2, H - 2, P.s1); i.frame(2, 2, W - 4, H - 4, P.s0);
  for (let x = 10; x < W; x += 52) { i.rivet(x, 2, P.s3, P.s0); i.rivet(x, H - 4, P.s3, P.s0); }
  i.wear(rng, 3, 3, W - 6, H - 6, [58, 52, 117, 255], 120);
  return { id: "banner-frame", img: i, note: "viewport frame with rivets (top layer)" };
}

/** The cutaway hull with tower, crew and lit compartments. */
function boat(): Sprite {
  const i = new Img(BOAT_W, BOAT_H);
  const hx = HX, hy = HY, hw = HW, hh = HH;
  i.ellipse(hx + 14, hy + 20, 18, 20, P.s1); i.ellipse(hx + hw - 14, hy + 20, 18, 20, P.s1);
  i.rect(hx + 12, hy, hw - 24, hh, P.s1);
  i.rect(hx + 8, hy + 4, hw - 16, hh - 8, P.s0);
  i.dither(hx + 10, hy + 6, hw - 20, hh - 12, P.n2, P.n3, 0.35);
  for (let k = 0; k < 7; k++) { const bx = hx + 40 + k * 58; i.rect(bx, hy + 6, 3, hh - 12, P.s2); i.vline(bx + 3, hy + 6, hh - 12, P.s0); }
  i.rect(hx + 10, hy + hh - 10, hw - 20, 4, P.b1); i.hline(hx + 10, hy + hh - 10, hw - 20, P.b2);
  for (let k = 0; k < 14; k++) { const px = hx + 24 + k * 29; i.hline(px, hy + 8, 18, P.s3); i.hline(px, hy + 9, 18, P.s0); }
  for (let k = 0; k < 7; k++) { const lx = hx + 52 + k * 58; i.rect(lx, hy + 10, 4, 3, P.amber); i.set(lx + 1, hy + 13, P.b3); }
  for (const cx of [hx + 70, hx + 134, hx + 188, hx + 250, hx + 304, hx + 362]) {
    i.rect(cx, hy + 18, 5, 12, P.ink); i.ellipse(cx + 2, hy + 16, 2, 2, P.skin0); i.rect(cx - 1, hy + 18, 1, 6, P.ink); i.rect(cx + 5, hy + 18, 1, 6, P.ink);
  }
  i.frame(hx + 8, hy + 4, hw - 16, hh - 8, P.s2);
  for (let k = 0; k < 40; k++) i.set(hx + 12 + k * 10, hy + 2, P.s3);
  i.rect(hx + 190, hy - 18, 54, 20, P.s1); i.frame(hx + 190, hy - 18, 54, 20, P.s0); i.rect(hx + 196, hy - 14, 42, 8, P.n2);
  for (let k = 0; k < 4; k++) i.rect(hx + 200 + k * 10, hy - 12, 6, 4, P.amber);
  i.rect(hx + 244, hy - 30, 2, 14, P.s3); i.rect(hx + 244, hy - 30, 8, 2, P.s3);
  i.rect(hx + 150, hy - 6, 20, 6, P.s1); i.line(hx + 150, hy - 6, hx + 170, hy - 6, P.s3);
  i.rect(hx + hw - 6, hy + 26, 20, 4, P.s1);
  i.rect(hx - 18, hy + 22, 22, 4, P.s2);
  return { id: "banner-boat", img: i, note: "submarine cutaway (own layer, moved by mode)" };
}

/** Red emergency lighting over the interior, drawn on top of the boat. */
function alarm(): Sprite {
  const i = new Img(BOAT_W, BOAT_H);
  for (let y = HY + 6; y < HY + HH - 6; y++) for (let x = HX + 10; x < HX + HW - 10; x++) if (bayer(x, y) < 0.32) i.set(x, y, [177, 58, 86, 150]);
  for (let k = 0; k < 7; k++) { const lx = HX + 52 + k * 58; i.rect(lx - 1, HY + 9, 6, 5, [255, 123, 140, 255]); i.rect(lx - 3, HY + 8, 10, 1, [255, 123, 140, 120]); }
  return { id: "boat-alarm", img: i, note: "emergency red lighting overlay" };
}

/** Three hull-damage levels as frames (cracks, scorch, leaks). */
function cracks(): Sprite {
  const sheet = new Img(BOAT_W * 3, BOAT_H), rng = artRng(37);
  for (let lvl = 0; lvl < 3; lvl++) {
    const i = new Img(BOAT_W, BOAT_H);
    const n = (lvl + 1) * 4;
    for (let k = 0; k < n; k++) {
      let x = HX + 40 + Math.floor(rng() * (HW - 80)), y = HY + 4 + Math.floor(rng() * 6);
      for (let s = 0; s < 6 + lvl * 3; s++) { i.set(x, y, P.ink); x += Math.floor(rng() * 3) - 1; y += 1; if (y > HY + HH - 4) break; }
    }
    for (let k = 0; k < (lvl + 1) * 3; k++) { const x = HX + 30 + Math.floor(rng() * (HW - 60)); i.rect(x, HY + 3, 3 + lvl, 2, P.r0); i.set(x + 1, HY + 5 + lvl, [255, 123, 140, 255]); }
    if (lvl === 2) for (let k = 0; k < 18; k++) i.set(HX + 60 + Math.floor(rng() * 300), HY + HH - 5 + Math.floor(rng() * 3), P.w3); // leaks
    sheet.blit(i, lvl * BOAT_W, 0);
  }
  return { id: "boat-cracks", img: sheet, frames: { w: BOAT_W, h: BOAT_H, count: 3 }, note: "hull damage overlay, frame 0..2 = light, heavy, critical" };
}

function prop(): Sprite {
  const sheet = new Img(16 * 4, 16);
  for (let f = 0; f < 4; f++) {
    const i = new Img(16, 16);
    i.ellipse(8, 8, 2, 2, P.b2);
    const a = (f * Math.PI) / 4;
    for (let b = 0; b < 3; b++) { const t = a + (b * 2 * Math.PI) / 3; i.line(8, 8, Math.round(8 + Math.cos(t) * 7), Math.round(8 + Math.sin(t) * 7), P.b3); i.set(Math.round(8 + Math.cos(t) * 7), Math.round(8 + Math.sin(t) * 7), P.b2); }
    sheet.blit(i, f * 16, 0);
  }
  return { id: "prop", img: sheet, frames: { w: 16, h: 16, count: 4 }, note: "propeller, 4 rotation frames" };
}

export function boatSprites(): Sprite[] { return [sea(), boat(), water(), frame(), alarm(), cracks(), prop()]; }

// ------------------------------------------------------------------ portrait sheet

type Pose = "idle" | "blink" | "listening" | "writing" | "alert" | "hurt";
export const PORTRAIT_POSES: readonly Pose[] = ["idle", "blink", "listening", "writing", "alert", "hurt"];

function operator(pose: Pose): Img {
  const W = 132, H = 152, i = new Img(W, H), rng = artRng(31);
  const dx = pose === "hurt" ? -2 : pose === "listening" ? 1 : 0;
  const dy = pose === "writing" ? 5 : pose === "hurt" ? 3 : 0;
  const alert = pose === "alert";
  const bgTop: RGBA = alert ? P.r0 : P.n2;
  i.vgrad(0, 0, W, H, bgTop, P.n0);
  for (let y = 0; y < H; y += 12) i.hline(0, y, W, P.n1);
  i.wear(rng, 0, 0, W, H, P.n3, 200);
  i.rect(64, 0, 4, 12, P.s1); i.ellipse(66, 16, 9, 6, P.s2); i.ellipse(66, 20, 6, 3, alert ? P.r2 : pose === "hurt" ? P.b1 : P.amber); i.hline(60, 22, 12, P.b3);
  for (let y = 10; y < 150; y++) for (let x = 0; x < W; x++) { const ddx = x - 66, ddy = y - 20; if (bayer(x, y) < Math.max(0, 1 - Math.sqrt(ddx * ddx * 0.5 + ddy * ddy * 0.25) / 80) * 0.5) i.set(x, y, alert ? P.r1 : P.p1); }
  i.ellipse(66, 150, 50, 36, P.s0); i.ellipse(66, 152, 46, 34, P.n1); i.rect(40, 118, 52, 34, P.n1);
  i.line(48, 122, 40, 152, P.s0); i.line(84, 122, 92, 152, P.s0);
  for (let k = 0; k < 3; k++) i.set(66, 128 + k * 8, P.b3);
  // head group (shifted by the pose)
  const X = dx, Y = dy;
  i.rect(54, 116, 24, 6, P.pa1); i.rect(60, 116, 12, 4, P.skin1);
  i.ellipse(66 + X, 86 + Y, 19, 26, P.skin1); i.shadeEllipse(66 + X, 86 + Y, 19, 26, P.skin1, P.skin0, -0.6, -0.5);
  i.ellipse(64 + X, 80 + Y, 12, 14, P.skin2); i.shadeEllipse(64 + X, 80 + Y, 12, 14, P.skin2, P.skin1, -0.4, -0.4);
  i.ellipse(66 + X, 106 + Y, 11, 6, P.skin1); i.shadeEllipse(66 + X, 106 + Y, 11, 6, P.skin1, P.skin0, 0, 1);
  i.ellipse(47 + X, 90 + Y, 3, 5, P.skin1); i.ellipse(85 + X, 90 + Y, 3, 5, P.skin0);
  i.rect(42 + X, 64 + Y, 48, 12, P.s0); i.ellipse(66 + X, 62 + Y, 24, 10, P.s1); i.rect(42 + X, 74 + Y, 48, 3, P.ink); i.ellipse(66 + X, 66 + Y, 5, 4, P.b2); i.set(66 + X, 66 + Y, P.b3);
  // eyes
  const lensR = alert ? 7 : 6, lensH = alert ? 6 : 5;
  i.ellipse(58 + X, 86 + Y, lensR, lensH, P.s4); i.ellipse(74 + X, 86 + Y, lensR, lensH, P.s4);
  if (pose === "blink") { i.hline(53 + X, 86 + Y, 11, P.tx); i.hline(69 + X, 86 + Y, 11, P.tx); }
  else {
    i.ellipse(58 + X, 86 + Y, lensR - 2, lensH - 2, P.pa3); i.ellipse(74 + X, 86 + Y, lensR - 2, lensH - 2, P.pa3);
    const py = pose === "writing" ? 2 : 0; i.set(59 + X, 86 + Y + py, P.tx); i.set(75 + X, 86 + Y + py, P.tx);
    if (alert) { i.set(58 + X, 86 + Y, P.tx); i.set(74 + X, 86 + Y, P.tx); }
  }
  i.hline(63 + X, 85 + Y, 6, P.s4);
  if (alert) { i.hline(52 + X, 78 + Y, 9, P.skin0); i.hline(71 + X, 78 + Y, 9, P.skin0); }          // raised brows
  i.vline(66 + X, 90 + Y, 6, P.skin0);
  if (alert) { i.ellipse(66 + X, 101 + Y, 4, 3, P.r0); }                                               // open mouth
  else if (pose === "hurt") { i.hline(61 + X, 102 + Y, 10, P.skin0); i.set(60 + X, 101 + Y, P.skin0); i.set(71 + X, 101 + Y, P.skin0); }
  else { i.hline(60 + X, 100 + Y, 12, P.skin0); i.hline(62 + X, 101 + Y, 8, P.r0); }
  if (pose === "hurt") { i.dither(76 + X, 92 + Y, 8, 7, P.skin1, P.r0, 0.5); i.rect(52 + X, 71 + Y, 28, 3, P.pa2); i.hline(52 + X, 71 + Y, 28, P.pa1); } // bruise + bandage
  // headphones
  i.rect(41 + X, 78 + Y, 4, 18, P.s1); i.rect(87 + X, 78 + Y, 4, 18, P.s1); i.line(44 + X, 66 + Y, 88 + X, 66 + Y, P.s3); i.vline(43 + X, 66 + Y, 12, P.s3); i.vline(89 + X, 66 + Y, 12, P.s3);
  i.bevel(38 + X, 82 + Y, 8, 14, P.s3, P.s2, P.s0); i.bevel(86 + X, 82 + Y, 8, 14, P.s3, P.s2, P.s0);
  if (pose === "listening") { i.ellipse(36, 98, 6, 8, P.skin1); i.shadeEllipse(36, 98, 6, 8, P.skin1, P.skin0, -0.5, -0.5); for (let k = 0; k < 4; k++) i.vline(31 + k * 2, 93, 3 + (k % 2), P.skin0); } // hand to the ear cup
  if (pose === "writing") { i.rect(96, 128, 22, 3, P.b2); i.set(118, 129, P.ink); i.ellipse(100, 134, 7, 5, P.skin1); }                                    // pencil and hand
  i.frame(0, 0, W, H, P.ink); i.frame(1, 1, W - 2, H - 2, P.s1);
  return i;
}

export function portraitSheet(): Sprite {
  const sheet = new Img(132 * PORTRAIT_POSES.length, 152);
  PORTRAIT_POSES.forEach((p, f) => sheet.blit(operator(p), f * 132, 0));
  return { id: "portrait", img: sheet, frames: { w: 132, h: 152, count: PORTRAIT_POSES.length }, note: `operator portrait frames: ${PORTRAIT_POSES.join(", ")}` };
}
void CLEAR;
