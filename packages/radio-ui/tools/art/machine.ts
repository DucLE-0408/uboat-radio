// Cipher machine parts (TEMPORARY, original work): green-black enamel casing with red side rails, cream indicator
// windows with ribbed thumbwheels, a dial around the status lamp, glass lamps and ringed key caps. No noise layers.
import { Img, type RGBA } from "./pix.ts";
import { T } from "./tone.ts";
import type { Sprite } from "./sprites.ts";

/** Indicator windows (machine coords); scene/machine.ts places the live letters on the same rects. */
export const WINDOWS = [30, 58, 86, 114].map((x) => ({ x, y: 26, w: 14, h: 16 }));
export const NAMEPLATE = { x: 142, y: 5, w: 58, h: 11 } as const;

const screw = (i: Img, x: number, y: number): void => i.stamp(x, y, [".ab.", "abbc", "bbcc", ".cc."], { a: T.e[7] as RGBA, b: T.e[5] as RGBA, c: T.e[2] as RGBA });

export function machineCasing(): Sprite {
  const W = 208, H = 244, i = new Img(W, H), e = T.e, r = T.rail;
  // body: flat enamel, a single light edge top/left and a shadow edge bottom/right
  i.rect(0, 0, W, H, e[2] as RGBA);
  i.hline(4, 1, W - 8, e[5] as RGBA); i.hline(4, H - 2, W - 8, e[0] as RGBA);
  i.frame(0, 0, W, H, e[0] as RGBA);
  // red side rails
  for (const x0 of [0, W - 5]) { i.rect(x0, 0, 5, H, r[1] as RGBA); i.vline(x0 + (x0 === 0 ? 3 : 1), 2, H - 4, r[3] as RGBA); i.vline(x0 + (x0 === 0 ? 0 : 4), 0, H, r[0] as RGBA); }
  // worn paint: a few chips along edges that hands touch (deliberate, not scattered)
  for (const [x, y, w] of [[8, 3, 5], [60, 3, 3], [190, 118, 4], [8, 236, 6], [120, 239, 3]] as const) { i.hline(x, y, w, e[4] as RGBA); i.hline(x + 1, y + 1, w - 2, e[3] as RGBA); }
  for (const [x, y] of [[7, 5], [W - 11, 5], [7, H - 9], [W - 11, H - 9]] as const) screw(i, x, y);

  // indicator windows: cream plates sunk into the lid, each with a ribbed thumbwheel to its right
  for (const wdw of WINDOWS) {
    i.rect(wdw.x - 2, wdw.y - 2, wdw.w + 4, wdw.h + 4, e[0] as RGBA);
    i.rect(wdw.x, wdw.y, wdw.w, wdw.h, [206, 198, 176, 255]); i.hline(wdw.x, wdw.y, wdw.w, [150, 142, 122, 255]); i.vline(wdw.x, wdw.y, wdw.h, [170, 162, 140, 255]);
    const tx = wdw.x + wdw.w + 4;
    i.rect(tx - 1, wdw.y - 6, 6, wdw.h + 12, e[0] as RGBA);
    for (let y = wdw.y - 5; y < wdw.y + wdw.h + 5; y++) i.hline(tx, y, 4, ((y & 1) === 0 ? e[6] : e[3]) as RGBA);
    i.vline(tx + 3, wdw.y - 5, wdw.h + 10, e[2] as RGBA);
  }
  // nameplate: pale green enamel label (live text on top)
  const np = NAMEPLATE;
  i.rect(np.x, np.y, np.w, np.h, T.g[3] as RGBA); i.frame(np.x, np.y, np.w, np.h, T.g[1] as RGBA); i.hline(np.x + 1, np.y + 1, np.w - 2, T.g[4] as RGBA);
  // dial arc around the status lamp (lamp sprite sits at 174,26 16x22 -> centre 182,37), clear of the red rail
  for (let y = 18; y < 52; y++) for (let x = 160; x < 202; x++) {
    const d = Math.hypot(x + 0.5 - 182, y + 0.5 - 39);
    if (y <= 43 && d >= 13 && d < 18) i.set(x, y, (d < 14 ? e[3] : e[0]) as RGBA);
  }
  for (const a of [200, 235, 270, 305, 340]) { const t = (a * Math.PI) / 180; i.set(Math.round(182 + Math.cos(t) * 15.5), Math.round(39 + Math.sin(t) * 15.5), T.g[2] as RGBA); }

  // lampboard: flat recessed panel; two clamps on the sides
  i.rect(8, 56, 192, 60, e[1] as RGBA); i.hline(8, 56, 192, e[0] as RGBA); i.vline(8, 56, 60, e[0] as RGBA); i.hline(8, 115, 192, e[3] as RGBA);
  for (const x of [6, 196]) { i.rect(x, 80, 6, 8, e[6] as RGBA); i.hline(x, 80, 6, e[7] as RGBA); i.hline(x, 87, 6, e[3] as RGBA); i.set(x + 2, 83, e[2] as RGBA); }
  // keyboard bay with the key-lever rails under each row
  i.rect(6, 120, 196, 98, e[1] as RGBA); i.hline(6, 120, 196, e[0] as RGBA); i.hline(6, 217, 196, e[3] as RGBA);
  for (const y of [139, 159, 177, 195, 217]) { i.rect(9, y, 190, 3, e[0] as RGBA); i.hline(9, y - 1, 190, e[2] as RGBA); }
  // vent strip
  i.rect(8, 224, 192, 14, e[1] as RGBA);
  for (let y = 227; y < 236; y += 3) { i.hline(12, y, 184, e[0] as RGBA); i.hline(12, y + 1, 184, e[3] as RGBA); }
  return { id: "machine", img: i, note: "cipher machine casing: red rails, nameplate, 4 indicator windows + thumbwheels, status dial, lamp and key bays" };
}

export function keyRound(): Sprite {
  const e = T.e, sheet = new Img(32, 16);
  for (const [f, down] of [[0, false], [1, true]] as const) {
    const i = new Img(16, 16), cy = down ? 8 : 7;
    if (!down) { i.ellipse(8, 10, 7, 5, e[0] as RGBA); }              // shadow of the key stem
    i.ellipse(8, cy, 7, 7, (down ? e[6] : e[7]) as RGBA);              // metal ring
    i.ellipse(8, cy, 6, 6, e[1] as RGBA);                               // cap
    i.ellipse(8, cy + 1, 5, 5, e[0] as RGBA); i.ellipse(8, cy, 5, 5, e[1] as RGBA); // inner lip shadow
    if (!down) { i.hline(5, cy - 5, 4, e[3] as RGBA); i.set(4, cy - 4, e[3] as RGBA); } // glint on the cap rim
    sheet.blit(i, f * 16, 0);
  }
  return { id: "key-round", img: sheet, frames: { w: 16, h: 16, count: 2 }, note: "key cap, frame 0 = up, frame 1 = pressed" };
}

export function keyWide(down: boolean): Sprite {
  const e = T.e, i = new Img(16, 16), y = down ? 1 : 0;
  if (!down) i.rrect(1, 2, 14, 14, 4, e[0] as RGBA);
  i.rrect(0, y, 16, 15, 4, (down ? e[6] : e[7]) as RGBA);
  i.rrect(1, y + 1, 14, 13, 3, e[1] as RGBA);
  if (!down) i.hline(4, y + 2, 8, e[3] as RGBA);
  return { id: down ? "keywide-down" : "keywide-up", img: i, note: `9-slice wide key (${down ? "pressed" : "up"}), 4px corners` };
}

export function lampSheet(): Sprite {
  const e = T.e, a = T.am, sheet = new Img(28, 14);
  for (const [f, on] of [[0, false], [1, true]] as const) {
    const i = new Img(14, 14);
    i.ellipse(7, 7, 6, 6, e[0] as RGBA);
    if (on) { i.ellipse(7, 7, 5, 5, a[2] as RGBA); i.ellipse(7, 7, 4, 4, a[3] as RGBA); i.ellipse(6, 6, 2, 2, a[4] as RGBA); }
    else { i.ellipse(7, 7, 5, 5, e[2] as RGBA); i.hline(4, 3, 3, e[4] as RGBA); i.set(3, 4, e[4] as RGBA); }
    sheet.blit(i, f * 14, 0);
  }
  return { id: "lamp", img: sheet, frames: { w: 14, h: 14, count: 2 }, note: "glass lamp, frame 0 = off, frame 1 = lit (warm amber)" };
}

export function statusLampSheet(): Sprite {
  const e = T.e, w = 16, h = 22, sheet = new Img(w * 3, h);
  [null, T.g, T.red].forEach((c, f) => {
    const i = new Img(w, h);
    i.ellipse(8, 11, 6, 6, e[0] as RGBA); i.ellipse(8, 11, 5, 5, e[5] as RGBA); i.ellipse(8, 11, 4, 4, e[0] as RGBA);
    if (c) { i.ellipse(8, 11, 3, 3, c[2] as RGBA); i.ellipse(8, 11, 2, 2, c[3] as RGBA); i.set(7, 10, (c[4] ?? c[3]) as RGBA); }
    else { i.ellipse(8, 11, 3, 3, e[2] as RGBA); i.set(7, 10, e[4] as RGBA); }
    sheet.blit(i, f * w, 0);
  });
  return { id: "status-lamp", img: sheet, frames: { w, h, count: 3 }, note: "status lamp: 0 off, 1 green, 2 red" };
}
