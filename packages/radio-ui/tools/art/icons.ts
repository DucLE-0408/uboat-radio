// App icons (TEMPORARY placeholders, original work): a surfaced boat under a dusk sky sending radio waves.
// Drawn once on a 32x32 grid and upscaled with nearest-neighbour so they stay pixel art at 192 and 512 px.
import { CLEAR, Img, scaleNearest, type RGBA } from "./pix.ts";
import { T } from "./tone.ts";
import type { Sprite } from "./sprites.ts";

function draw(maskable: boolean): Img {
  const i = new Img(32, 32);
  // background: dusk sky over sea. Maskable icons are full-bleed, "any" icons have rounded corners.
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) i.set(x, y, y < 19 ? (T.sky[y < 8 ? 0 : y < 14 ? 1 : 3] as RGBA) : (T.sea[y < 22 ? 4 : y < 27 ? 2 : 1] as RGBA));
  i.set(8, 6, T.hull[6] as RGBA); i.set(26, 5, T.hull[5] as RGBA); i.rect(24, 8, 2, 2, [196, 202, 218, 255]);
  for (let x = 0; x < 32; x += 3) i.set(x, 19 + (x % 6 < 3 ? 0 : 1), [70, 86, 130, 255]); // waterline glint
  // boat (kept inside the central 20x20 so a circular/squircle mask never clips it)
  i.ellipse(16, 21, 8, 3, T.hull[2] as RGBA); i.rect(9, 19, 14, 3, T.hull[2] as RGBA); i.hline(9, 19, 14, T.hull[5] as RGBA);
  i.rect(13, 15, 6, 4, T.hull[3] as RGBA); i.frame(13, 15, 6, 4, T.hull[0] as RGBA); i.rect(14, 16, 2, 1, T.lamp[2] as RGBA); i.rect(17, 16, 1, 1, T.lamp[2] as RGBA);
  i.vline(18, 11, 4, T.hull[5] as RGBA); i.hline(18, 11, 3, T.hull[5] as RGBA);                                       // periscope
  i.set(16, 21, T.g[3] as RGBA); i.set(15, 21, T.g[3] as RGBA); i.set(17, 21, T.g[3] as RGBA);                            // lit hull lamps
  // radio waves leaving the mast: two ")" arcs
  const arc = (x: number, h: number, c: RGBA): void => { for (let k = -h; k <= h; k++) i.set(x + (Math.abs(k) >= h - 0 ? -1 : 0), 11 + k, c); };
  i.set(21, 11, T.g[3] as RGBA);
  arc(23, 2, T.hull[6] as RGBA); arc(26, 3, T.hull[4] as RGBA);
  if (!maskable) { // rounded corners (transparent) for the plain icon
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [31, 0], [30, 0], [31, 1], [0, 31], [1, 31], [0, 30], [31, 31], [30, 31], [31, 30]] as const) i.set(x, y, CLEAR);
  }
  return i;
}

export function iconSprites(): { sprite: Sprite; path: string }[] {
  const plain = draw(false), mask = draw(true);
  return [
    { path: "../public/icons/icon-192.png", sprite: { id: "icon-192", img: scaleNearest(plain, 6), note: "app icon 192x192 (any)" } },
    { path: "../public/icons/icon-512.png", sprite: { id: "icon-512", img: scaleNearest(plain, 16), note: "app icon 512x512 (any)" } },
    { path: "../public/icons/icon-maskable-512.png", sprite: { id: "icon-maskable-512", img: scaleNearest(mask, 16), note: "app icon 512x512, full-bleed, safe zone respected (maskable)" } },
  ];
}
