// Main-menu art (TEMPORARY placeholders, original work): night sea under a low moon with a surfaced boat, slate panel, button plates, icons, sealed letter.
// Composition follows the approved reference screenshot (panel left, scene right, letter top right); no pixels are taken from it. Flat bands, no uniform dither.
import { artRng, CLEAR, Img, type RGBA } from "./pix.ts";
import { T } from "./tone.ts";
import type { Sprite } from "./sprites.ts";

export const MENU_W = 640, MENU_H = 360;
export const PLATE_W = 112, PLATE_H = 34, PANEL_W = 128, PANEL_H = 180;
export const ICON = 24;

const c = (r: readonly RGBA[], n: number): RGBA => r[n] as RGBA;
const k = T.k;

/** Night sea under a low moon: flat sky bands, thin clouds, banded sea with a moonlight path and the moonlit boat. */
function menuBg(): Sprite {
  const i = new Img(MENU_W, MENU_H), rng = artRng(0x5eed1), horizon = 214;
  for (let y = 0; y < horizon; y++) { const t = y / horizon, a = Math.floor(t * 12) / 12; i.hline(0, y, MENU_W, [Math.round(11 + 30 * a), Math.round(10 + 26 * a), Math.round(20 + 44 * a), 255]); } // sky: 12 flat bands, dark to a cold horizon glow
  for (let n = 0; n < 60; n++) i.set(Math.floor(rng() * MENU_W), Math.floor(rng() * 120), c(T.hull, 5)); // stars
  const mx = 470, my = 96;
  for (let y = 0; y < horizon; y++) for (let x = mx - 60; x < mx + 60; x++) {
    const d = Math.hypot(x - mx, y - my);
    if (d < 11) i.set(x, y, [196, 202, 218, 255]); else if (d < 20) i.tint(x, y, [130, 140, 190, 34]); else if (d < 38) i.tint(x, y, [110, 120, 170, 16]);
  }
  for (const [x, y, w] of [[40, 70, 160], [250, 118, 190], [420, 150, 150], [90, 160, 120], [520, 60, 90]] as const) { i.hline(x, y, w, c(T.sky, 3)); i.hline(x + 14, y + 1, w - 30, c(T.sky, 2)); }
  // sea: flat bands darker toward the viewer, plus the moon path
  for (let y = horizon; y < MENU_H; y++) { const d = y - horizon; i.hline(0, y, MENU_W, c(T.sea, d < 6 ? 4 : d < 24 ? 3 : d < 60 ? 2 : d < 110 ? 1 : 0)); }
  for (let y = horizon + 2, n = 0; y < MENU_H; y += 3, n++) { // moon path: short bright dashes that widen and thin out toward the viewer
    const d = y - horizon, reach = 8 + d * 0.3, len = Math.max(3, Math.round(reach * (1.4 - d / 200)));
    const x0 = mx - Math.floor(len / 2) + ((n * 7) % 9) - 4;
    i.hline(x0, y, len, [150, 170, 215, d < 60 ? 150 : 90]);
  }
  for (let n = 0; n < 70; n++) { const x = Math.floor(rng() * MENU_W), y = horizon + 3 + Math.floor(rng() * (MENU_H - horizon - 6)); i.hline(x, y, 3 + Math.floor(rng() * 8), c(T.sea, 5)); }
  i.hline(0, horizon, MENU_W, [70, 86, 130, 255]);
  // surfaced boat, moonlit on the top edges
  const bx = 250, by = horizon - 2, h = T.hull.map((q, n, a) => a[Math.min(a.length - 1, n + 1)] as RGBA); // one step brighter than the banner hull so it reads on the dark sea
  i.ellipse(bx + 100, by + 4, 118, 6, c(h, 2)); i.rect(bx - 10, by - 1, 220, 5, c(h, 2)); i.hline(bx - 10, by - 1, 220, c(h, 4));
  i.ellipse(bx + 214, by + 1, 14, 4, c(h, 2));
  i.rect(bx + 78, by - 22, 30, 21, c(h, 2)); i.hline(bx + 78, by - 22, 30, c(h, 4)); i.vline(bx + 78, by - 22, 21, c(h, 3));
  i.rect(bx + 82, by - 29, 16, 8, c(h, 2)); i.hline(bx + 82, by - 29, 16, c(h, 4));
  i.vline(bx + 90, by - 46, 17, c(h, 3)); i.hline(bx + 90, by - 46, 6, c(h, 3)); i.vline(bx + 102, by - 36, 7, c(h, 3));
  for (const n of [0, 1, 2]) i.rect(bx + 86 + n * 4, by - 15, 2, 2, c(T.lamp, 2));
  i.rect(bx + 132, by - 8, 14, 8, c(h, 2)); i.rect(bx + 146, by - 6, 12, 1, c(h, 3));
  i.line(bx - 6, by - 9, bx + 90, by - 46, c(h, 2)); i.line(bx + 90, by - 46, bx + 200, by - 7, c(h, 2));
  for (let x = bx - 20; x < bx + 220; x += 5) i.hline(x, by + 6, 3, [90, 110, 160, 255]);
  for (const [gx, gy] of [[118, 120], [140, 134], [360, 96]] as const) { i.line(gx - 4, gy, gx, gy + 2, c(T.sky, 0)); i.line(gx, gy + 2, gx + 4, gy, c(T.sky, 0)); }
  // vignette in flat steps (no dither)
  for (let y = 0; y < MENU_H; y++) for (let x = 0; x < MENU_W; x++) {
    const edge = Math.min(x, MENU_W - 1 - x, y, MENU_H - 1 - y);
    if (edge < 12) i.tint(x, y, [8, 8, 12, edge < 4 ? 170 : edge < 8 ? 110 : 60]);
  }
  return { id: "menu-bg", img: i, note: "main menu backdrop: night sea, moon path, moonlit surfaced boat" };
}

function panel(): Sprite {
  const i = new Img(PANEL_W, PANEL_H), m = T.m;
  i.rect(0, 0, PANEL_W, PANEL_H, c(k, 2)); i.frame(0, 0, PANEL_W, PANEL_H, c(k, 0)); i.hline(1, 1, PANEL_W - 2, c(k, 5)); i.vline(1, 1, PANEL_H - 2, c(k, 4)); i.hline(1, PANEL_H - 2, PANEL_W - 2, c(k, 1));
  for (const y of [0, PANEL_H - 12]) { // ribbed rails in painted mauve
    i.rect(0, y, PANEL_W, 12, c(m, 2)); i.hline(0, y, PANEL_W, c(m, 4)); i.hline(0, y + 11, PANEL_W, c(m, 0));
    for (let x = 6; x < PANEL_W - 6; x += 4) { i.vline(x, y + 3, 6, c(m, 1)); i.vline(x + 1, y + 3, 6, c(m, 3)); }
  }
  for (const [x, y] of [[4, 16], [PANEL_W - 7, 16], [4, PANEL_H - 19], [PANEL_W - 7, PANEL_H - 19]] as const) i.stamp(x, y, [".a.", "abc", ".c."], { a: c(k, 6), b: c(k, 4), c: c(k, 0) });
  return { id: "menu-panel", img: i, note: "menu steel panel with mauve rails and screws (128x180)" };
}

function plate(selected: boolean): Sprite {
  const i = new Img(PLATE_W, PLATE_H), b = T.brass;
  i.rrect(0, 0, PLATE_W, PLATE_H, 3, selected ? c(b, 2) : c(k, 0));
  i.rrect(1, 1, PLATE_W - 2, PLATE_H - 2, 2, selected ? c(b, 1) : c(k, 4));
  i.rrect(2, 2, PLATE_W - 4, PLATE_H - 4, 2, selected ? c(k, 2) : c(k, 1));
  i.hline(4, 2, PLATE_W - 8, selected ? c(b, 3) : c(k, 3));
  for (const [x, y] of [[5, 5], [PLATE_W - 8, 5], [5, PLATE_H - 8], [PLATE_W - 8, PLATE_H - 8]] as const) i.stamp(x, y, [".a.", "abc", ".c."], { a: selected ? c(b, 4) : c(k, 6), b: selected ? c(b, 2) : c(k, 4), c: c(k, 0) });
  return { id: selected ? "menu-plate-sel" : "menu-plate", img: i, note: `menu button plate (${selected ? "selected" : "idle"})` };
}

function icons(): Sprite {
  const n = 4, i = new Img(ICON * n, ICON), cx = (q: number): number => q * ICON + 12, cy = 12;
  const brass = c(T.brass, 4), mid = c(T.brass, 3), shade = c(T.brass, 1);
  for (let y = -8; y <= 8; y++) { const w = 9 - Math.floor(Math.abs(y) * 0.95); for (let x = 0; x < w; x++) i.set(cx(0) - 4 + x, cy + y, x === 0 || Math.abs(y) > 6 ? shade : x === 1 ? brass : mid); }
  i.ellipse(cx(1), cy, 9, 9, shade); i.ellipse(cx(1), cy, 7, 7, c(k, 1));
  i.rect(cx(1) - 1, cy - 5, 3, 11, brass); i.rect(cx(1) - 5, cy - 1, 11, 3, brass); i.vline(cx(1) + 1, cy - 5, 11, mid);
  i.ellipse(cx(2), cy, 8, 8, mid);
  for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; i.rect(Math.round(cx(2) + Math.cos(t) * 9.5) - 1, Math.round(cy + Math.sin(t) * 9.5) - 1, 3, 3, mid); }
  i.ellipse(cx(2), cy, 4, 4, c(k, 1)); i.ellipse(cx(2), cy, 2, 2, shade);
  i.ellipse(cx(3), cy, 9, 9, shade); i.ellipse(cx(3), cy, 7, 7, c(k, 1));
  for (const [x, y] of [[-2, -4], [-1, -5], [0, -5], [1, -5], [2, -4], [2, -3], [1, -2], [0, -1], [0, 0], [0, 2]] as const) i.set(cx(3) + x, cy + y + 1, brass);
  i.set(cx(3), cy + 5, brass);
  return { id: "menu-icons", img: i, frames: { w: ICON, h: ICON, count: n }, note: "menu icons: play, new game, settings, help (brass on slate)" };
}

function letter(): Sprite {
  const w = 44, h = 26, i = new Img(w, h), pa = T.pa;
  i.rect(0, 0, w, h, c(pa, 3)); i.frame(0, 0, w, h, c(pa, 0)); i.hline(1, 1, w - 2, c(pa, 5)); i.hline(1, h - 2, w - 2, c(pa, 2));
  for (let n = 0; n < 14; n++) { i.set(2 + n, 2 + Math.floor(n * 0.6), c(pa, 1)); i.set(w - 3 - n, 2 + Math.floor(n * 0.6), c(pa, 1)); }
  i.hline(1, 12, w - 2, c(pa, 2));
  i.ellipse(22, 12, 5, 5, c(T.red, 0)); i.ellipse(22, 12, 4, 4, c(T.red, 2)); i.set(20, 10, c(T.red, 3)); i.set(21, 10, c(T.red, 3)); i.hline(20, 13, 5, c(T.red, 1));
  return { id: "menu-letter", img: i, note: "sealed letter button (opens the help page)" };
}

export function menuSprites(): Sprite[] {
  void CLEAR;
  return [menuBg(), panel(), plate(false), plate(true), icons(), letter()];
}
