// Pure helpers for the water-temperature overlay and its readouts. No DOM.
import { BALANCE, type Balance } from "@uboat/sim-core";

const lerp = (a: number, b: number, x: number): number => a + (b - a) * x;
const hex = (n: number): string => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
const STOPS: readonly (readonly [number, number, number])[] = [[0x3b, 0x6f, 0xd8], [0x6f, 0xcf, 0x97], [0xf5, 0xc1, 0x5a]]; // cold blue, mild green, warm amber: lightness rises with temperature

/** Colour of a water temperature on the chart's scale (the climate range of the sim). */
export function tempColor(tempC: number, b: Balance = BALANCE): string {
  const x = Math.max(0, Math.min(1, (tempC - b.water.coldC) / (b.water.warmC - b.water.coldC))), seg = x < 0.5 ? 0 : 1, f = x < 0.5 ? x * 2 : (x - 0.5) * 2;
  const a = STOPS[seg] as readonly [number, number, number], c = STOPS[seg + 1] as readonly [number, number, number];
  return `#${hex(lerp(a[0], c[0], f))}${hex(lerp(a[1], c[1], f))}${hex(lerp(a[2], c[2], f))}`;
}

export type LayerAdvice = "below" | "above";
/** Where we lie against the last measured layer; null when there is no recent reading. */
export function layerAdvice(depthM: number, sample: { readonly tSec: number; readonly layerM: number } | null, nowSec: number, maxAgeSec = 600): LayerAdvice | null {
  if (sample === null || nowSec - sample.tSec > maxAgeSec) return null;
  return depthM > sample.layerM ? "below" : "above";
}

/** Samples kept for the chart and the age after which the readout is stale. */
export const SAMPLE_MAX = 300;
