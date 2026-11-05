// Pure helpers for the sonar drawer: signal strength bands and the listening-conditions readout. No DOM.
import { BALANCE, detectRangeKm, seaNoiseDb, selfNoiseDb, type Balance } from "@uboat/sim-core";

/** 1 faint, 2 clear, 3 strong. A coarse band of the measured SNR: it hints at closeness but gives no range. */
export const strengthLevel = (snrDb: number): 1 | 2 | 3 => (snrDb < 6 ? 1 : snrDb < 14 ? 2 : 3);

export type Verdict = "good" | "fair" | "poor";
export interface Conditions {
  readonly selfDb: number; readonly seaDb: number; readonly seaState: number;
  /** How far a typical merchant is audible now, and at a standstill in this sea (km, whole). */
  readonly rangeKm: number; readonly bestKm: number;
  readonly verdict: Verdict;
  readonly cavitating: boolean;
  /** Our own noise is what limits the hearing (so slowing down helps). */
  readonly selfLimited: boolean;
}

/** Listening conditions from our own speed and the sea state (the reported one, else the default). Our capability only: nothing about where anyone is. */
export function conditions(speedKn: number, reportedSea: number | null, b: Balance = BALANCE): Conditions {
  const k = b.sonar.kinds.merchant.srcLevelDb, src = (k.min + k.max) / 2;
  const seaState = reportedSea ?? b.watch.seaState;
  const rangeKm = detectRangeKm(src, seaState, speedKn, b), bestKm = detectRangeKm(src, seaState, 0, b);
  const ratio = bestKm > 0 ? rangeKm / bestKm : 0;
  const selfDb = selfNoiseDb(speedKn, b), seaDb = seaNoiseDb(seaState, b);
  return {
    selfDb: Math.round(selfDb), seaDb: Math.round(seaDb), seaState, rangeKm: Math.round(rangeKm), bestKm: Math.round(bestKm),
    verdict: ratio >= 0.85 ? "good" : ratio >= 0.5 ? "fair" : "poor",
    cavitating: speedKn > b.sonar.cavitationSpeedKn,
    selfLimited: selfDb > seaDb,
  };
}

/** The ASDIC banner shows for this long after a ping (UI only). */
export const ASDIC_BANNER_SEC = 40;
/** History kept for the bearing trace (seconds) and the cap on stored points. */
export const HIST_SEC = 600;
export const HIST_MAX = 1500;
