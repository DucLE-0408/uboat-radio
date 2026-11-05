// Desk UI art slice (TEMPORARY, original code-drawn work): wooden desk top, bulkhead columns, door hatch, boat controls,
// Teletyper, Echo stamper, collapsed cipher machine, two-sided Input sheet and the Mission clip sheet.
// Layout follows docs/specs/desk-ui/design.md section 2 (logical 640x360). Same palette as the P5 art pass (tone.ts).
import { artRng, Img, type RGBA } from "./pix.ts";
import { crewMember, PH, PW } from "./portrait.ts";
import { T } from "./tone.ts";
import type { Sprite } from "./sprites.ts";

const c = (r: readonly RGBA[], n: number): RGBA => r[Math.max(0, Math.min(r.length - 1, n))] as RGBA;
const screw = (i: Img, x: number, y: number, r: readonly RGBA[]): void => i.stamp(x, y, [".a.", "abc", ".c."], { a: c(r, r.length - 1), b: c(r, 3), c: c(r, 0) });

/** Geometry shared with src/desk (logical px). */
export const DESK = {
  top: { x: 144, y: 104, w: 280, h: 248 },
  door: { x: 8, y: 104, w: 132, h: 132 },
  controls: { x: 8, y: 240, w: 132, h: 112 },
  tty: { x: 428, y: 104, w: 204, h: 132 },
  stamper: { x: 428, y: 240, w: 204, h: 60 },
  machine: { x: 428, y: 304, w: 204, h: 48 },
  paper: { w: 112, h: 148 },
  mission: { w: 128, h: 104 },
  slip: { w: 80, h: 44 },
  encode: { w: 112, h: 104 },
  drawer: { x: 146, y: 196, w: 104, h: 120 },
  bin: { x: 148, y: 318, w: 28, h: 32 },
} as const;

// ---------------------------------------------------------------- backdrop
function deskBg(): Sprite {
  const W = 640, H = 360, i = new Img(W, H);
  const rng = artRng(0xde5c);
  // bulkhead: flat slate plates, seams and rivet rows (no per-pixel noise)
  i.rect(0, 0, W, H, c(T.k, 2));
  for (let x = 0; x < W; x += 80) { i.vline(x, 0, H, c(T.k, 1)); i.vline(x + 1, 0, H, c(T.k, 3)); }
  for (const y of [102, 238, 302]) { i.hline(0, y, W, c(T.k, 1)); i.hline(0, y + 1, W, c(T.k, 3)); }
  for (let x = 6; x < W; x += 16) { i.rivet(x, 4, c(T.k, 5), c(T.k, 0)); i.rivet(x, H - 5, c(T.k, 5), c(T.k, 0)); }
  // recessed bays for every station (sprites sit inside)
  const bay = (b: { x: number; y: number; w: number; h: number }): void => {
    i.rect(b.x - 2, b.y - 2, b.w + 4, b.h + 4, c(T.k, 0));
    i.hline(b.x - 2, b.y + b.h + 1, b.w + 4, c(T.k, 4)); i.vline(b.x + b.w + 1, b.y - 2, b.h + 4, c(T.k, 4));
  };
  for (const b of [DESK.door, DESK.controls, DESK.tty, DESK.stamper, DESK.machine]) bay(b);
  // desk top: horizontal planks of warm wood lit by an overhead lamp (banded light, sparse grain)
  const d = DESK.top;
  const lampX = d.x + d.w * 0.52, lampY = d.y + 40;
  for (let y = d.y; y < d.y + d.h; y++) {
    const plank = Math.floor((y - d.y) / 18), py = (y - d.y) % 18;
    for (let x = d.x; x < d.x + d.w; x++) {
      const dx = (x - lampX) / 170, dy = (y - lampY) / 150;
      const lit = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
      let k = 1 + Math.floor(lit * 3.2) + (plank % 2);          // 1..5 on the wl ramp
      if (py === 0) k += 1; else if (py === 17) k = 0;          // plank edge highlight / joint
      i.set(x, y, c(T.wl, k));
    }
    if ((y - d.y) % 18 === 17) for (let x = d.x + 7 + ((y * 37) % 50); x < d.x + d.w; x += 96) i.set(x, y - 1, c(T.wl, 0)); // butt joints
  }
  for (let n = 0; n < 34; n++) { // grain streaks: short, one shade darker, following the plank
    const y = d.y + 2 + Math.floor(rng() * (d.h - 4));
    if ((y - d.y) % 18 < 2 || (y - d.y) % 18 > 15) continue;
    const x0 = d.x + Math.floor(rng() * (d.w - 40)), len = 14 + Math.floor(rng() * 40);
    for (let k = 0; k < len; k++) { const o = i.get(x0 + k, y); const idx = T.wl.findIndex((w) => w[0] === o[0] && w[1] === o[1] && w[2] === o[2]); if (idx > 0) i.set(x0 + k, y + (k % 23 === 22 ? 1 : 0), c(T.wl, idx - 1)); }
  }
  // drawer on the left edge of the desk (papers, stamps, manual)
  i.rect(d.x, d.y + 92, 6, 66, c(T.wl, 0)); i.vline(d.x + 6, d.y + 92, 66, c(T.wl, 3));
  i.rect(d.x + 1, d.y + 118, 3, 14, c(T.brass, 2)); i.vline(d.x + 1, d.y + 118, 14, c(T.brass, 4));
  // front lip of the desk
  i.rect(d.x, d.y + d.h - 4, d.w, 4, c(T.wl, 1)); i.hline(d.x, d.y + d.h - 4, d.w, c(T.wl, 4));
  // shadow the column bays cast on the desk edges
  for (let y = d.y; y < d.y + d.h; y++) { i.tint(d.x + d.w - 1, y, [0, 0, 0, 120]); i.tint(d.x + d.w - 2, y, [0, 0, 0, 60]); }
  return { id: "desk-bg", img: i, note: "desk backdrop: bulkhead, station bays, wooden desk top with lamp pool, drawer" };
}

// ---------------------------------------------------------------- door (who is at the hatch)
function door(): Sprite {
  const { w: W, h: H } = DESK.door, i = new Img(W, H);
  i.rect(0, 0, W, H, c(T.wc, 1));
  // corridor beyond: cool light, pipes
  i.shade(0, 0, W, H, (x, y) => 0.15 + 0.5 * (1 - Math.abs(x - W / 2) / (W / 2)) * (1 - y / H / 2), T.wc);
  for (const y of [18, 26]) { i.hline(0, y, W, c(T.k, 1)); i.hline(0, y + 1, W, c(T.wc, 4)); }
  i.rect(0, H - 22, W, 22, c(T.k, 2)); i.hline(0, H - 22, W, c(T.k, 5));
  for (let x = 4; x < W; x += 10) i.vline(x, H - 20, 18, c(T.k, 1)); // deck grating
  // watertight hatch frame: thick rounded ring
  const ox = 14, oy = 8, ow = W - 28, oh = H - 18;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inX = x >= ox && x < ox + ow, inY = y >= oy && y < oy + oh;
    const rx = Math.min(x - ox, ox + ow - 1 - x), ry = Math.min(y - oy, oy + oh - 1 - y);
    const corner = rx < 14 && ry < 14 && (14 - rx) ** 2 + (14 - ry) ** 2 > 196;
    if (!(inX && inY) || corner) i.set(x, y, c(T.k, 3));
  }
  i.frame(ox - 1, oy - 1, ow + 2, oh + 2, c(T.k, 5));
  i.frame(ox - 6, oy - 6, ow + 12, oh + 12, c(T.k, 1));
  for (const [x, y] of [[6, 6], [W - 9, 6], [6, H - 9], [W - 9, H - 9], [6, H / 2], [W - 9, H / 2]] as const) screw(i, x, y, T.k);
  // swung-open door leaf on the right, with its wheel
  i.rect(W - 14, oy + 4, 8, oh - 8, c(T.k, 4)); i.vline(W - 14, oy + 4, oh - 8, c(T.k, 6)); i.vline(W - 7, oy + 4, oh - 8, c(T.k, 1));
  // nameplate
  i.rect(W / 2 - 22, 1, 44, 6, c(T.brass, 2)); i.hline(W / 2 - 22, 1, 44, c(T.brass, 4)); i.hline(W / 2 - 22, 6, 44, c(T.brass, 0));
  return { id: "desk-door", img: i, note: "desk: watertight hatch onto the corridor (crew arrive here)" };
}

// ---------------------------------------------------------------- boat controls panel
function controls(): Sprite {
  const { w: W, h: H } = DESK.controls, i = new Img(W, H);
  i.bevel(0, 0, W, H, c(T.m, 5), c(T.m, 3), c(T.m, 0));
  i.rect(2, 2, W - 4, 10, c(T.hb, 1)); i.hline(2, 12, W - 4, c(T.hb, 0)); // title strip
  for (const [x, y] of [[3, H - 5], [W - 6, H - 5]] as const) screw(i, x, y, T.m);
  // dive lever slot (left): vertical track with a handle at SURFACE
  i.rect(10, 20, 10, 62, c(T.k, 0)); i.vline(14, 22, 58, c(T.k, 3));
  for (let y = 24; y < 80; y += 14) i.hline(21, y, 4, c(T.m, 5));
  // speed telegraph (centre): brass dial with sectors and a pointer
  const cx = 60, cy = 46;
  i.ellipse(cx, cy, 24, 24, c(T.brass, 0)); i.ellipse(cx, cy, 22, 22, c(T.brass, 3)); i.ellipse(cx, cy, 19, 19, c(T.pa, 5));
  for (let a = 0; a < 5; a++) { const t = Math.PI * (0.85 + a * 0.325); i.line(Math.round(cx + Math.cos(t) * 12), Math.round(cy + Math.sin(t) * 12), Math.round(cx + Math.cos(t) * 18), Math.round(cy + Math.sin(t) * 18), T.ink); }
  i.line(cx, cy, cx - 9, cy - 12, c(T.red, 2)); i.ellipse(cx, cy, 2, 2, c(T.brass, 1));
  // silence toggle + report button (right column)
  i.rect(96, 20, 26, 22, c(T.k, 1)); i.frame(96, 20, 26, 22, c(T.k, 0));
  i.rect(104, 24, 10, 8, c(T.k, 5)); i.hline(104, 24, 10, c(T.k, 7)); // toggle body
  i.rect(96, 50, 26, 22, c(T.k, 1)); i.frame(96, 50, 26, 22, c(T.k, 0));
  i.ellipse(109, 61, 7, 7, c(T.am, 1)); i.ellipse(109, 60, 5, 5, c(T.am, 3)); // report push button
  // TX clock strip (bottom): green-black window
  i.rect(10, 88, W - 20, 14, c(T.e, 0)); i.frame(10, 88, W - 20, 14, c(T.e, 4));
  for (let x = 14; x < W - 14; x += 6) i.vline(x, 98, 2, c(T.g, 1));
  return { id: "desk-controls", img: i, note: "desk: boat controls panel (dive lever, speed telegraph, silence, report, TX clock)" };
}

// ---------------------------------------------------------------- Teletyper
function tty(): Sprite {
  const { w: W, h: H } = DESK.tty, i = new Img(W, H);
  // body: green-black enamel box with a rounded top and a paper slot
  i.rrect(4, 18, W - 8, H - 22, 4, c(T.e, 3));
  i.shade(4, 18, W - 8, H - 22, (x, y) => (i.get(x, y)[3] === 0 ? null : 0.25 + 0.5 * (1 - (y - 18) / (H - 22)) + (x < 10 ? 0.2 : 0)), T.e.slice(1, 6));
  i.hline(8, 18, W - 16, c(T.e, 7));
  // paper slot and a curl of paper coming out
  i.rect(26, 26, W - 52, 6, c(T.e, 0)); i.hline(26, 32, W - 52, c(T.e, 6));
  i.rect(34, 2, W - 68, 26, c(T.pa, 5)); i.vline(34, 2, 26, c(T.pa, 3)); i.vline(W - 35, 2, 26, c(T.pa, 2));
  for (let y = 6; y < 26; y += 5) i.hline(40, y, W - 80, c(T.pa, 3));
  // keyboard bank (decorative rows of round keys)
  for (let r = 0; r < 3; r++) for (let k = 0; k < 11; k++) {
    const x = 22 + k * 15 + (r % 2) * 6, y = 50 + r * 14;
    i.ellipse(x, y + 1, 5, 4, c(T.e, 0)); i.ellipse(x, y, 5, 4, c(T.k, 6)); i.ellipse(x, y - 1, 3, 2, c(T.k, 7));
  }
  // nameplate + lamp bezel + repeat key plate
  i.rect(W / 2 - 30, 94, 60, 10, c(T.brass, 2)); i.hline(W / 2 - 30, 94, 60, c(T.brass, 4)); i.hline(W / 2 - 30, 103, 60, c(T.brass, 0));
  i.ellipse(20, 112, 8, 8, c(T.k, 0)); i.ellipse(20, 112, 6, 6, c(T.brass, 2));
  i.rect(W - 58, 106, 48, 14, c(T.k, 0));
  return { id: "desk-tty", img: i, note: "desk: Teletyper (paper slot, keys, nameplate, lamp bezel, repeat plate)" };
}

function ttyLamp(): Sprite {
  const S = 10, i = new Img(S * 2, S);
  for (let f = 0; f < 2; f++) {
    const r = f === 0 ? [c(T.k, 1), c(T.k, 3), c(T.k, 4)] : [c(T.red, 1), c(T.red, 3), [255, 210, 200, 255] as RGBA];
    i.ellipse(f * S + 5, 5, 4, 4, r[0] as RGBA); i.ellipse(f * S + 5, 5, 3, 3, r[1] as RGBA); i.set(f * S + 4, 3, r[2] as RGBA); i.set(f * S + 3, 4, r[2] as RGBA);
  }
  return { id: "desk-tty-lamp", img: i, frames: { w: S, h: S, count: 2 }, note: "desk: Teletyper signal lamp (off, on)" };
}

// ---------------------------------------------------------------- Echo stamper
function stamper(): Sprite {
  const { w: W, h: H } = DESK.stamper, i = new Img(W, H);
  i.bevel(0, 0, W, H, c(T.k, 6), c(T.k, 4), c(T.k, 0));
  i.rect(2, 2, W - 4, 9, c(T.k, 3));
  // stamp arm: a heavy block on a pivot, rubber pad below
  i.rect(70, 14, 64, 26, c(T.k, 5)); i.hline(70, 14, 64, c(T.k, 7)); i.hline(70, 39, 64, c(T.k, 1));
  i.rect(80, 40, 44, 6, c(T.red, 1)); i.hline(80, 45, 44, c(T.red, 0));
  i.rect(98, 6, 8, 10, c(T.brass, 2)); i.vline(98, 6, 10, c(T.brass, 4)); // pivot post
  i.ellipse(102, 27, 7, 7, c(T.brass, 1)); i.ellipse(102, 27, 5, 5, c(T.brass, 3)); i.ellipse(101, 26, 2, 2, c(T.brass, 4)); // knob
  // switch bezel (left) and ready-lamp bezel (right)
  i.rect(12, 14, 22, 34, c(T.k, 0)); i.frame(11, 13, 24, 36, c(T.k, 5));
  i.ellipse(172, 28, 8, 8, c(T.k, 0)); i.ellipse(172, 28, 6, 6, c(T.k, 2));
  for (const [x, y] of [[3, H - 5], [W - 6, H - 5], [3, 3], [W - 6, 3]] as const) screw(i, x, y, T.k);
  return { id: "desk-stamper", img: i, note: "desk: Echo stamper body (arm, pad, switch bezel, ready-lamp bezel)" };
}

function stamperParts(): Sprite[] {
  const sw = new Img(20 * 2, 30);
  for (let f = 0; f < 2; f++) { // 0 = TRUE (up, green), 1 = FALSE (down, red)
    const ox = f * 20;
    sw.rect(ox + 7, 3, 6, 24, c(T.k, 1));
    const ty = f === 0 ? 3 : 17, col = f === 0 ? T.g : T.red;
    sw.rect(ox + 3, ty, 14, 10, c(col, 2)); sw.hline(ox + 3, ty, 14, c(col, 3)); sw.hline(ox + 3, ty + 9, 14, c(col, 0));
  }
  const lamp = new Img(12 * 2, 12);
  for (let f = 0; f < 2; f++) { const r = f === 0 ? T.k : T.am; lamp.ellipse(f * 12 + 6, 6, 5, 5, c(r, 1)); lamp.ellipse(f * 12 + 6, 6, 4, 4, c(r, 3)); lamp.set(f * 12 + 4, 4, c(r, r.length - 1)); }
  return [
    { id: "desk-st-switch", img: sw, frames: { w: 20, h: 30, count: 2 }, note: "desk: Echo stamper TRUE/FALSE switch" },
    { id: "desk-st-lamp", img: lamp, frames: { w: 12, h: 12, count: 2 }, note: "desk: Echo stamper READY lamp (off, on)" },
  ];
}

// ---------------------------------------------------------------- collapsed cipher machine
function machineTab(): Sprite {
  const { w: W, h: H } = DESK.machine, i = new Img(W, H);
  i.rrect(0, 4, W, H - 4, 3, c(T.e, 2));
  i.hline(3, 4, W - 6, c(T.e, 6)); i.hline(0, H - 1, W, c(T.e, 0));
  // rotor cover with four windows
  i.rect(16, 10, 96, 24, c(T.e, 1)); i.frame(16, 10, 96, 24, c(T.e, 5));
  for (let k = 0; k < 4; k++) { const x = 24 + k * 22; i.rect(x, 15, 14, 14, c(T.pa, 5)); i.frame(x - 1, 14, 16, 16, c(T.e, 0)); i.hline(x, 15, 14, c(T.pa, 3)); }
  // pull handle (right)
  i.rect(140, 14, 48, 8, c(T.brass, 2)); i.hline(140, 14, 48, c(T.brass, 4)); i.hline(140, 21, 48, c(T.brass, 0));
  i.rect(140, 22, 6, 10, c(T.brass, 1)); i.rect(182, 22, 6, 10, c(T.brass, 1));
  for (const [x, y] of [[4, 8], [W - 7, 8], [4, H - 6], [W - 7, H - 6]] as const) screw(i, x, y, T.e);
  return { id: "desk-machine-tab", img: i, note: "desk: cipher machine pushed in (rotor windows and pull handle)" };
}

// ---------------------------------------------------------------- papers
/** Plain sheet with a dog-ear, drawn at x offset `ox` (two-sided sprites put the back at ox = W). */
function sheet(i: Img, ox: number, W: number, H: number): void {
  i.rect(ox + 1, 1, W - 2, H - 2, c(T.pa, 5));
  i.vline(ox, 2, H - 4, c(T.pa, 2)); i.vline(ox + W - 1, 2, H - 4, c(T.pa, 1)); i.hline(ox + 2, 0, W - 4, c(T.pa, 3)); i.hline(ox + 2, H - 1, W - 4, c(T.pa, 1));
  for (let k = 0; k < 6; k++) { i.hline(ox + W - 7 + k, H - 7 + k, 6 - k, c(T.pa, 3)); }
  i.line(ox + W - 7, H - 2, ox + W - 2, H - 7, c(T.pa, 1));
}

function paperInput(): Sprite {
  const { w: W, h: H } = DESK.paper, i = new Img(W * 2, H);
  // front
  sheet(i, 0, W, H);
  i.rect(2, 3, W - 4, 13, c(T.hb, 1)); i.hline(2, 16, W - 4, c(T.hb, 0));
  for (let y = 22; y <= 46; y += 12) i.hline(48, y + 8, W - 56, c(T.pa, 2));      // FROM / TIME / INDICATOR fields
  i.frame(6, 60, W - 12, 80, c(T.pa, 2));                                           // group area (cells are live DOM so long traffic can scroll)
  // back
  const ox = W;
  sheet(i, ox, W, H);
  i.rect(ox + 2, 3, W - 4, 9, c(T.pa, 3));
  i.rect(ox + 8, 22, W - 16, 46, c(T.pa, 4)); i.frame(ox + 8, 22, W - 16, 46, c(T.pa, 1));        // ECHO stamp box
  for (let x = ox + 10; x < ox + W - 10; x += 4) { i.set(x, 24, c(T.pa, 2)); i.set(x, 65, c(T.pa, 2)); }
  i.frame(ox + 8, 78, 44, 30, c(T.pa, 2)); i.frame(ox + W - 52, 78, 44, 30, c(T.pa, 2));         // regular stamps
  i.hline(ox + 10, 128, W - 20, c(T.pa, 1));                                                         // signature line
  return { id: "paper-input", img: i, frames: { w: W, h: H, count: 2 }, note: "desk: Input sheet, front (header, fields, group grid) and back (Echo box, two stamp boxes, signature)" };
}

function paperOutput(): Sprite {
  const { w: W, h: H } = DESK.paper, i = new Img(W * 2, H);
  // front: machine-green header (the machine prints this sheet), two fields, group area, status line
  sheet(i, 0, W, H);
  i.rect(2, 3, W - 4, 13, c(T.e, 3)); i.hline(2, 16, W - 4, c(T.e, 1));
  for (const y of [22, 34]) i.hline(48, y + 8, W - 56, c(T.pa, 2));
  i.frame(6, 48, W - 12, 80, c(T.pa, 2));
  i.hline(8, 138, W - 22, c(T.pa, 3));
  // back: one large box for the red stamp (Stamping Rules: Output takes red on the back) and the signature line
  const ox = W;
  sheet(i, ox, W, H);
  i.rect(ox + 2, 3, W - 4, 9, c(T.pa, 3));
  i.frame(ox + 8, 24, W - 16, 62, c(T.red, 3)); i.frame(ox + 9, 25, W - 18, 60, c(T.pa, 3));
  i.hline(ox + 10, 128, W - 20, c(T.pa, 1));
  return { id: "paper-output", img: i, frames: { w: W, h: H, count: 2 }, note: "desk: Output sheet, front (header, fields, group area, status) and back (red stamp box, signature)" };
}

/** Verification message slip: a small strip carrying the deciphered Sender ID; the back has one stamp box and a check line. */
function paperSlip(): Sprite {
  const { w: W, h: H } = DESK.slip, i = new Img(W * 2, H);
  sheet(i, 0, W, H);
  i.rect(2, 3, W - 4, 9, c(T.hb, 1)); i.hline(2, 12, W - 4, c(T.hb, 0));          // header strip
  i.frame(6, 18, W - 12, 18, c(T.pa, 2)); i.hline(8, 34, W - 16, c(T.pa, 3));      // Sender ID well with a pen-line under it
  const ox = W;
  sheet(i, ox, W, H);
  i.rect(ox + 2, 3, W - 4, 7, c(T.pa, 3));
  i.frame(ox + 8, 14, 40, 26, c(T.pa, 2));                                         // regular stamp box
  i.hline(ox + 52, 36, 20, c(T.pa, 1));                                            // check line
  return { id: "paper-slip", img: i, frames: { w: W, h: H, count: 2 }, note: "desk: Verification message slip, front (deciphered Sender ID) and back (stamp box, check line)" };
}

/** Encode output sheet: what the machine enciphers for a reply (request, start positions, cipher groups, result). */
function paperEncode(): Sprite {
  const { w: W, h: H } = DESK.encode, i = new Img(W * 2, H);
  sheet(i, 0, W, H);
  i.rect(2, 3, W - 4, 13, c(T.e, 3)); i.hline(2, 16, W - 4, c(T.e, 1));           // machine-green header, like the decode Output
  for (const y of [22, 34]) i.hline(48, y + 8, W - 56, c(T.pa, 2));                // REQUEST / START fields
  i.frame(6, 48, W - 12, 40, c(T.pa, 2));                                          // cipher group area
  i.hline(8, 94, W - 22, c(T.pa, 3));                                              // result line
  const ox = W;
  sheet(i, ox, W, H);
  i.rect(ox + 2, 3, W - 4, 9, c(T.pa, 3));
  i.frame(ox + 8, 20, 44, 30, c(T.pa, 2)); i.frame(ox + W - 52, 20, 44, 30, c(T.pa, 2)); // two regular stamps
  i.hline(ox + 10, 90, W - 20, c(T.pa, 1));                                        // signature line
  return { id: "paper-encode", img: i, frames: { w: W, h: H, count: 2 }, note: "desk: Encode output sheet, front (request, start, cipher groups, result) and back (two stamp boxes, signature)" };
}

function mission(): Sprite {
  const { w: W, h: H } = DESK.mission, i = new Img(W, H);
  i.rect(1, 3, W - 2, H - 4, c(T.pa, 4)); i.vline(0, 4, H - 6, c(T.pa, 2)); i.vline(W - 1, 4, H - 6, c(T.pa, 1)); i.hline(1, H - 1, W - 2, c(T.pa, 1));
  for (let r = 0; r < 7; r++) { const y = 18 + r * 12; i.frame(6, y, 7, 7, T.ink2); i.hline(16, y + 7, W - 24, c(T.pa, 2)); }
  // bulldog clip at the top
  i.rect(W / 2 - 16, 0, 32, 8, c(T.k, 5)); i.hline(W / 2 - 16, 0, 32, c(T.k, 7)); i.hline(W / 2 - 16, 7, 32, c(T.k, 1));
  i.ellipse(W / 2, 2, 5, 2, c(T.k, 3));
  return { id: "desk-mission", img: i, note: "desk: Mission checklist sheet (7 steps) on a bulldog clip" };
}


// ---------------------------------------------------------------- Stage 3: drawer tray, tools, bin, ink marks
function drawerTray(): Sprite {
  const { w: W, h: H } = DESK.drawer, i = new Img(W, H);
  i.rect(0, 0, W, H, c(T.wl, 0)); i.frame(0, 0, W, H, c(T.wl, 3)); i.hline(1, 1, W - 2, c(T.wl, 4));
  i.rect(3, 3, W - 6, H - 6, c(T.wl, 1));
  // four compartments in a 2x2 grid, each with a felt floor
  const top = 96; // four compartments above, a shelf below for the Daily Orders folder and the Manual
  i.rect(3, 3, W - 6, top - 6, c(T.wl, 1));
  for (const [x, y] of [[4, 4], [W / 2 + 1, 4], [4, top / 2 + 1], [W / 2 + 1, top / 2 + 1]] as const) {
    i.rect(x, y, W / 2 - 5, top / 2 - 5, c(T.m, 1)); i.hline(x, y, W / 2 - 5, c(T.m, 0)); i.vline(x, y, top / 2 - 5, c(T.m, 0));
  }
  i.rect(W / 2 - 1, 3, 2, top - 6, c(T.wl, 3)); i.rect(3, top / 2 - 1, W - 6, 2, c(T.wl, 3));
  i.rect(3, top - 2, W - 6, 2, c(T.wl, 4));
  i.rect(4, top + 1, W - 8, H - top - 5, c(T.wl, 2)); i.hline(4, top + 1, W - 8, c(T.wl, 0));
  return { id: "desk-drawer", img: i, note: "desk: open drawer tray, four tool compartments and a shelf for Daily Orders and the Manual" };
}

function tools(): Sprite {
  const S = 24, i = new Img(S * 4, S);
  // 0 blue stamp, 1 red stamp: wooden handle, brass collar, rubber foot in the ink colour
  for (const [f, ink] of [[0, [ramp3("#1d2c5c"), ramp3("#33519a"), ramp3("#6f8fd6")]], [1, [ramp3("#5c1820"), ramp3("#a3303a"), ramp3("#e0707a")]]] as const) {
    const ox = f * S;
    i.ellipse(ox + 12, 6, 4, 4, c(T.wl, 4)); i.ellipse(ox + 11, 5, 2, 2, c(T.wl, 5));
    i.rect(ox + 10, 9, 4, 6, c(T.wl, 3)); i.vline(ox + 10, 9, 6, c(T.wl, 5));
    i.rect(ox + 6, 15, 12, 3, c(T.brass, 3)); i.hline(ox + 6, 15, 12, c(T.brass, 4));
    i.rect(ox + 5, 18, 14, 4, ink[1]); i.hline(ox + 5, 21, 14, ink[0]); i.hline(ox + 5, 18, 14, ink[2]);
  }
  // 2 pen: dark barrel on a diagonal, brass clip, nib
  for (let k = 0; k < 14; k++) { i.set(48 + 4 + k, 19 - k, c(T.k, 2)); i.set(48 + 5 + k, 19 - k, c(T.k, 4)); i.set(48 + 4 + k, 20 - k, c(T.k, 1)); }
  i.line(48 + 14, 9, 48 + 17, 6, c(T.brass, 4));
  i.set(48 + 3, 21, c(T.brass, 3)); i.set(48 + 2, 22, T.ink);
  // 3 paper clip: bent wire loops
  const wire = c(T.k, 7), dark = c(T.k, 5);
  i.frame(72 + 8, 3, 8, 18, wire); i.frame(72 + 10, 6, 4, 12, dark); i.vline(72 + 8, 3, 18, dark);
  return { id: "desk-tools", img: i, frames: { w: S, h: S, count: 4 }, note: "desk tools: blue stamp, red stamp, pen, paper clip" };
}
const ramp3 = (h: string): RGBA => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

function bin(): Sprite {
  const { w: W, h: H } = DESK.bin, i = new Img(W, H);
  i.shade(2, 4, W - 4, H - 4, (x, y) => (x < 2 + (y - 4) / 10 || x > W - 3 - (y - 4) / 10 ? null : 0.25 + 0.5 * (1 - Math.abs(x - W / 2) / (W / 2))), T.k.slice(2, 7));
  i.rect(0, 2, W, 4, c(T.k, 6)); i.hline(0, 2, W, c(T.k, 7)); i.hline(0, 5, W, c(T.k, 2));
  for (let x = 6; x < W - 5; x += 5) i.vline(x, 8, H - 12, c(T.k, 2));
  return { id: "desk-bin", img: i, note: "desk: waste-paper bin (refuses mission papers)" };
}

/** Ink marks drawn over sheets. Rough edges: a few dropped pixels along the border, fixed pattern (no noise). */
function marks(): Sprite[] {
  const rough = (i: Img, ox: number, w: number, h: number, ink: RGBA, seed: number): void => {
    const rng = artRng(seed);
    i.frame(ox + 1, 1, w - 2, h - 2, ink); i.frame(ox + 3, 3, w - 6, h - 6, ink);
    for (let k = 0; k < (w + h) / 3; k++) { const x = ox + 1 + Math.floor(rng() * (w - 2)); i.set(x, rng() < 0.5 ? 1 : h - 2, [0, 0, 0, 0]); }
  };
  const echo = new Img(88 * 2, 40);
  rough(echo, 0, 88, 40, ramp3("#2f7a4c"), 0xec01); rough(echo, 88, 88, 40, ramp3("#a3303a"), 0xec02);
  const reg = new Img(40 * 2, 26);
  for (const [f, ink] of [[0, ramp3("#33519a")], [1, ramp3("#a3303a")]] as const) {
    const ox = f * 40;
    reg.rrect(ox + 1, 1, 38, 24, 4, ink); reg.rrect(ox + 3, 3, 34, 20, 3, [0, 0, 0, 0]);
    reg.ellipse(ox + 20, 13, 6, 6, ink); reg.ellipse(ox + 20, 13, 4, 4, [0, 0, 0, 0]); reg.hline(ox + 13, 13, 15, ink); reg.vline(ox + 20, 6, 15, ink);
  }
  const sign = new Img(56, 12);
  const ink = ramp3("#1e2340");
  let y = 7;
  for (let x = 2; x < 54; x++) { y = Math.max(1, Math.min(10, Math.round(6 + 4 * Math.sin(x / 3.1) * Math.cos(x / 7.3)))); sign.set(x, y, ink); if (x % 9 === 4) sign.vline(x, Math.max(1, y - 3), 4, ink); }
  const clip = new Img(10, 22);
  clip.frame(1, 0, 7, 21, c(T.k, 7)); clip.frame(3, 3, 3, 14, c(T.k, 5)); clip.vline(1, 0, 21, c(T.k, 5));
  return [
    { id: "mark-echo", img: echo, frames: { w: 88, h: 40, count: 2 }, note: "ink mark: Echo stamp border (TRUE green, FALSE red); the words are live text" },
    { id: "mark-regular", img: reg, frames: { w: 40, h: 26, count: 2 }, note: "ink mark: regular stamp (blue, red), neutral emblem" },
    { id: "mark-sign", img: sign, note: "ink mark: signature" },
    { id: "mark-clip", img: clip, note: "paper clip seen over the top edge of a bundle" },
  ];
}

// ---------------------------------------------------------------- Stage 4: crew at the door, reference documents
/** Exact-colour swap: each colour of `from[k]` becomes `to[k]` (ramps of equal length). */
function recolor(i: Img, pairs: readonly (readonly [readonly RGBA[], readonly RGBA[]])[]): void {
  const map = new Map<string, RGBA>();
  for (const [from, to] of pairs) from.forEach((f, k) => map.set(f.join(","), c(to, k)));
  for (let y = 0; y < i.h; y++) for (let x = 0; x < i.w; x++) { const o = i.get(x, y); if (o[3] === 0) continue; const n = map.get(o.join(",")); if (n) i.set(x, y, n); }
}
const hexRamp = (...h: string[]): RGBA[] => h.map((v) => [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 255] as RGBA);
/** Crew order in the sheet; must match CREW in src/desk/dialogue.ts. */
export const CREW_LOOKS = ["captain", "officer", "engineer", "sonar", "messenger"] as const;
function crew(): Sprite {
  const sheet = new Img(PW * CREW_LOOKS.length, PH);
  const skinDark = T.skin.map((_, k) => c(T.skin, k - 1));
  const looks: Record<(typeof CREW_LOOKS)[number], (readonly [readonly RGBA[], readonly RGBA[]])[]> = {
    captain: [[T.cap, hexRamp("#3a3a3e", "#8f8f94", "#b9b9bd", "#d9d9dc", "#ececee")], [T.uni, hexRamp("#12141c", "#191c28", "#222636", "#2d3246", "#3a4058", "#4a516c")], [T.hair, hexRamp("#3a3836", "#5c5955", "#7e7a75")]],
    officer: [[T.uni, hexRamp("#141722", "#1c2030", "#262b3e", "#313750", "#3e4562", "#4f5778")], [T.hair, hexRamp("#24160e", "#3a2616", "#54381f")]],
    engineer: [[T.uni, hexRamp("#1e140e", "#2c1d14", "#3c281b", "#4e3523", "#62442d", "#79573a")], [T.cap, hexRamp("#0e0e10", "#161618", "#202024", "#2c2c32", "#3a3a42")], [T.skin, skinDark]],
    sonar: [[T.hair, hexRamp("#5e4a26", "#8a6e3a", "#b39352")]],
    messenger: [[T.uni, hexRamp("#1c1c1e", "#28282b", "#353539", "#44444a", "#56565d", "#6b6b73")], [T.hair, hexRamp("#3e1a10", "#5e2a18", "#7e3c22")]],
  };
  CREW_LOOKS.forEach((id, k) => { const one = crewMember(); recolor(one, looks[id]); sheet.blit(one, k * PW, 0); });
  return { id: "desk-crew", img: sheet, frames: { w: PW, h: PH, count: CREW_LOOKS.length }, note: `crew at the door (original faces, neutral uniforms): ${CREW_LOOKS.join(", ")}` };
}

function paperDoc(): Sprite {
  const W = 128, H = 150, i = new Img(W * 2, H);
  // 0 Daily Orders: typed sheet with a heavy header bar and a "classified" border line
  sheet(i, 0, W, H);
  i.rect(2, 3, W - 4, 14, c(T.k, 4)); i.hline(2, 17, W - 4, c(T.k, 2));
  i.frame(4, 20, W - 8, H - 26, c(T.pa, 3));
  // 1 Manual: spiral-bound notebook page with a ruled margin
  const ox = W;
  sheet(i, ox, W, H);
  i.rect(ox + 2, 3, W - 4, 14, c(T.e, 3)); i.hline(ox + 2, 17, W - 4, c(T.e, 1));
  i.vline(ox + 14, 20, H - 26, c(T.red, 3));
  for (let y = 24; y < H - 8; y += 8) i.hline(ox + 16, y, W - 22, c(T.pa, 4));
  for (let y = 8; y < H - 6; y += 10) { i.ellipse(ox + 5, y, 2, 2, c(T.k, 6)); i.set(ox + 5, y, c(T.k, 2)); }
  return { id: "paper-doc", img: i, frames: { w: W, h: H, count: 2 }, note: "desk: Daily Orders sheet, Manual page (spiral bound)" };
}

export function deskSprites(): Sprite[] {
  return [deskBg(), door(), controls(), tty(), ttyLamp(), stamper(), ...stamperParts(), machineTab(), paperInput(), paperOutput(), paperSlip(), paperEncode(), mission(), drawerTray(), tools(), bin(), ...marks(), crew(), paperDoc()];
}
