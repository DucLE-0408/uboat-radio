// G6 water temperature and the thermocline. A pure function of (seed, position): a smooth climatology (warmer to the south, cooler towards
// the coast) plus seeded eddies. The chart publishes only the climatology; the boat's own thermometer reads the real field, so the eddies
// are what the player finds out by sailing. The layer depth follows the temperature (warmer water, deeper layer).
import type { Balance } from "./balance";
import { coastKm } from "./messages";
import { derive } from "./rng";

export interface WaterState { readonly tempC: number; readonly layerM: number }
export interface Water {
  /** The real water at a world position (km). */
  at(xKm: number, yKm: number): WaterState;
  /** The surveyed climatology (no eddies): what the chart shows. */
  chart(xKm: number, yKm: number): WaterState;
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

export function makeWater(seed: number | string, b: Balance, origin: { readonly x: number; readonly y: number }): Water {
  const w = b.water, r = derive(seed, "water"), coast = coastKm(b);
  const eddies: { x: number; y: number; rad: number; amp: number }[] = [];
  for (let i = 0; i < w.eddies.count; i++) {
    eddies.push({
      x: origin.x - w.eddies.spreadKm + r.next() * 2 * w.eddies.spreadKm, y: origin.y - w.eddies.spreadKm + r.next() * 2 * w.eddies.spreadKm,
      rad: w.eddies.minRadiusKm + r.next() * (w.eddies.maxRadiusKm - w.eddies.minRadiusKm), amp: (r.next() * 2 - 1) * w.eddies.maxAmpC, // fixed draws per eddy
    });
  }
  const clim = (x: number, y: number): number =>
    w.baseC + (w.southGradCPer100Km * (origin.y - y)) / 100 - w.coastCoolC * Math.exp(-Math.max(0, coast - x) / w.coastScaleKm);
  const layer = (tempC: number): number => w.layerMinM + (w.layerMaxM - w.layerMinM) * clamp01((tempC - w.coldC) / (w.warmC - w.coldC));
  return {
    at(x, y) {
      let t = clim(x, y);
      for (const e of eddies) { const d = Math.hypot(x - e.x, y - e.y) / e.rad; t += e.amp * Math.exp(-d * d); }
      return { tempC: t, layerM: layer(t) };
    },
    chart(x, y) { const t = clim(x, y); return { tempC: t, layerM: layer(t) }; },
  };
}
