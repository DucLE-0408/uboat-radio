// Decorative randomness (blinks, flicker, bob phase). Vietnamese: RNG RIÊNG, khởi tạo từ hạt giống thẩm mỹ của trang, tuyệt đối không chạm RNG của sim.
import { derive, type Rng } from "@uboat/sim-core";

export interface Decor {
  /** Wall-clock ms until the operator's next blink (3-7 s). */
  nextBlinkMs(): number;
  /** Wall-clock ms until the next light flicker on a damaged boat (0.4-1.6 s). */
  nextFlickerMs(): number;
  /** Seconds offset for the boat's bobbing animation. */
  bobPhaseS(): number;
}

export function makeDecor(cosmeticSeed: number): Decor {
  const r: Rng = derive(cosmeticSeed, "scene-decor");
  return {
    nextBlinkMs: () => 3000 + Math.floor(r.next() * 4000),
    nextFlickerMs: () => 400 + Math.floor(r.next() * 1200),
    bobPhaseS: () => Math.round(r.next() * 3200) / 1000,
  };
}
