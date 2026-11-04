// Main-menu art (TEMPORARY placeholders, original work): dusk sea with a surfaced boat, riveted steel panel, button plates, icons, sealed letter.
// Composition follows the approved reference screenshot (panel left, scene right, letter top right); no pixels are taken from it.
import { artRng, bayer, CLEAR, Img, type RGBA } from "./pix.ts";
import { P } from "./palette.ts";
import type { Sprite } from "./sprites.ts";

export const MENU_W = 640, MENU_H = 360;
export const PLATE_W = 112, PLATE_H = 34, PANEL_W = 128, PANEL_H = 180;
export const ICON = 24;

const dusk = { top: P.n1, mid: P.p1, low: P.pink, glow: P.amber } as const;

function menuBg(): Sprite {
  const i = new Img(MENU_W, MENU_H);
  const horizon = 214;
  // sky: dithered gradient navy -> violet -> rose -> amber at the horizon
  const stops: [number, RGBA][] = [[0, P.n0], [0.3, P.p1], [0.62, P.p2], [0.84, P.pink], [1, dusk.glow]];
  for (let y = 0; y < horizon; y++) {
    const t = y / (horizon - 1);
    let k = 0;
    while (k < stops.length - 2 && t > (stops[k + 1] as [number, RGBA])[0]) k++;
    const [t0, c0] = stops[k] as [number, RGBA], [t1, c1] = stops[k + 1] as [number, RGBA];
    const f = (t - t0) / (t1 - t0);
    for (let x = 0; x < MENU_W; x++) i.set(x, y, bayer(x, y) < f ? c1 : c0);
  }
  const rng = artRng(0x5eed1);
  // sun disc low on the right, with a halo
  i.shadeEllipse(470, horizon - 10, 46, 30, P.amber, P.pink, 0, -0.2);
  i.ellipse(470, horizon - 8, 18, 14, P.amber);
  // cloud bands: flat ellipses in two tones
  for (let n = 0; n < 16; n++) {
    const cx = Math.floor(rng() * MENU_W), cy = 20 + Math.floor(rng() * 150), rx = 26 + Math.floor(rng() * 70), ry = 3 + Math.floor(rng() * 6);
    const hi = cy > 110;
    i.ellipse(cx, cy, rx, ry, hi ? P.pink : P.lav);
    i.ellipse(cx, cy + 1, Math.floor(rx * 0.8), Math.max(1, ry - 2), hi ? P.r2 : P.p2);
  }
  // sea: banded gradient with dithered swell and a warm reflection under the sun
  for (let y = horizon; y < MENU_H; y++) {
    const t = (y - horizon) / (MENU_H - horizon);
    for (let x = 0; x < MENU_W; x++) {
      const wave = Math.sin(x / 9 + y / 3) * 0.12 + Math.sin(x / 23 - y / 5) * 0.1;
      const v = t + wave;
      i.set(x, y, bayer(x, y) < Math.min(1, Math.max(0, v)) ? P.w0 : P.w1);
    }
  }
  for (let y = horizon; y < MENU_H; y += 3) {
    const reach = 30 + (y - horizon) * 0.9;
    for (let x = 470 - Math.floor(reach); x < 470 + reach; x++) if (bayer(x + y, y) < 0.55 - (y - horizon) / 300 && Math.sin(x / 4 + y) > -0.2) i.set(x, y, y - horizon < 40 ? P.amber : P.r2);
  }
  for (let n = 0; n < 220; n++) { const x = Math.floor(rng() * MENU_W), y = horizon + 2 + Math.floor(rng() * (MENU_H - horizon - 4)); i.hline(x, y, 2 + Math.floor(rng() * 6), P.w3); }
  i.hline(0, horizon, MENU_W, P.p2);
  // surfaced boat in silhouette, hull sitting in the swell
  const bx = 250, by = horizon - 2;
  i.ellipse(bx + 100, by + 4, 118, 6, P.s0);            // long hull
  i.rect(bx - 10, by - 1, 220, 5, P.s0);
  i.hline(bx - 10, by - 1, 220, P.s1);
  i.ellipse(bx + 214, by + 1, 14, 4, P.s0);             // bow
  i.rect(bx + 78, by - 22, 30, 21, P.s0); i.hline(bx + 78, by - 22, 30, P.s2);   // conning tower
  i.rect(bx + 82, by - 29, 16, 8, P.s0); i.hline(bx + 82, by - 29, 16, P.s1);    // bridge fairing
  i.vline(bx + 90, by - 46, 17, P.s1); i.hline(bx + 90, by - 46, 6, P.s1);       // periscope
  i.vline(bx + 102, by - 36, 7, P.s1);                                           // radio mast
  for (const k of [0, 1, 2]) i.set(bx + 86 + k * 4, by - 14, P.amber);           // lit ports
  i.rect(bx + 132, by - 8, 14, 8, P.s0); i.rect(bx + 146, by - 6, 12, 1, P.s1);  // deck gun
  i.line(bx - 6, by - 9, bx + 90, by - 46, P.s1); i.line(bx + 90, by - 46, bx + 200, by - 7, P.s1); // aerial
  for (let x = bx - 20; x < bx + 220; x += 2) if (bayer(x, by) < 0.5) i.set(x, by + 6, P.w3);      // foam line
  // gulls
  for (const [gx, gy] of [[118, 120], [140, 134], [360, 96]] as const) { i.line(gx - 4, gy, gx, gy + 2, P.n0); i.line(gx, gy + 2, gx + 4, gy, P.n0); }
  // vignette so the left panel and the corners sit quietly
  for (let y = 0; y < MENU_H; y++) for (let x = 0; x < MENU_W; x++) {
    const edge = Math.min(x, MENU_W - 1 - x, y, MENU_H - 1 - y);
    if (edge < 14 && bayer(x, y) < (14 - edge) / 22) i.set(x, y, P.n0);
  }
  return { id: "menu-bg", img: i, note: "main menu backdrop: dusk sea, surfaced boat" };
}

function panel(): Sprite {
  const i = new Img(PANEL_W, PANEL_H);
  const rng = artRng(0x9a11);
  i.bevel(0, 0, PANEL_W, PANEL_H, P.s2, P.s0, P.ink);
  i.wear(rng, 2, 2, PANEL_W - 4, PANEL_H - 4, P.s1, 260);
  i.wear(rng, 2, 2, PANEL_W - 4, PANEL_H - 4, P.ink, 120);
  for (const y of [0, PANEL_H - 12]) {            // ribbed rails top and bottom
    i.rect(0, y, PANEL_W, 12, P.s1); i.hline(0, y, PANEL_W, P.s3); i.hline(0, y + 11, PANEL_W, P.ink);
    for (let x = 6; x < PANEL_W - 6; x += 4) { i.vline(x, y + 3, 6, P.s0); i.vline(x + 1, y + 3, 6, P.s2); }
  }
  for (const [x, y] of [[4, 16], [PANEL_W - 6, 16], [4, PANEL_H - 18], [PANEL_W - 6, PANEL_H - 18]] as const) i.rivet(x, y, P.s4, P.s0);
  return { id: "menu-panel", img: i, note: "menu steel panel with rails and rivets (128x180)" };
}

function plate(selected: boolean): Sprite {
  const i = new Img(PLATE_W, PLATE_H);
  const rng = artRng(selected ? 0x77a1 : 0x77a0);
  const [lo, mid, hi] = selected ? [P.b1, P.s1, P.b3] : [P.ink, P.s0, P.s2];
  i.bevel(0, 0, PLATE_W, PLATE_H, hi, mid, lo);
  i.rect(2, 2, PLATE_W - 4, PLATE_H - 4, P.s0); i.frame(2, 2, PLATE_W - 4, PLATE_H - 4, P.ink);
  i.wear(rng, 3, 3, PLATE_W - 6, PLATE_H - 6, P.s1, 150);
  i.wear(rng, 3, 3, PLATE_W - 6, PLATE_H - 6, P.ink, 60);
  for (const [x, y] of [[4, 4], [PLATE_W - 6, 4], [4, PLATE_H - 6], [PLATE_W - 6, PLATE_H - 6]] as const) i.rivet(x, y, selected ? P.b3 : P.s3, P.ink);
  if (selected) { i.frame(1, 1, PLATE_W - 2, PLATE_H - 2, P.amber); i.frame(0, 0, PLATE_W, PLATE_H, P.b2); }
  return { id: selected ? "menu-plate-sel" : "menu-plate", img: i, note: `menu button plate (${selected ? "selected" : "idle"})` };
}

function icons(): Sprite {
  const n = 4;
  const i = new Img(ICON * n, ICON);
  const cx = (k: number): number => k * ICON + 12, cy = 12;
  const brass = P.b3, shade = P.b1, mid = P.b2;
  // 0 play: brass triangle
  for (let y = -8; y <= 8; y++) { const w = 9 - Math.floor(Math.abs(y) * 0.95); for (let x = 0; x < w; x++) i.set(cx(0) - 4 + x, cy + y, x === 0 || Math.abs(y) > 6 ? shade : brass); }
  // 1 new game: ring with a plus
  i.ellipse(cx(1), cy, 9, 9, shade); i.ellipse(cx(1), cy, 7, 7, P.s0);
  i.rect(cx(1) - 1, cy - 5, 3, 11, brass); i.rect(cx(1) - 5, cy - 1, 11, 3, brass); i.vline(cx(1) + 1, cy - 5, 11, mid);
  // 2 settings: cog
  i.ellipse(cx(2), cy, 8, 8, brass);
  for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; i.rect(Math.round(cx(2) + Math.cos(t) * 9.5) - 1, Math.round(cy + Math.sin(t) * 9.5) - 1, 3, 3, brass); }
  i.ellipse(cx(2), cy, 4, 4, P.s0); i.ellipse(cx(2), cy, 2, 2, shade);
  // 3 help: ring with a question mark
  i.ellipse(cx(3), cy, 9, 9, shade); i.ellipse(cx(3), cy, 7, 7, P.s0);
  for (const [x, y] of [[-2, -4], [-1, -5], [0, -5], [1, -5], [2, -4], [2, -3], [1, -2], [0, -1], [0, 0], [0, 2]] as const) i.set(cx(3) + x, cy + y + 1, brass);
  i.set(cx(3), cy + 5, brass);
  return { id: "menu-icons", img: i, frames: { w: ICON, h: ICON, count: n }, note: "menu icons: play, new game, settings, help" };
}

function letter(): Sprite {
  const w = 44, h = 26;
  const i = new Img(w, h);
  i.bevel(0, 0, w, h, P.pa3, P.pa2, P.pa0);
  i.dither(1, 1, w - 2, h - 2, P.pa2, P.pa1, 0.18);
  for (let k = 0; k < 14; k++) { i.set(2 + k, 2 + Math.floor(k * 0.6), P.pa0); i.set(w - 3 - k, 2 + Math.floor(k * 0.6), P.pa0); } // envelope flap
  i.hline(1, 12, w - 2, P.pa0);
  i.ellipse(22, 12, 5, 5, P.r0); i.ellipse(22, 12, 4, 4, P.r1); i.set(20, 10, P.r2); i.set(21, 10, P.r2); i.hline(20, 13, 5, P.r0); // wax seal
  return { id: "menu-letter", img: i, note: "sealed letter button (opens the help page)" };
}

export function menuSprites(): Sprite[] {
  void CLEAR;
  return [menuBg(), panel(), plate(false), plate(true), icons(), letter()];
}
