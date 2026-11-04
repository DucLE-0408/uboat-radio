// Operator portrait (TEMPORARY, original work). Banded form shading from a single top-left lamp, hand-placed features;
// no dither and no scattered noise. 132x152 per frame; the bottom 26 px is the desk lip the drawer buttons sit on.
import { Img, type RGBA } from "./pix.ts";
import { T } from "./tone.ts";

export type Pose = "idle" | "blink" | "listening" | "writing" | "alert" | "hurt";
export const PORTRAIT_POSES: readonly Pose[] = ["idle", "blink", "listening", "writing", "alert", "hurt"];
export const PW = 132, PH = 152;

const clamp01 = (v: number): number => Math.max(0, Math.min(0.999, v));
const lerpPts = (pts: readonly (readonly [number, number])[], y: number): number | null => {
  const first = pts[0] as readonly [number, number], last = pts[pts.length - 1] as readonly [number, number];
  if (y < first[0] || y > last[0]) return null;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1] as readonly [number, number], b = pts[k] as readonly [number, number];
    if (y <= b[0]) return a[1] + ((b[1] - a[1]) * (y - a[0])) / Math.max(1e-6, b[0] - a[0]);
  }
  return last[1];
};
const inPoly = (x: number, y: number, p: readonly (readonly [number, number])[]): boolean => {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i] as readonly [number, number], [xj, yj] = p[j] as readonly [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const near = (x: number, y: number, cx: number, cy: number, rx: number, ry: number): number => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
/** Lambert term for a fake normal; light from the caged lamp above and slightly left of the face. */
const LX = -0.34, LY = -0.46, LZ = 0.82;
const lambert = (nx: number, ny: number): number => {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return Math.max(0, nx * LX + ny * LY + nz * LZ);
};

// Face half-width per row (y relative to the head origin). Narrow jaw, defined cheekbones: not an ellipse.
const FACE: readonly (readonly [number, number])[] = [[0, 16], [6, 17.5], [12, 18.5], [18, 18.5], [24, 18], [30, 16.5], [35, 14], [40, 10.5], [44, 6.5], [46, 4]];

function background(i: Img, alert: boolean): void {
  const k = T.pw;
  i.rect(0, 0, PW, PH, k[2] as RGBA);
  // arched hatch behind the operator: rim (lit top-left), dark passage inside
  const cx = 66, r = 40, base = 54; // semicircular head of the arch sits on two straight jambs
  const inArch = (x: number, y: number, rr: number): boolean => (y >= base ? Math.abs(x - cx) <= rr : near(x, y, cx, base, rr, rr) <= 1);
  for (let y = 0; y < 126; y++) for (let x = 0; x < PW; x++) {
    if (!inArch(x, y, r + 5)) continue;
    if (inArch(x, y, r)) { i.set(x, y, (y > 104 ? k[2] : k[1]) as RGBA); continue; }
    const edgeLit = x < cx && y < base + 10;
    i.set(x, y, (inArch(x, y, r + 1) ? k[0] : inArch(x, y, r + 4) ? (edgeLit ? k[5] : k[4]) : k[3]) as RGBA);
  }
  // hatch dogs on the rim, a few deliberate clusters
  for (const [x, y] of [[23, 60], [23, 96], [107, 60], [107, 96]] as const) { i.rect(x, y, 3, 4, k[6] as RGBA); i.hline(x, y + 3, 3, k[1] as RGBA); }
  // pipe run on the right wall with two flanges and a valve
  for (let y = 0; y < 126; y++) { i.set(113, y, k[3] as RGBA); i.set(114, y, k[5] as RGBA); i.set(115, y, k[6] as RGBA); i.set(116, y, k[4] as RGBA); i.set(117, y, k[1] as RGBA); }
  for (const y of [34, 88]) { i.rect(112, y, 7, 3, k[5] as RGBA); i.hline(112, y, 7, k[6] as RGBA); i.hline(112, y + 3, 7, k[0] as RGBA); }
  i.rect(117, 62, 9, 3, k[4] as RGBA); i.hline(117, 62, 9, k[5] as RGBA); i.rect(124, 58, 3, 11, k[3] as RGBA); i.vline(124, 58, 11, k[5] as RGBA);
  // junction box on the left wall
  i.rect(6, 70, 11, 14, k[3] as RGBA); i.hline(6, 70, 11, k[5] as RGBA); i.vline(6, 70, 14, k[4] as RGBA); i.hline(6, 83, 11, k[1] as RGBA);
  i.set(8, 72, k[6] as RGBA); i.set(14, 81, k[6] as RGBA); i.vline(11, 84, 42, k[3] as RGBA); i.vline(12, 84, 42, k[1] as RGBA);
  // caged lamp: bracket, bulb, bars; its light is two soft bands on the wall (tinted, not dithered)
  const glow: RGBA = alert ? [200, 40, 50, 255] : [240, 190, 110, 255];
  for (let y = 0; y < 126; y++) for (let x = 0; x < PW; x++) {
    const d = near(x, y, 66, 6, 58, 70);
    if (d < 0.35) i.tint(x, y, [glow[0], glow[1], glow[2], 26]);
    if (d < 0.12) i.tint(x, y, [glow[0], glow[1], glow[2], 22]);
  }
  i.rect(58, 0, 16, 3, k[4] as RGBA); i.hline(58, 2, 16, k[1] as RGBA);
  const bulb = alert ? T.red : T.lamp;
  i.rrect(61, 3, 10, 7, 2, bulb[1] as RGBA); i.rect(63, 4, 6, 4, bulb[2] as RGBA); i.rect(64, 4, 3, 2, bulb[3] as RGBA);
  for (const x of [62, 66, 70]) i.vline(x, 3, 7, k[1] as RGBA);
  i.hline(61, 9, 10, k[1] as RGBA);
}

function torso(i: Img, dx: number): void {
  const u = T.uni;
  // shoulders: width grows smoothly from the neck; lit from the upper left
  for (let y = 93; y < 126; y++) {
    const t = Math.min(1, Math.max(0, (y - 93) / 18)), hw = 15 + 39 * (t * t * (3 - 2 * t));
    for (let x = Math.floor(66 + dx * 0.5 - hw); x <= 66 + dx * 0.5 + hw; x++) {
      const nx = (x - 66 - dx * 0.5) / (hw + 0.5), top = y < 103 ? (103 - y) / 10 : 0;
      let v = 0.42 + lambert(nx * 0.8, -0.35 - top * 0.4) * 0.5;
      if (Math.abs(nx) > 0.86) v -= 0.18; // sleeve seam / arm turning away
      i.set(x, y, u[Math.floor(clamp01(v) * u.length)] as RGBA);
    }
  }
  // fold lines toward the armpits (hand-placed strokes, not noise)
  i.line(28, 116, 37, 109, u[1] as RGBA); i.line(104, 116, 96, 109, u[1] as RGBA); i.line(29, 117, 34, 114, u[2] as RGBA);
  // shoulder straps (subtle, one band darker) and the button placket
  i.hline(24, 106, 14, u[2] as RGBA); i.hline(94, 106, 14, u[1] as RGBA);
  const c = 66 + Math.round(dx * 0.5);
  i.vline(c, 108, 18, u[1] as RGBA);
  for (const y of [113, 121]) { i.rect(c - 1, y, 2, 2, u[0] as RGBA); i.set(c - 1, y, u[3] as RGBA); }
}

function neck(i: Img, dx: number, dy: number): void {
  const s = T.skin, cx = 66 + dx;
  for (let y = 82 + dy; y < 106; y++) {
    const hw = y < 96 ? 8.5 : 8.5 + (y - 96) * 0.6; // flares into the shoulders
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const nx = (x + 0.5 - cx) / (hw + 0.5);
      let v = 0.22 + lambert(nx, 0.1) * 0.5;
      if (y < 91 + dy) v -= 0.16; // under-jaw shadow
      i.set(x, y, s[Math.floor(clamp01(v) * s.length)] as RGBA);
    }
  }
  i.vline(cx + 3, 90 + dy, 4, s[2] as RGBA); // tendon on the shadow side
  // shirt collar points over the neck base
  const u = T.uni;
  const L: [number, number][] = [[cx - 11, 93], [cx - 1, 101], [cx - 2, 108], [cx - 15, 104]];
  const R: [number, number][] = [[cx + 11, 93], [cx + 1, 101], [cx + 2, 108], [cx + 15, 104]];
  for (let y = 90; y < 112; y++) for (let x = cx - 18; x <= cx + 18; x++) {
    if (inPoly(x + 0.5, y + 0.5, L)) i.set(x, y, (y < 97 ? u[5] : u[4]) as RGBA);
    else if (inPoly(x + 0.5, y + 0.5, R)) i.set(x, y, (y < 97 ? u[4] : u[3]) as RGBA);
  }
  i.line(cx - 11, 93, cx - 1, 101, u[2] as RGBA); i.line(cx + 11, 93, cx + 1, 101, u[1] as RGBA);
  i.line(cx - 15, 104, cx - 2, 108, u[1] as RGBA); i.line(cx + 15, 104, cx + 2, 108, u[0] as RGBA);
}

interface FaceOpt { dx: number; dy: number; pose: Pose }

function face(i: Img, o: FaceOpt): void {
  const s = T.skin, cx = 66 + o.dx, oy = 42 + o.dy; // head origin: top of the forehead (under the cap band)
  const ey = oy + 17, exL = cx - 8, exR = cx + 8;
  i.shade(cx - 20, oy, 41, 47, (x, y) => {
    const hw = lerpPts(FACE, y - oy);
    if (hw === null || Math.abs(x + 0.5 - cx) > hw) return null;
    const nx = (x + 0.5 - cx) / (hw + 0.6), ny = (y - oy - 20) / 36;
    let v = 0.2 + lambert(nx * 0.9, ny * 0.6) * 0.78;
    if (y - oy < 4) v -= 0.22;                                                        // cap shadow on the forehead
    if (near(x, y, exL, ey, 6, 3.6) < 1 || near(x, y, exR, ey, 6, 3.6) < 1) v -= 0.13; // eye sockets
    if (near(x, y, cx - 11, ey + 6, 4, 3) < 1) v += 0.07;                              // lit cheekbone
    if (near(x, y, cx - 12, ey + 12, 4, 4) < 1 || near(x, y, cx + 12, ey + 11, 4, 4) < 1) v -= 0.09; // hollow cheeks (tired)
    if (y > ey + 1 && y < ey + 12) { if (x === cx - 1) v += 0.08; if (x === cx + 2 || x === cx + 3) v -= 0.16; } // nose bridge, shadow side
    if (y === ey + 13 && Math.abs(x - cx) <= 2) v -= 0.2;                              // under the nose
    if (y === ey + 15 && Math.abs(x - cx) <= 4) v -= 0.06;                             // upper lip
    if (y === ey + 19 && Math.abs(x - cx) <= 3) v -= 0.14;                             // under the lower lip
    return clamp01(v);
  }, s);
  // contour: one darker pixel where the face turns away, so the head separates from neck and wall
  for (let y = oy; y < oy + 47; y++) {
    const hw = lerpPts(FACE, y - oy);
    if (hw === null) continue;
    i.set(Math.ceil(cx - 0.5 - hw), y, s[2] as RGBA); i.set(Math.floor(cx - 0.5 + hw), y, s[1] as RGBA);
    if (y === oy + 46) i.hline(Math.ceil(cx - 0.5 - hw), y, Math.round(hw * 2), s[1] as RGBA); // chin underside
  }
  // five-o'clock shadow: a cool translucent layer over the jaw (a tired night watch)
  for (let y = ey + 12; y < oy + 46; y++) for (let x = cx - 16; x <= cx + 16; x++) {
    const hw = lerpPts(FACE, y - oy);
    if (hw !== null && Math.abs(x + 0.5 - cx) <= hw - 1 && !(y < ey + 20 && Math.abs(x - cx) < 5)) i.tint(x, y, [70, 62, 78, 34]);
  }
  // hair: short sideburns under the cap band
  const h = T.hair;
  for (const side of [-1, 1] as const) for (let y = oy; y < oy + 13; y++) {
    const hw = lerpPts(FACE, y - oy) ?? 16;
    for (let k = 0; k < 3 - (y > oy + 9 ? 1 : 0); k++) i.set(Math.round(cx + side * (hw - k)), y, (side < 0 && k === 2 ? h[2] : h[1]) as RGBA);
  }

  // eyes: heavy upper lids (tired), muted sclera, small dark irises; no bright round whites
  const lid = h[0] as RGBA, w = T.eyeW, ir = T.iris, low = s[3] as RGBA, bag = s[4] as RGBA;
  const eye = (ex: number, look: number): void => {
    const x = ex - 3, y = ey - 1, p = o.pose;
    if (p === "blink") { i.hline(x + 1, y + 1, 5, lid); i.hline(x, y + 2, 6, low); return; }
    if (p === "hurt") { i.hline(x, y + 1, 6, lid); i.hline(x + 2, y + 2, 2, ir); i.hline(x + 1, y + 3, 4, low); return; }
    const open = p === "alert";
    i.hline(x + 1, y, 4, lid);
    i.set(x, y + 1, lid); i.set(x + 5, y + 1, s[2] as RGBA);
    i.hline(x + 1, y + 1, 4, w);
    const ix = x + 2 + look;
    if (p === "writing") { i.hline(x + 1, y + 1, 4, lid); i.hline(x + 1, y + 2, 4, w); i.hline(ix, y + 2, 2, ir); }
    else { i.hline(ix, y + 1, 2, ir); if (open) { i.hline(x + 1, y + 2, 4, w); i.set(ix, y + 2, ir); } }
    i.hline(x + 1, y + (open || p === "writing" ? 3 : 2), 4, low);
    i.hline(x + 1, y + (open || p === "writing" ? 4 : 3), 4, bag);
  };
  const look = o.pose === "listening" ? -1 : 0;
  eye(exL, look); eye(exR + 1, look);
  // brows: inner ends drawn down (concentration); raised and flat when alarmed
  const B = h[0] as RGBA, b = h[1] as RGBA;
  const by = ey - 5 - (o.pose === "alert" ? 1 : 0);
  if (o.pose === "alert") { i.hline(exL - 4, by, 7, B); i.hline(exR - 2, by, 7, B); }
  else {
    i.hline(exL - 4, by, 5, b); i.hline(exL - 3, by + 1, 6, B); i.set(exL + 3, by + 2, b);
    i.hline(exR, by, 5, b); i.hline(exR - 2, by + 1, 6, B); i.set(exR - 2, by + 2, b);
  }
  // nose tip and nostrils, nasolabial folds
  i.set(cx - 2, ey + 12, s[1] as RGBA); i.set(cx + 2, ey + 12, s[1] as RGBA); i.set(cx + 3, ey + 11, s[2] as RGBA);
  i.set(cx - 1, ey + 10, s[5] as RGBA);
  i.line(cx - 6, ey + 11, cx - 7, ey + 15, s[3] as RGBA); i.line(cx + 6, ey + 11, cx + 7, ey + 15, s[2] as RGBA);
  // mouth: closed, corners slightly down
  const my = ey + 16;
  if (o.pose === "alert") { i.rect(cx - 3, my, 6, 2, s[0] as RGBA); i.hline(cx - 2, my + 2, 4, s[2] as RGBA); }
  else {
    i.hline(cx - 4, my, 9, s[1] as RGBA); i.hline(cx - 1, my, 3, s[0] as RGBA);
    i.set(cx - 5, my + 1, s[2] as RGBA); i.set(cx + 5, my + 1, s[2] as RGBA);
    i.hline(cx - 3, my + 1, 6, s[4] as RGBA);
  }
  if (o.pose === "hurt") { // bruise on the shadow-side cheek + bandage across the forehead
    for (let y = ey + 4; y < ey + 12; y++) for (let x = cx + 7; x < cx + 15; x++) if (near(x, y, cx + 11, ey + 8, 4, 4) < 1) i.tint(x, y, [110, 40, 70, 90]);
    for (let k = 0; k < 26; k++) { const x = cx - 14 + k, y = oy + 4 + Math.floor(k / 9); i.set(x, y, T.pa[5] as RGBA); i.set(x, y + 1, T.pa[4] as RGBA); i.set(x, y + 2, T.pa[2] as RGBA); }
    i.set(cx + 6, oy + 6, T.red[1] as RGBA); i.set(cx + 7, oy + 6, T.red[2] as RGBA);
  }

  // wire-rim glasses: thin rims, faint lens, one glint per lens
  const rim = T.rim, hi = T.rimHi;
  for (const ex of [exL, exR + 1]) {
    for (let y = ey - 4; y <= ey + 3; y++) for (let x = ex - 5; x <= ex + 4; x++) {
      const d = near(x + 0.5, y + 0.5, ex, ey, 5.2, 4.1);
      if (d <= 1 && d > 0.62) i.set(x, y, rim);
      else if (d <= 0.62) i.tint(x, y, [212, 217, 220, 18]);
    }
    i.set(ex - 4, ey - 3, hi); i.set(ex - 3, ey - 4, hi); i.set(ex - 3, ey - 2, T.lens);
  }
  i.hline(exL + 5, ey - 2, exR - exL - 9, rim);
  i.hline(cx - 20, ey - 1, exL - 5 - (cx - 20), rim); i.hline(exR + 6, ey - 1, cx + 20 - (exR + 6), rim);
}

function cap(i: Img, dx: number, dy: number): void {
  const c = T.cap, cx = 66 + dx, y0 = 24 + dy;
  // garrison cap: low crown with a slanted top (worn tilted right), folded band resting on the forehead
  i.shade(cx - 21, y0 - 4, 43, 26, (x, y) => {
    const r = y - y0;
    if (r < 10) { // crown
      const ax = Math.abs(x + 0.5 - cx), top = 3 - (x - cx) * 0.08 + (ax > 12 ? (ax - 12) * 0.5 : 0), hw = 16 + 3 * Math.max(0, r) / 10;
      if (r < top || Math.abs(x + 0.5 - cx) > hw) return null;
      const nx = (x + 0.5 - cx) / (hw + 0.5);
      let v = 0.14 + lambert(nx * 0.85, -0.55) * 0.8;
      if (r < top + 1) v += 0.16; // top seam catches the lamp
      return clamp01(v);
    }
    const hw = 20.5 - (r > 18 ? (r - 18) * 0.6 : 0);
    if (r > 21 || Math.abs(x + 0.5 - cx) > hw) return null;
    const nx = (x + 0.5 - cx) / (hw + 0.5);
    let v = 0.1 + lambert(nx * 0.85, 0.05) * 0.72;
    if (r === 10) v += 0.2; // fold edge
    if (r === 11) v -= 0.08;
    if (r === 21) v -= 0.18;
    return clamp01(v);
  }, c);
  i.line(cx + 1, y0 + 4, cx, y0 + 9, c[0] as RGBA); // front crease
  // small round cockade (generic, no insignia)
  const br = T.brass;
  i.stamp(cx - 1, y0 + 13, ["aba", "bcb", "aba"], { a: br[2] as RGBA, b: br[3] as RGBA, c: T.red[1] as RGBA });
}

function headphones(i: Img, dx: number, dy: number, pose: Pose): void {
  const b = T.bake, cx = 66 + dx, y0 = 22 + dy;
  // band over the cap
  for (let a = 0; a <= 180; a += 1) {
    const t = (a * Math.PI) / 180, x = Math.round(cx - Math.cos(t) * 23), y = Math.round(y0 + 36 - Math.sin(t) * 34);
    if (y > y0 + 36) continue;
    i.set(x, y, b[1] as RGBA); i.set(x, y + 1, (a < 80 ? b[4] : b[3]) as RGBA); i.set(x, y + 2, b[1] as RGBA);
  }
  // ear cups: bakelite shells with a leather pad toward the head
  const cup = (x: number, lit: boolean): void => {
    i.rrect(x, y0 + 35, 9, 22, 3, b[0] as RGBA);
    i.rrect(x + 1, y0 + 36, 7, 20, 2, (lit ? b[3] : b[2]) as RGBA);
    i.vline(x + (lit ? 2 : 6), y0 + 38, 15, (lit ? b[5] : b[3]) as RGBA);
    i.rect(x + 3, y0 + 44, 3, 4, b[1] as RGBA); i.set(x + 3, y0 + 44, b[4] as RGBA);
  };
  cup(cx - 27, true); cup(cx + 19, false);
  const p = T.pad;
  i.vline(cx - 18, y0 + 37, 18, p[2] as RGBA); i.vline(cx - 19, y0 + 37, 18, p[1] as RGBA);
  i.vline(cx + 18, y0 + 37, 18, p[0] as RGBA);
  // cable from the right cup down past the collar
  i.line(cx + 23, y0 + 57, cx + 27, y0 + 74, b[1] as RGBA); i.line(cx + 27, y0 + 74, cx + 30, y0 + 104, b[1] as RGBA);
  if (pose === "listening") { // left hand pressed to the ear cup, forearm coming up from the desk
    const s = T.skin, u = T.uni;
    for (let y = y0 + 58; y < 126; y++) { const x0 = Math.round(cx - 34 + (y - y0 - 58) * -0.3); i.hline(x0, y, 12, (y > y0 + 70 ? u[2] : u[3]) as RGBA); i.set(x0, y, u[1] as RGBA); }
    i.rrect(cx - 31, y0 + 40, 12, 20, 3, s[3] as RGBA);
    for (let k = 0; k < 4; k++) { i.vline(cx - 30 + k * 3, y0 + 41, 13, s[4] as RGBA); i.vline(cx - 28 + k * 3, y0 + 42, 12, s[2] as RGBA); }
    i.hline(cx - 31, y0 + 59, 12, s[1] as RGBA);
  }
}

function desk(i: Img): void {
  const m = T.m;
  i.rect(0, 126, PW, 26, m[2] as RGBA);
  i.hline(0, 126, PW, m[5] as RGBA); i.hline(0, 127, PW, m[4] as RGBA); i.hline(0, 128, PW, m[3] as RGBA);
  i.hline(0, 149, PW, m[1] as RGBA); i.hline(0, 150, PW, m[0] as RGBA);
  for (const x of [2, 127]) i.stamp(x, 139, [".a.", "abc", ".c."], { a: m[5] as RGBA, b: m[3] as RGBA, c: m[0] as RGBA });
}

/** A crew member at the radio-room door (desk UI): the operator's build without headphones and desk lip (recoloured per person). */
export function crewMember(): Img {
  const i = new Img(PW, PH);
  background(i, false);
  torso(i, 0);
  neck(i, 0, 0);
  face(i, { dx: 0, dy: 0, pose: "idle" });
  cap(i, 0, 0);
  return i;
}

export function operator(pose: Pose): Img {
  const i = new Img(PW, PH);
  const dx = pose === "hurt" ? -2 : pose === "listening" ? 1 : 0;
  const dy = pose === "writing" ? 3 : pose === "hurt" ? 2 : 0;
  background(i, pose === "alert");
  torso(i, dx);
  neck(i, dx, dy);
  face(i, { dx, dy, pose });
  cap(i, dx, dy);
  headphones(i, dx, dy, pose);
  desk(i);
  i.frame(0, 0, PW, PH, T.k[0] as RGBA);
  i.hline(1, 1, PW - 2, T.k[4] as RGBA); i.vline(1, 1, 124, T.k[4] as RGBA);
  return i;
}
