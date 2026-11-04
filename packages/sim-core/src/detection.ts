// Allied HF/DF: detection grows with cumulative transmit time on a frequency inside a sliding window.
// Fixed timestep, one RNG, no wall-clock => deterministic.
import { BALANCE, type Balance } from "./balance";
import type { SimEvent } from "./events";
import type { Rng } from "./rng";

export interface TxState {
  readonly freqKhz: number;
}

export interface Exposure {
  /** 0..1 antenna exposure: surface 1, periscope ~0.6, submerged 0 (cannot be heard). */
  readonly exposure: number;
  readonly intelLevel: number;
}

interface Pending { readonly atSec: number; readonly event: SimEvent }

export class HfdfDetector {
  private readonly buckets = new Map<number, Map<number, number>>(); // freq -> (second -> tx seconds)
  private readonly pending: Pending[] = [];
  private cooldownUntil = -Infinity;
  private t = 0;

  constructor(private readonly rng: Rng, private readonly b: Balance = BALANCE) {}

  /** Cumulative transmit seconds on freq in the sliding window ending now. */
  cumulativeTx(freqKhz: number): number {
    const m = this.buckets.get(freqKhz);
    if (!m) return 0;
    let s = 0;
    for (const [sec, v] of m) if (sec > this.t - this.b.detection.windowSec) s += v;
    return s;
  }

  /** Per-second hazard. Vietnamese: tăng theo bình phương thời gian phát tích lũy => báo cáo dài bị phạt nặng. */
  hazard(freqKhz: number, ex: Exposure): number {
    const d = this.b.detection;
    const ratio = this.cumulativeTx(freqKhz) / d.refTxSec;
    return d.hazardPerSecAtRef * ratio * ratio * (1 + d.intelHazardStep * ex.intelLevel) * ex.exposure;
  }

  /** Advance by dtSec (fixed step). Returns events emitted during this tick. */
  tick(dtSec: number, tx: TxState | null, ex: Exposure): SimEvent[] {
    const out: SimEvent[] = [];
    const d = this.b.detection;
    this.t += dtSec;

    if (tx) {
      let m = this.buckets.get(tx.freqKhz);
      if (!m) { m = new Map(); this.buckets.set(tx.freqKhz, m); }
      const sec = Math.floor(this.t);
      m.set(sec, (m.get(sec) ?? 0) + dtSec);
      for (const k of m.keys()) if (k <= this.t - d.windowSec) m.delete(k);

      if (this.t >= this.cooldownUntil) {
        // P(detect in dt) = 1 - exp(-h dt); one draw per tick keeps the RNG stream tick-count deterministic.
        const p = 1 - Math.exp(-this.hazard(tx.freqKhz, ex) * dtSec);
        if (this.rng.chance(p)) {
          this.cooldownUntil = this.t + d.cooldownSec;
          out.push({ type: "HFDF_FIX", tSec: this.t, freqKhz: tx.freqKhz, cumulativeTxSec: this.cumulativeTx(tx.freqKhz) });
          const react = d.reactionSec.min + this.rng.next() * (d.reactionSec.max - d.reactionSec.min);
          const dist = d.escortDistanceKm.min + this.rng.next() * (d.escortDistanceKm.max - d.escortDistanceKm.min);
          const travel = (dist / d.escortSpeedKmh) * 3600;
          this.pending.push({ atSec: this.t + react, event: { type: "ESCORT_DISPATCHED", tSec: this.t + react, etaSec: travel } });
          this.pending.push({ atSec: this.t + react + travel, event: { type: "DEPTH_CHARGE", tSec: this.t + react + travel } });
        }
      }
    }

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i] as Pending;
      if (p.atSec <= this.t) { out.push(p.event); this.pending.splice(i, 1); }
    }
    out.sort((a, b) => a.tSec - b.tSec);
    return out;
  }

  /**
   * A fix forced from outside (G3 citation): the enemy already knows roughly where the boat is, so the escort and its depth
   * charge come on a short fixed schedule (a bounded ETA, not the usual distance draw). Deterministic: draws from the
   * detector's own stream at a tick boundary.
   */
  forceFix(freqKhz: number, react: { readonly min: number; readonly max: number }, eta: { readonly min: number; readonly max: number }): SimEvent[] {
    this.cooldownUntil = this.t + this.b.detection.cooldownSec;
    const reactSec = react.min + this.rng.next() * (react.max - react.min);
    const travel = eta.min + this.rng.next() * (eta.max - eta.min);
    this.pending.push({ atSec: this.t + reactSec, event: { type: "ESCORT_DISPATCHED", tSec: this.t + reactSec, etaSec: travel } });
    this.pending.push({ atSec: this.t + reactSec + travel, event: { type: "DEPTH_CHARGE", tSec: this.t + reactSec + travel } });
    return [{ type: "HFDF_FIX", tSec: this.t, freqKhz, cumulativeTxSec: this.cumulativeTx(freqKhz) }];
  }

  /** Cancel inbound attack (e.g. boat dived and evaded). Returns number of cancelled events. */
  cancelPending(): number {
    const n = this.pending.length;
    this.pending.length = 0;
    return n;
  }
}
