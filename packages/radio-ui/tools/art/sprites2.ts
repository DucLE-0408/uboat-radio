// Stage-5 placeholder art (TEMPORARY): submarine cutaway (boat.ts) and the operator portrait sheet (portrait.ts). Original work, deterministic.
import { Img } from "./pix.ts";
import { operator, PH, PORTRAIT_POSES, PW } from "./portrait.ts";
import type { Sprite } from "./sprites.ts";

export { BOAT_H, BOAT_W, boatSprites } from "./boat.ts";
export { PORTRAIT_POSES };

export function portraitSheet(): Sprite {
  const sheet = new Img(PW * PORTRAIT_POSES.length, PH);
  PORTRAIT_POSES.forEach((p, f) => sheet.blit(operator(p), f * PW, 0));
  return { id: "portrait", img: sheet, frames: { w: PW, h: PH, count: PORTRAIT_POSES.length }, note: `operator portrait frames: ${PORTRAIT_POSES.join(", ")}` };
}
