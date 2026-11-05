// Seabed depth (G5). Deterministic from the seed: a slope that deepens with the distance from the coast, plus a few shoals (cones that
// lift the bottom). Only watches with options use it; the chart (and the Helm) show the SURVEYED depth, the sim uses the same function.
import type { Balance } from "./balance";
import { coastKm } from "./messages";
import { derive } from "./rng";

export interface Shoal { readonly xKm: number; readonly yKm: number; readonly radiusKm: number; readonly liftM: number }
export interface Seabed {
  readonly shoals: readonly Shoal[];
  /** Water depth in metres at a world position (km); 0 on or beyond the coast. */
  depthAt(xKm: number, yKm: number): number;
}

/** How a depth charge behaves over a floor `floorM` deep when the boat is at `depthM` (G5): where it bursts and how hard the bottom reflects it. */
export function chargeEffect(b: Balance, floorM: number, depthM: number): { readonly dropM: number; readonly mult: number; readonly shallow: boolean } {
  const base = b.boat.depthChargeDropDepthM, s = b.seabed;
  const dropM = Math.min(base, Math.max(s.minDropM, floorM - s.dropAboveFloorM));
  return { dropM, mult: floorM - depthM < s.reflectUnderKeelM ? s.reflectMult : 1, shallow: floorM < base };
}

export function makeSeabed(seed: number | string, b: Balance, origin: { readonly x: number; readonly y: number }): Seabed {
  const r = derive(seed, "seabed"), s = b.seabed, coast = coastKm(b);
  const shoals: Shoal[] = [];
  for (let i = 0; i < s.shoals.count; i++) {
    const radiusKm = s.shoals.minRadiusKm + r.next() * (s.shoals.maxRadiusKm - s.shoals.minRadiusKm);
    shoals.push({
      xKm: Math.min(coast - radiusKm - 2, origin.x - s.shoals.spreadKm + r.next() * 2 * s.shoals.spreadKm),
      yKm: origin.y - s.shoals.spreadKm + r.next() * 2 * s.shoals.spreadKm,
      radiusKm, liftM: s.shoals.minLiftM + r.next() * (s.shoals.maxLiftM - s.shoals.minLiftM),
    });
  }
  return {
    shoals,
    depthAt(x: number, y: number): number {
      if (x >= coast) return 0;
      let d = Math.min(s.maxM, (s.maxM * (coast - x)) / s.slopeKm);
      for (const h of shoals) { const dist = Math.hypot(x - h.xKm, y - h.yKm); if (dist < h.radiusKm) d -= h.liftM * (1 - dist / h.radiusKm); }
      return Math.max(0, d);
    },
  };
}
