// Passive sonar / hydrophone model. SNR = SL - TL - NL. ASDIC ping is a discrete event for the Bridge.
import { BALANCE, type Balance } from "./balance";
import type { SimEvent } from "./events";
import { type Rng } from "./rng";
import { asdicSeaFactor } from "./weather";

export type ContactKind = "merchant" | "escort" | "uboat" | "asdic";

/** Contact as the sim defines it. Passive sonar never reveals rangeM; it is ground truth. */
export interface Contact {
  readonly id: number;
  readonly bearing: number; // deg, 0 = north, clockwise
  readonly rangeM: number;
  readonly kind: ContactKind;
  readonly shaftRps: number;
  readonly blades: number;
  readonly srcLevelDb: number;
}

export interface Track {
  readonly id: number;
  readonly kind: "merchant" | "escort" | "uboat";
  x: number; // m
  y: number; // m
  readonly courseDeg: number;
  readonly speedMs: number;
  readonly shaftRps: number;
  readonly blades: number;
  readonly srcLevelDb: number;
}

export interface Listener {
  readonly x: number;
  readonly y: number;
  readonly speedKn: number;
}

export const bladeRateHz = (c: { shaftRps: number; blades: number }): number => c.shaftRps * c.blades;

export function transmissionLossDb(rangeM: number, b: Balance = BALANCE): number {
  const r = Math.max(1, rangeM);
  return 20 * Math.log10(r) + (b.sonar.alphaDbPerKm * r) / 1000;
}

export function seaNoiseDb(seaState: number, b: Balance = BALANCE): number {
  return b.sonar.seaNoiseBase + b.sonar.seaNoisePerState * seaState;
}

/** Own-ship noise: grows with speed, steps up past the cavitation speed. */
export function selfNoiseDb(speedKn: number, b: Balance = BALANCE): number {
  const s = b.sonar;
  return s.selfNoiseBase + s.selfNoisePerKnot * speedKn + (speedKn > s.cavitationSpeedKn ? s.cavitationDb : 0);
}

/** Total noise level: powers add, not dB. */
export function noiseLevelDb(seaState: number, speedKn: number, b: Balance = BALANCE): number {
  const n = 10 ** (seaNoiseDb(seaState, b) / 10) + 10 ** (selfNoiseDb(speedKn, b) / 10);
  return 10 * Math.log10(n);
}

export function rangeAndBearing(l: Listener, t: { x: number; y: number }): { rangeM: number; bearing: number } {
  const dx = t.x - l.x, dy = t.y - l.y;
  return { rangeM: Math.hypot(dx, dy), bearing: ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360 };
}

export function snrDb(tr: Track, l: Listener, seaState: number, b: Balance = BALANCE): number {
  const { rangeM } = rangeAndBearing(l, tr);
  return tr.srcLevelDb - transmissionLossDb(rangeM, b) - noiseLevelDb(seaState, l.speedKn, b);
}

/** Vietnamese: sai số hướng tỉ lệ nghịch với SNR (SNR cao => hướng chính xác), có chặn trên/dưới. */
export function bearingSigmaDeg(snr: number, b: Balance = BALANCE): number {
  const s = b.sonar;
  return Math.min(s.bearingErrorMaxDeg, Math.max(s.bearingErrorMinDeg, s.bearingErrorK / Math.max(snr, 1)));
}

/** How far away a source of `srcLevelDb` is just audible, in km, given the sea and our own speed. Our own capability only: it says nothing about where anyone is. */
export function detectRangeKm(srcLevelDb: number, seaState: number, speedKn: number, b: Balance = BALANCE): number {
  const budget = srcLevelDb - noiseLevelDb(seaState, speedKn, b) - b.sonar.detectThresholdDb;
  let lo = 0.001, hi = 200; // transmissionLossDb grows with range, so the margin falls monotonically: bisect
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (transmissionLossDb(mid * 1000, b) > budget) hi = mid; else lo = mid; }
  return lo;
}

export type BladeClass = "escort" | "slow"; // "slow" = merchant OR U-boat (rates overlap on purpose)

export function classifyBladeRate(rateHz: number, b: Balance = BALANCE): BladeClass {
  return rateHz >= b.sonar.classBands.escortMinHz ? "escort" : "slow";
}

export interface Observation {
  readonly id: number;
  readonly bearingDeg: number; // measured, noisy
  readonly snrDb: number;
  readonly bladeRateHz: number; // measured, noisy
  readonly guess: BladeClass;
}

// Irwin-Hall(3) ~ Gaussian with sd 1 after scaling; keeps the draw count fixed (3) => replay-safe.
function gauss(rng: Rng): number {
  return (rng.next() + rng.next() + rng.next() - 1.5) * 2;
}

export class SonarField {
  private readonly tracks: Track[] = [];

  add(t: Track): void {
    this.tracks.push(t);
  }

  getTracks(): readonly Track[] {
    return this.tracks;
  }

  contacts(l: Listener): Contact[] {
    return this.tracks.map((t) => {
      const rb = rangeAndBearing(l, t);
      return { id: t.id, bearing: rb.bearing, rangeM: rb.rangeM, kind: t.kind, shaftRps: t.shaftRps, blades: t.blades, srcLevelDb: t.srcLevelDb };
    });
  }

  /** What the operator actually hears this instant. One fixed-size draw block per audible track. */
  observe(l: Listener, seaState: number, rng: Rng, b: Balance = BALANCE): Observation[] {
    const out: Observation[] = [];
    for (const t of this.tracks) {
      const snr = snrDb(t, l, seaState, b);
      if (snr < b.sonar.detectThresholdDb) continue;
      const sigma = bearingSigmaDeg(snr, b);
      const rb = rangeAndBearing(l, t);
      const rate = bladeRateHz(t) * (1 + (gauss(rng) * 0.1) / Math.max(1, snr / 5));
      const bearingDeg = (rb.bearing + gauss(rng) * sigma + 360) % 360;
      out.push({ id: t.id, bearingDeg, snrDb: snr, bladeRateHz: rate, guess: classifyBladeRate(rate, b) });
    }
    return out;
  }

  /**
   * Fixed-step update: move tracks, then let escorts in range try for an ASDIC lock.
   * A ping means the boat is LOCKED; the Bridge is alerted immediately (see boat.ts).
   */
  tick(dtSec: number, tSec: number, l: Listener, rng: Rng, b: Balance = BALANCE, seaState?: number): SimEvent[] {
    const out: SimEvent[] = [];
    for (const t of this.tracks) {
      const a = (t.courseDeg * Math.PI) / 180;
      t.x += Math.sin(a) * t.speedMs * dtSec;
      t.y += Math.cos(a) * t.speedMs * dtSec;
      if (t.kind !== "escort") continue;
      const rb = rangeAndBearing(l, t);
      if (rb.rangeM > b.sonar.asdicRangeM) continue;
      const rate = b.sonar.asdicLockPerSec * (1 + l.speedKn / b.sonar.asdicSpeedFactorKn) * (seaState === undefined ? 1 : asdicSeaFactor(b, seaState));
      if (rng.chance(1 - Math.exp(-rate * dtSec))) {
        out.push({ type: "ASDIC_PING", tSec, contactId: t.id, bearingDeg: rb.bearing, rangeM: rb.rangeM });
      }
    }
    return out;
  }
}
