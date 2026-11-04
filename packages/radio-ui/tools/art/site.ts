// Landing-page art (TEMPORARY, original work): a 7-icon sheet for the landing cards. Flat colours, no dither.
// The landing showcase image is a real screenshot of the game (packages/site/public/assets/desk.png), not generated here.
import { Img, scaleNearest, type RGBA } from "./pix.ts";
import { T } from "./tone.ts";
import type { Sprite } from "./sprites.ts";

const GRID = 16;
const PAL: Readonly<Record<string, RGBA>> = {
  a: T.brass[3] as RGBA, b: T.brass[4] as RGBA, c: T.brass[1] as RGBA,
  d: T.e[3] as RGBA, e: T.e[1] as RGBA, s: T.e[6] as RGBA, t: T.e[8] as RGBA,
  w: T.pa[5] as RGBA, v: T.pa[3] as RGBA, x: T.ink,
  g: T.g[3] as RGBA, h: T.g[1] as RGBA, r: T.red[2] as RGBA, q: T.red[0] as RGBA,
  y: T.hull[5] as RGBA, z: T.hull[3] as RGBA,
};

// 0 copy: headphones with a signal; 1 decode: rotor window; 2 verify: stamped paper; 3 decide: accept/reject lamps;
// 4 offline: plug; 5 no tracking: shield; 6 deterministic: die.
const ICONS: readonly (readonly string[])[] = [
  ["................", "....cccccccc....", "...cbbbbbbbbc...", "..cb........bc..", "..cb........bc..", ".cbb........bbc.", ".cdd...gg...ddc.", ".cds..g..g..sdc.", ".cds...gg...sdc.", ".cds..g..g..sdc.", ".cdd...gg...ddc.", "..cc........cc..", "................", "................", "................", "................"],
  ["................", "................", ".dddddddddddddd.", ".dttttttttttttd.", ".dtwwwwxxwwwwtd.", ".dtwwwxwwxwwwtd.", ".dtwwxwwwwxwwtd.", ".dtwwxxxxxxwwtd.", ".dtwwxwwwwxwwtd.", ".dtwwxwwwwxwwtd.", ".dtwwwwwwwwwwtd.", ".dttttttttttttd.", ".dddddddddddddd.", "..ss.ss.ss.ss...", "................", "................"],
  ["................", "..vvvvvvvvvvv...", "..vwwwwwwwwwv...", "..vwxxxxxxwwv...", "..vwwwwwwwwwv...", "..vwxxxxwwwwv...", "..vwwwwwwwwwv...", "..vwwwwwwwwgv...", "..vwwwwwwwgwv...", "..vgwwwwwgwwv...", "..vwgwwwgwwwv...", "..vwwgwgwwwwv...", "..vwwwghwwwwv...", "..vvvvvvvvvvv...", "................", "................"],
  ["................", "................", "................", "..hhhh....qqqq..", ".hggggh..qrrrrq.", ".hggggh..qrrrrq.", ".hggggh..qrrrrq.", ".hggggh..qrrrrq.", "..hhhh....qqqq..", "................", ".dddddddddddddd.", ".dddddddddddddd.", "................", "................", "................", "................"],
  ["................", "...ss....ss.....", "...ss....ss.....", "...ss....ss.....", "..ssssssssss....", "..sddddddddss...", "..sddddddddss...", "..sddddddddss...", "...sddddddss....", "....ssddss......", ".....ssss.......", ".....ssss.......", ".....ss.ss......", "................", "................", "................"],
  ["................", "..yyyyyyyyyyyy..", "..yzzzzzzzzzzy..", "..yzzzzyzzzzzy..", "..yzzzzyzzzzzy..", "..yzzyyyyyzzzy..", "..yzzzzyzzzzzy..", "...yzzzyzzzzy...", "....yzzzzzzy....", ".....yzzzzy.....", "......yzzy......", ".......yy.......", "................", "................", "................", "................"],
  ["................", "..tttttttttttt..", "..tsssssssssst..", "..tsxxssssxxst..", "..tsxxssssxxst..", "..tsssssssssst..", "..tssssxxsssst..", "..tssssxxsssst..", "..tsssssssssst..", "..tsxxssssxxst..", "..tsxxssssxxst..", "..tsssssssssst..", "..tttttttttttt..", "................", "................", "................"],
];


function iconSheet(): Sprite {
  const small = new Img(GRID * ICONS.length, GRID);
  ICONS.forEach((rows, n) => {
    if (rows.length !== GRID) throw new Error(`icon ${n}: ${rows.length} rows`);
    rows.forEach((r) => { if (r.length !== GRID) throw new Error(`icon ${n}: row "${r}" has ${r.length} columns`); });
    small.stamp(n * GRID, 0, rows, PAL);
  });
  const sheet = scaleNearest(small, 2);
  return { id: "site-icons", img: sheet, frames: { w: 32, h: 32, count: ICONS.length }, note: "landing card icons (x2 of a 16x16 grid): copy, decode, verify, decide, offline, no tracking, deterministic" };
}

export function siteSprites(): Sprite[] {
  return [iconSheet()];
}
