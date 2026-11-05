// G6 enemy radar: patrol windows as a pure function of (seed, time). Like the weather, the schedule is drawn once from a dedicated
// stream, so no RNG state advances during the watch. It models "a radar is on the air that could see a surfaced boat", not where anyone is.
import type { Balance } from "./balance";
import { derive } from "./rng";

export interface RadarWindow {
  readonly start: number; readonly end: number;
  /** When the Metox warning sounds (start minus its lead), or null when the receiver misses this window. */
  readonly warnAt: number | null;
}

export interface Radar {
  /** The window that is (or is about to be, within its warning lead) relevant at `tSec`, with its start and end shifted into the current cycle; null in a quiet gap. */
  at(tSec: number): { readonly index: number; readonly cycle: number; readonly window: RadarWindow; readonly active: boolean } | null;
}

export function makeRadar(seed: number | string, b: Balance): Radar {
  const c = b.radar, r = derive(seed, "radar"), wins: RadarWindow[] = [];
  let t = c.firstGapSec;
  const range = (x: { readonly min: number; readonly max: number }): number => x.min + r.next() * (x.max - x.min);
  for (let i = 0; i < c.windowCount; i++) {
    const len = range(c.windowSec), lead = range(c.warnLeadSec), warned = r.next() < c.metoxReliability; // fixed draws per window: the schedule never depends on a choice
    wins.push({ start: t, end: t + len, warnAt: warned ? Math.max(0, t - lead) : null });
    t += len + range(c.gapSec);
  }
  const period = t; // the schedule repeats, so a very long Endless watch never runs out
  return {
    at(tSec: number) {
      const cycle = Math.floor(Math.max(0, tSec) / period), u = Math.max(0, tSec) - cycle * period;
      for (let i = 0; i < wins.length; i++) {
        const w = wins[i] as RadarWindow;
        if (u >= w.end) continue;
        const lo = w.warnAt === null ? w.start : w.warnAt;
        if (u < lo) return null; // before this window's lead: a quiet gap
        const off = cycle * period;
        return { index: i, cycle, window: { start: w.start + off, end: w.end + off, warnAt: w.warnAt === null ? null : w.warnAt + off }, active: u >= w.start };
      }
      return null;
    },
  };
}

/** Share of the radar hazard left by the sea clutter: 1 up to the calm sea state, `seaMinFactor` at sea state 8. */
export const radarSeaFactor = (b: Balance, seaState: number): number => {
  const w = b.weather, x = Math.max(0, Math.min(1, (seaState - w.calmSeaState) / (8 - w.calmSeaState)));
  return 1 - (1 - b.radar.seaMinFactor) * x;
};

/** The enemy gets better radar as the watch goes on: grows by `eraGrowthPerHour` per hour up to `eraCap`. */
export const radarEra = (b: Balance, tSec: number): number => Math.min(b.radar.eraCap, 1 + (b.radar.eraGrowthPerHour * Math.max(0, tSec)) / 3600);
