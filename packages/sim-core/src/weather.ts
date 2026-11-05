// G6 weather: a pure function of (seed, time). Hourly-ish knots drawn once from a dedicated stream, smoothly interpolated and wrapped,
// so no RNG state advances during the watch (replay and the night watch are untouched).
import type { Balance } from "./balance";
import { derive } from "./rng";

export interface WeatherState {
  /** True visibility in km (1 = fog .. 20 = clear). */
  readonly visKm: number;
  readonly windDeg: number;
  /** Wind force 1..maxForce. */
  readonly force: number;
  /** Sea state 0..8, follows the wind. */
  readonly seaState: number;
  /** The unrounded sea state (0..8) that drives speed. */
  readonly sea: number;
}

export interface Weather { at(tSec: number): WeatherState }

const smooth = (x: number): number => x * x * (3 - 2 * x);

export function makeWeather(seed: number | string, b: Balance): Weather {
  const w = b.weather, r = derive(seed, "weather"), n = w.knotCount;
  const vis: number[] = [], force: number[] = [], dir: number[] = [];
  let d = r.next() * 360;
  for (let i = 0; i < n; i++) {
    vis.push(w.minVisKm + (w.maxVisKm - w.minVisKm) * Math.pow(r.next(), w.visSkew));
    force.push(1 + (w.maxForce - 1) * Math.pow(r.next(), 2));
    d += (r.next() - 0.5) * w.windStepDeg; dir.push(d);
  }
  return {
    at(tSec: number): WeatherState {
      const u = Math.max(0, tSec) / w.knotSec, i = Math.floor(u) % n, j = (i + 1) % n, f = smooth(u - Math.floor(u));
      const dd = (((dir[j] as number) - (dir[i] as number) + 540) % 360) - 180; // the short way round, also across the wrap
      const fo = (force[i] as number) + ((force[j] as number) - (force[i] as number)) * f;
      return {
        visKm: (vis[i] as number) + ((vis[j] as number) - (vis[i] as number)) * f,
        windDeg: (((dir[i] as number) + dd * f) % 360 + 360) % 360,
        force: fo,
        sea: Math.min(8, fo * 0.9),
        seaState: Math.min(8, Math.round(fo * 0.9)),
      };
    },
  };
}

/** Share of the surfaced top speed the sea allows: 1 in a calm sea, `stormMinFactor` at sea state 8 (linear in between). */
export const seaSpeedFactor = (b: Balance, seaState: number): number => {
  const w = b.weather, x = Math.max(0, Math.min(1, (seaState - w.calmSeaState) / (8 - w.calmSeaState)));
  return 1 - (1 - w.stormMinFactor) * x;
};

/** Share of the normal ASDIC lock rate a rough sea leaves: 1 when calm, `asdicMinFactor` at sea state 8 (spray and clutter hide the boat from the pinging escort). */
export const asdicSeaFactor = (b: Balance, seaState: number): number => {
  const w = b.weather, x = Math.max(0, Math.min(1, (seaState - w.calmSeaState) / (8 - w.calmSeaState)));
  return 1 - (1 - w.asdicMinFactor) * x;
};

/** Escorts see a surfaced boat best in clear air: 0 in fog, 1 in the clearest weather. */
export const clearness = (b: Balance, visKm: number): number => Math.max(0, Math.min(1, (visKm - b.weather.minVisKm) / (b.weather.maxVisKm - b.weather.minVisKm)));
