// Submarine cutaway banner (TEMPORARY, original work): long low hull, stepped conning tower, seven different
// compartments each lit by its own lamp, crew silhouettes with rim light. Clean bands, no dither or scattered noise.
import { Img, type RGBA } from "./pix.ts";
import { T } from "./tone.ts";
import type { Sprite } from "./sprites.ts";

export const BOAT_W = 500, BOAT_H = 80;
/** Cutaway window inside the boat sprite (alarm/cracks overlays use the same geometry). */
export const WIN = { x: 64, y: 40, w: 376, h: 22 } as const;
/** Propeller hub position inside the boat sprite (the prop sprite is centred here). */
export const PROP = { x: 486, y: 50 } as const;

const lerp = (pts: readonly (readonly [number, number])[], x: number): number => {
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1] as readonly [number, number], b = pts[k] as readonly [number, number];
    if (x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / Math.max(1e-6, b[0] - a[0]);
  }
  return (pts[pts.length - 1] as readonly [number, number])[1];
};
const TOP = [[4, 45], [14, 41], [34, 38], [64, 36], [430, 36], [456, 38], [474, 42], [484, 47]] as const;
const BOT = [[4, 47], [12, 52], [28, 58], [58, 63], [120, 66], [372, 66], [420, 63], [452, 57], [484, 49]] as const;
const inHull = (x: number, y: number): boolean => x >= 4 && x <= 484 && y >= lerp(TOP, x) && y <= lerp(BOT, x);
export const inWin = (x: number, y: number): boolean => {
  const { x: wx, y: wy, w, h } = WIN, r = h / 2, cy = wy + r;
  if (y < wy || y >= wy + h || x < wx || x >= wx + w) return false;
  if (x < wx + r) return ((x + 0.5 - (wx + r)) / r) ** 2 + ((y + 0.5 - cy) / r) ** 2 <= 1;
  if (x >= wx + w - r) return ((x + 0.5 - (wx + w - r)) / r) ** 2 + ((y + 0.5 - cy) / r) ** 2 <= 1;
  return true;
};

const SHAFT = (x: number, y: number): boolean => { const c = 360 - (y - 10) * 0.55; return x > c && x < c + 46; }; // moonlight shaft (boat coords)
const FLOOR = WIN.y + WIN.h - 5; // y of the deck plates inside

interface Room { x0: number; x1: number; lamp: number; walls: readonly RGBA[]; tint?: RGBA }
const ROOMS: readonly Room[] = [
  { x0: 64, x1: 121, lamp: 96, walls: T.wl },                               // bow torpedo room
  { x0: 124, x1: 189, lamp: 156, walls: T.wl },                             // quarters
  { x0: 192, x1: 261, lamp: 226, walls: T.wc },                             // control room (cool light)
  { x0: 264, x1: 290, lamp: 277, walls: T.wc, tint: [80, 190, 130, 40] },   // radio room (green dials)
  { x0: 292, x1: 325, lamp: 308, walls: T.wl },                             // galley
  { x0: 328, x1: 403, lamp: 365, walls: T.wl, tint: [230, 140, 60, 34] },   // diesel room (warm)
  { x0: 406, x1: 440, lamp: 422, walls: T.wl },                             // motor room
];
export const LAMPS = ROOMS.map((r) => r.lamp);
const BULKHEADS = [122, 190, 262, 326, 404];

/** Crew silhouette with rim light on the lamp side. */
function crew(i: Img, x: number, foot: number, kind: "stand" | "sit" | "lean" | "ladder", rim: RGBA): void {
  const S: Record<typeof kind, readonly string[]> = {
    stand: [".bb.", "bbbb", ".bb.", "bbbbb", "bbbbb", "bbbbb", "b.bb.b", ".bbb", ".b.b", ".b.b", ".b.b"],
    sit: [".bb.", "bbbb", ".bb.", "bbbbb", "bbbbb", "bbbbb", ".bbbbbb", ".b...b", ".b...b"],
    lean: ["..bb.", ".bbbb", "bbbbb.", "bbbbbb", ".bbbbb", ".bbbb", ".b.b", ".b.b", ".b.b"],
    ladder: [".bb.", "bbbb", ".bb.", "bbbbb", "b.bb.b", "bbbbb", "..bbb", ".b.b", ".b..b", "b...b"],
  };
  const rows = S[kind], top = foot - rows.length + 1, dark = T.k[1] as RGBA;
  i.stamp(x, top, rows, { b: dark });
  rows.forEach((r, j) => { const k = r.indexOf("b"); if (k >= 0) i.set(x + k, top + j, rim); });
  i.set(x + 1, top, T.k[3] as RGBA); // cap/hair catches a little light
}

function room(i: Img, r: Room): void {
  const ramp = r.walls;
  for (let y = WIN.y; y < FLOOR; y++) for (let x = r.x0; x <= r.x1; x++) {
    if (!inWin(x, y)) continue;
    const d = Math.hypot((x - r.lamp) * 0.55, (y - (WIN.y + 3)) * 1.1);
    const k = d < 5 ? 5 : d < 9 ? 4 : d < 14 ? 3 : d < 20 ? 2 : 1;
    i.set(x, y, ramp[Math.min(ramp.length - 1, k)] as RGBA);
    if (r.tint) i.tint(x, y, r.tint);
  }
  // ceiling pipe run and the lamp
  for (let x = r.x0; x <= r.x1; x++) { if (inWin(x, WIN.y + 2)) i.set(x, WIN.y + 2, T.k[4] as RGBA); if (inWin(x, WIN.y + 3)) i.set(x, WIN.y + 3, T.k[2] as RGBA); }
  i.rect(r.lamp - 1, WIN.y + 3, 3, 2, T.lamp[2] as RGBA); i.set(r.lamp, WIN.y + 4, T.lamp[3] as RGBA);
  // deck plates
  for (let x = r.x0; x <= r.x1; x++) {
    if (inWin(x, FLOOR)) i.set(x, FLOOR, ramp[3] as RGBA);
    for (let y = FLOOR + 1; y < WIN.y + WIN.h; y++) if (inWin(x, y)) i.set(x, y, (y === FLOOR + 1 ? T.k[2] : T.k[1]) as RGBA);
  }
}

function furnish(i: Img): void {
  const k = T.k, e = T.e, f = FLOOR;
  // torpedo room: two reloads on racks, tube doors on the forward bulkhead, a hammock
  const torpedo = (x: number, y: number, len: number): void => {
    i.rect(x + 2, y, len - 2, 3, k[4] as RGBA); i.hline(x + 2, y, len - 2, k[6] as RGBA); i.hline(x + 2, y + 2, len - 2, k[2] as RGBA);
    i.set(x + 1, y + 1, k[4] as RGBA); i.set(x + 1, y, k[5] as RGBA); i.vline(x + len, y - 1, 5, k[3] as RGBA);
  };
  torpedo(78, f - 4, 34); torpedo(80, f - 9, 30);
  i.rect(80, f - 1, 30, 1, k[2] as RGBA);
  for (const y of [WIN.y + 7, WIN.y + 12]) { i.rect(68, y, 4, 3, k[5] as RGBA); i.set(69, y + 1, k[1] as RGBA); }
  i.line(86, WIN.y + 6, 108, WIN.y + 8, T.wl[4] as RGBA); i.line(86, WIN.y + 7, 108, WIN.y + 9, T.wl[2] as RGBA);
  crew(i, 112, f - 1, "stand", T.wl[5] as RGBA);
  // quarters: two-tier bunks with blankets, a small table with a lamp
  for (const [x, w] of [[127, 26], [158, 28]] as const) for (const y of [WIN.y + 8, f - 4]) {
    i.rect(x, y, w, 3, T.m[2] as RGBA); i.hline(x, y, w, T.m[4] as RGBA); i.rect(x, y, 4, 2, T.pa[3] as RGBA); i.hline(x, y + 3, w, k[1] as RGBA);
  }
  i.vline(156, WIN.y + 6, f - WIN.y - 6, k[3] as RGBA);
  crew(i, 146, f - 1, "sit", T.wl[5] as RGBA); crew(i, 176, f - 1, "stand", T.wl[4] as RGBA);
  // control room: ladder into the tower, periscope column, hand wheels and gauges, chart table
  for (let y = WIN.y; y < f; y++) { i.set(200, y, k[5] as RGBA); i.set(205, y, k[5] as RGBA); if (y % 3 === 0) i.hline(201, y, 4, k[4] as RGBA); }
  for (let y = WIN.y; y < f; y++) { i.set(229, y, k[4] as RGBA); i.set(230, y, k[6] as RGBA); i.set(231, y, k[3] as RGBA); }
  i.rect(227, WIN.y + 9, 7, 4, k[4] as RGBA); i.hline(227, WIN.y + 9, 7, k[6] as RGBA); i.set(226, WIN.y + 10, k[1] as RGBA);
  for (const x of [240, 248]) { i.stamp(x, WIN.y + 6, [".r.", "rkr", ".r."], { r: T.red[2] as RGBA, k: T.red[0] as RGBA }); }
  for (const x of [212, 217]) { i.rect(x, WIN.y + 6, 3, 3, k[1] as RGBA); i.set(x + 1, WIN.y + 7, T.pa[4] as RGBA); }
  i.rect(244, f - 5, 14, 2, T.wc[4] as RGBA); i.hline(244, f - 6, 14, T.pa[3] as RGBA); i.vline(246, f - 3, 3, k[2] as RGBA); i.vline(256, f - 3, 3, k[2] as RGBA);
  crew(i, 202, f - 2, "ladder", T.wc[4] as RGBA); crew(i, 222, f - 1, "stand", T.wc[4] as RGBA); crew(i, 236, f - 1, "sit", T.wc[4] as RGBA); crew(i, 251, f - 1, "lean", T.wc[4] as RGBA);
  // radio room: stacked sets with small green and amber dials, operator at the desk
  for (const [y, h] of [[WIN.y + 5, 4], [WIN.y + 10, 4]] as const) {
    i.rect(266, y, 14, h, e[3] as RGBA); i.hline(266, y, 14, e[5] as RGBA);
    i.set(268, y + 2, T.g[3] as RGBA); i.set(271, y + 2, T.am[3] as RGBA); i.hline(274, y + 2, 4, e[1] as RGBA);
  }
  i.rect(266, f - 5, 16, 2, T.wc[4] as RGBA);
  crew(i, 282, f - 1, "sit", T.g[3] as RGBA); i.set(283, f - 9, T.bake[4] as RGBA); // headphones on the operator
  // galley: stove with a warm glow, pots, a cook
  i.rect(295, f - 7, 12, 7, k[4] as RGBA); i.hline(295, f - 7, 12, k[6] as RGBA); i.rect(297, f - 4, 8, 2, T.am[2] as RGBA);
  i.rect(297, f - 10, 4, 3, k[5] as RGBA); i.rect(302, f - 9, 3, 2, k[3] as RGBA);
  crew(i, 312, f - 1, "stand", T.wl[5] as RGBA);
  // diesel room: one long engine block with cylinder heads and an exhaust trunk
  i.rect(334, f - 8, 64, 8, e[4] as RGBA); i.hline(334, f - 8, 64, e[6] as RGBA); i.hline(334, f - 1, 64, e[2] as RGBA);
  for (let x = 337; x < 396; x += 8) { i.rect(x, f - 11, 5, 3, e[5] as RGBA); i.hline(x, f - 11, 5, e[7] as RGBA); i.vline(x + 2, WIN.y + 4, f - 11 - WIN.y - 4, e[3] as RGBA); }
  i.rect(334, WIN.y + 4, 64, 2, e[3] as RGBA); i.hline(334, WIN.y + 4, 64, e[5] as RGBA);
  crew(i, 358, f - 9, "lean", T.wl[5] as RGBA); crew(i, 384, f - 9, "stand", T.wl[5] as RGBA);
  // motor room: switchboard and the electric motor
  i.rect(408, WIN.y + 5, 10, 9, e[3] as RGBA); i.hline(408, WIN.y + 5, 10, e[5] as RGBA);
  for (let k2 = 0; k2 < 3; k2++) i.set(410 + k2 * 3, WIN.y + 8, (k2 === 1 ? T.red[3] : T.g[3]) as RGBA);
  i.rect(420, f - 6, 14, 6, e[4] as RGBA); i.hline(420, f - 6, 14, e[6] as RGBA);
  crew(i, 412, f - 1, "stand", T.wl[4] as RGBA);
  // pressure bulkheads with their round hatches
  for (const x of BULKHEADS) {
    for (let y = WIN.y; y < WIN.y + WIN.h; y++) if (inWin(x, y)) { i.set(x, y, k[3] as RGBA); i.set(x + 1, y, k[5] as RGBA); }
    i.rect(x - 1, WIN.y + 8, 4, 8, k[1] as RGBA); i.vline(x - 1, WIN.y + 8, 8, k[6] as RGBA); i.hline(x - 1, WIN.y + 7, 4, k[6] as RGBA);
  }
}

function boat(): Sprite {
  const i = new Img(BOAT_W, BOAT_H), h = T.hull;
  // exterior hull: horizontal moonlight bands (brighter where the light shaft falls)
  for (let x = 4; x <= 484; x++) {
    const t0 = lerp(TOP, x), b0 = lerp(BOT, x);
    for (let y = Math.ceil(t0); y <= b0; y++) {
      const t = (y - t0) / Math.max(1, b0 - t0);
      let k = t < 0.07 ? 5 : t < 0.2 ? 4 : t < 0.62 ? 3 : t < 0.86 ? 2 : 1;
      if (x < 30 || x > 462) k -= 1;
      if (SHAFT(x, y) && k < 6) k += 1;
      i.set(x, y, h[Math.max(0, k)] as RGBA);
    }
  }
  // casing details: deck edge, limber holes along the casing, saddle-tank seam, a few plate seams
  for (let x = 40; x < 450; x++) i.set(x, 38, h[2] as RGBA);
  for (let x = 84; x < 420; x += 9) if (x < 192 || x > 266) { i.hline(x, 39, 3, h[0] as RGBA); }
  for (let x = 70; x < 432; x++) { i.set(x, 64, h[1] as RGBA); }
  for (let x = 96; x < 420; x += 38) i.vline(x, 62, 3, h[1] as RGBA);
  // conning tower: stepped fairing, bridge, rear platform with a light gun, periscope standards, DF loop
  const tower: [number, number][] = [[190, 37], [196, 26], [204, 23], [205, 16], [246, 16], [249, 21], [262, 23], [268, 37]];
  const inT = (x: number, y: number): boolean => { let c = false; for (let a = 0, b = tower.length - 1; a < tower.length; b = a++) { const [xa, ya] = tower[a] as [number, number], [xb, yb] = tower[b] as [number, number]; if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) c = !c; } return c; };
  for (let y = 15; y < 38; y++) for (let x = 188; x < 270; x++) if (inT(x + 0.5, y + 0.5)) i.set(x, y, (y < 18 ? h[5] : y < 24 ? h[4] : h[3]) as RGBA);
  for (let x = 207; x < 244; x += 5) i.hline(x, 18, 3, h[1] as RGBA);                 // bridge rail slots
  i.hline(196, 26, 8, h[5] as RGBA); i.hline(249, 22, 13, h[5] as RGBA);
  for (const [x, top] of [[232, 2], [238, 6]] as const) { i.vline(x, top, 16 - top, h[4] as RGBA); i.vline(x + 1, top, 16 - top, h[2] as RGBA); }
  i.rect(231, 2, 4, 2, h[5] as RGBA);
  for (let a = 0; a < 360; a += 20) { const t = (a * Math.PI) / 180; i.set(Math.round(214 + Math.cos(t) * 3), Math.round(11 + Math.sin(t) * 3), h[5] as RGBA); }
  i.vline(214, 14, 3, h[4] as RGBA);
  i.line(254, 21, 264, 17, h[4] as RGBA); i.rect(252, 19, 4, 3, h[3] as RGBA);       // rear gun
  // deck gun forward of the tower
  i.rect(156, 32, 6, 5, h[4] as RGBA); i.hline(156, 32, 6, h[6] as RGBA); i.line(156, 33, 138, 31, h[5] as RGBA);
  // jumping wires (thin, low contrast)
  i.line(10, 42, 205, 16, h[2] as RGBA); i.line(247, 16, 476, 42, h[2] as RGBA);
  // bow planes, stern planes, rudder and shaft
  i.stamp(24, 56, ["aaaa..", ".bbbbb"], { a: h[3] as RGBA, b: h[1] as RGBA });
  i.stamp(458, 52, ["aaaaa", ".bbbb"], { a: h[3] as RGBA, b: h[1] as RGBA });
  for (let y = 41; y < 60; y++) i.hline(478, y, 3, (y < 45 ? h[4] : h[2]) as RGBA);
  i.hline(482, PROP.y, 4, h[1] as RGBA);

  // the cutaway: rooms, furniture, crew, then the cut edge of the pressure hull
  for (const r of ROOMS) room(i, r);
  furnish(i);
  for (let y = WIN.y - 2; y < WIN.y + WIN.h + 2; y++) for (let x = WIN.x - 2; x < WIN.x + WIN.w + 2; x++) {
    if (inWin(x, y)) continue;
    const n = inWin(x + 1, y) || inWin(x - 1, y) || inWin(x, y + 1) || inWin(x, y - 1);
    const n2 = inWin(x + 2, y) || inWin(x - 2, y) || inWin(x, y + 2) || inWin(x, y - 2);
    if (n) i.set(x, y, h[0] as RGBA); else if (n2 && inHull(x, y)) i.set(x, y, (y < WIN.y + WIN.h / 2 ? h[5] : h[2]) as RGBA);
  }
  return { id: "banner-boat", img: i, note: "submarine cutaway: hull, tower, 7 lit compartments, crew (own layer, moved by mode)" };
}

/** Night sky over a dark sea, with a moon and a moonlight shaft falling into the water. Banner coordinates. */
function sea(): Sprite {
  const W = 624, H = 92, i = new Img(W, H), s = T.sea, sk = T.sky, surf = 44;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y < surf) { const k = y < 12 ? 0 : y < 26 ? 1 : y < 38 ? 2 : 3; i.set(x, y, sk[k] as RGBA); }
    else { const d = y - surf, k = d < 3 ? 5 : d < 12 ? 4 : d < 24 ? 3 : d < 36 ? 2 : 1; i.set(x, y, s[k] as RGBA); }
  }
  // moon with two halo bands
  for (let y = 0; y < surf; y++) for (let x = 480; x < 560; x++) {
    const d = Math.hypot(x - 520, y - 16);
    if (d < 3.5) i.set(x, y, [176, 182, 200, 255]); else if (d < 8) i.tint(x, y, [130, 140, 180, 30]); else if (d < 15) i.tint(x, y, [110, 120, 170, 14]);
  }
  // long thin clouds
  for (const [x, y, w] of [[60, 9, 90], [300, 14, 120], [470, 22, 70]] as const) { i.hline(x, y, w, sk[2] as RGBA); i.hline(x + 10, y + 1, w - 24, sk[1] as RGBA); }
  // moonlight shaft under the surface (two soft bands)
  for (let y = surf; y < H; y++) for (let x = 0; x < W; x++) {
    const c = 470 - (y - surf) * 0.9;
    if (x > c && x < c + 52) i.tint(x, y, [140, 175, 215, x > c + 10 && x < c + 40 ? 26 : 14]);
  }
  // surface line with irregular crests
  for (let x = 0; x < W; x++) i.set(x, surf, [58, 76, 118, 255]);
  for (let x = 3, k = 0; x < W; x += 7 + ((k * 5) % 9), k++) i.hline(x, surf - 1, 2 + (k % 3), [90, 110, 150, 255]);
  return { id: "banner-sea", img: i, note: "night sky, moon, sea with a moonlight shaft" };
}

/** Translucent water in front of the boat, in flat alpha bands (no checkerboard). */
function water(): Sprite {
  const W = 624, H = 92, i = new Img(W, H), surf = 44;
  for (let y = surf; y < H; y++) {
    const d = y - surf, a = d < 8 ? 36 : d < 20 ? 64 : d < 32 ? 118 : 176;
    for (let x = 0; x < W; x++) i.set(x, y, [16, 22, 44, a]);
  }
  for (let x = 0; x < W; x++) i.set(x, surf, [70, 92, 140, 230]);
  for (let x = 5, k = 0; x < W; x += 9 + ((k * 7) % 11), k++) i.hline(x, surf + 2 + (k % 2), 3, [70, 92, 140, 120]);
  return { id: "banner-water", img: i, note: "translucent foreground water band in flat alpha steps (boat sinks behind it)" };
}

function frame(): Sprite {
  const W = 624, H = 92, i = new Img(W, H), k = T.k;
  i.frame(0, 0, W, H, k[0] as RGBA); i.frame(1, 1, W - 2, H - 2, k[4] as RGBA); i.frame(2, 2, W - 4, H - 4, k[1] as RGBA);
  i.hline(2, 2, W - 4, k[5] as RGBA);
  for (const [x, y] of [[4, 4], [W - 7, 4], [4, H - 7], [W - 7, H - 7]] as const) i.stamp(x, y, [".a.", "abc", ".c."], { a: k[6] as RGBA, b: k[4] as RGBA, c: k[1] as RGBA });
  return { id: "banner-frame", img: i, note: "viewport frame, corner screws only (top layer)" };
}

/** Red emergency lighting: a flat translucent wash over the cutaway and red lamps. */
function alarm(): Sprite {
  const i = new Img(BOAT_W, BOAT_H);
  for (let y = WIN.y; y < WIN.y + WIN.h; y++) for (let x = WIN.x; x < WIN.x + WIN.w; x++) if (inWin(x, y)) i.set(x, y, [170, 30, 44, 92]);
  for (const lx of LAMPS) { i.rect(lx - 1, WIN.y + 3, 3, 2, T.red[3] as RGBA); i.rect(lx - 4, WIN.y + 5, 9, 1, [232, 112, 122, 110]); }
  return { id: "boat-alarm", img: i, note: "emergency red lighting overlay" };
}

/** Hull damage levels as frames: cracks with a lit edge, scorch, then leaks inside. Fixed positions, not noise. */
function cracks(): Sprite {
  const sheet = new Img(BOAT_W * 3, BOAT_H);
  const CR: readonly (readonly [number, number, number])[] = [[150, 36, 1], [300, 36, -1], [380, 62, 1], [110, 62, -1], [250, 36, 1], [420, 37, -1]];
  for (let lvl = 0; lvl < 3; lvl++) {
    const i = new Img(BOAT_W, BOAT_H);
    CR.slice(0, 2 + lvl * 2).forEach(([x, y, dir], n) => {
      let cx = x, cy = y;
      for (let s = 0; s < 4 + lvl * 2; s++) { i.set(cx, cy, T.k[0] as RGBA); i.set(cx + 1, cy, T.hull[5] as RGBA); cy += y < 50 ? 1 : -1; if (s % 2 === n % 2) cx += dir; }
    });
    if (lvl >= 1) for (const x of [170, 340]) { i.rect(x, 36, 6, 2, T.k[1] as RGBA); i.set(x + 2, 38, T.red[3] as RGBA); }
    if (lvl === 2) for (const x of [140, 230, 318, 396]) for (let y = WIN.y + 3; y < FLOOR; y += 2) i.set(x + ((y >> 1) & 1), y, T.hull[6] as RGBA); // water sprays
    sheet.blit(i, lvl * BOAT_W, 0);
  }
  return { id: "boat-cracks", img: sheet, frames: { w: BOAT_W, h: BOAT_H, count: 3 }, note: "hull damage overlay, frame 0..2 = light, heavy, critical" };
}

function prop(): Sprite {
  const sheet = new Img(16 * 4, 16), b = T.brass;
  for (let f = 0; f < 4; f++) {
    const i = new Img(16, 16), a = (f * Math.PI) / 6;
    for (let k = 0; k < 3; k++) { // blades seen edge-on from the side: they read as a vertical flicker
      const t = a + (k * 2 * Math.PI) / 3, len = Math.round(Math.sin(t) * 6);
      i.vline(8, Math.min(8, 8 + len), Math.abs(len) + 1, (Math.cos(t) > 0 ? b[4] : b[2]) as RGBA);
      i.set(9, 8 + len, b[1] as RGBA);
    }
    i.rect(7, 7, 3, 3, b[3] as RGBA); i.set(7, 7, b[4] as RGBA);
    sheet.blit(i, f * 16, 0);
  }
  return { id: "prop", img: sheet, frames: { w: 16, h: 16, count: 4 }, note: "propeller seen from the side, 4 rotation frames" };
}

export function boatSprites(): Sprite[] { return [sea(), boat(), water(), frame(), alarm(), cracks(), prop()]; }
