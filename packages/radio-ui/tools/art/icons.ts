// App icons (TEMPORARY placeholders, original work): a surfaced boat under a dusk sky sending radio waves.
// Drawn once on a 32x32 grid and upscaled with nearest-neighbour so they stay pixel art at 192 and 512 px.
import { bayer, CLEAR, Img, scaleNearest, type RGBA } from "./pix.ts";
import { P } from "./palette.ts";
import type { Sprite } from "./sprites.ts";

function draw(maskable: boolean): Img {
  const i = new Img(32, 32);
  // background: dusk sky over sea. Maskable icons are full-bleed, "any" icons have rounded corners.
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const sky = y < 19;
    const t = sky ? y / 19 : (y - 19) / 13;
    const top: RGBA = sky ? P.n1 : P.w1, bot: RGBA = sky ? P.p1 : P.w0;
    i.set(x, y, bayer(x, y) < t ? bot : top);
  }
  for (let x = 0; x < 32; x += 3) i.set(x, 19 + (x % 6 < 3 ? 0 : 1), P.w3);                // waterline glint
  // boat (kept inside the central 20x20 so a circular/squircle mask never clips it)
  i.ellipse(16, 21, 8, 3, P.s1); i.rect(9, 19, 14, 3, P.s1); i.hline(9, 19, 14, P.s3);
  i.rect(13, 15, 6, 4, P.s2); i.frame(13, 15, 6, 4, P.s0); i.rect(14, 16, 2, 1, P.amber); i.rect(17, 16, 1, 1, P.amber);
  i.vline(18, 11, 4, P.s3); i.hline(18, 11, 3, P.s3);                                       // periscope
  i.set(16, 21, P.g2); i.set(15, 21, P.g2); i.set(17, 21, P.g2);                            // lit hull lamps
  // radio waves leaving the mast: two ")" arcs
  const arc = (x: number, h: number, c: RGBA): void => { for (let k = -h; k <= h; k++) i.set(x + (Math.abs(k) >= h - 0 ? -1 : 0), 11 + k, c); };
  i.set(21, 11, P.g2);
  arc(23, 2, P.lav); arc(26, 3, P.p2);
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
