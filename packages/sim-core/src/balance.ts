import raw from "../data/balance.json";

export interface Range { readonly min: number; readonly max: number }

export interface Balance {
  readonly morse: {
    readonly pBase: number; readonly pSnr: number; readonly snrScale: number; readonly pJam: number; readonly pMax: number;
    readonly errorRatios: { readonly flip: number; readonly drop: number; readonly crash: number; readonly spuriousGap: number };
    readonly gapVanishFactor: number;
    readonly wpmRange: Range;
  };
  readonly fist: {
    readonly dahRatio: Range; readonly gapStretch: Range; readonly jitter: Range;
    readonly measureNoise: number; readonly mismatchThreshold: number; readonly forgedMinDistance: number;
  };
  readonly world: {
    readonly cols: number; readonly rows: number; readonly cellKm: number;
    readonly landCols: readonly number[]; readonly maxMessageAgeMin: number;
  };
  readonly df: {
    readonly measureNoiseDeg: number; readonly toleranceDeg: number;
    readonly forgedMinErrorDeg: number; readonly minRangeKm: number;
  };
  readonly intel: {
    readonly thresholds: readonly number[]; readonly perTxSecond: number; readonly repeatedPattern: number;
    readonly reusedIndicator: number; readonly lostCodebook: number; readonly decayPerMin: number;
    readonly level3KnownFraction: Range;
  };
  readonly detection: {
    readonly windowSec: number; readonly refTxSec: number; readonly hazardPerSecAtRef: number;
    readonly intelHazardStep: number; readonly cooldownSec: number; readonly reactionSec: Range;
    readonly escortDistanceKm: Range; readonly escortSpeedKmh: number;
  };
}

// Vietnamese: data-driven balance — mọi tunable nằm trong data/balance.json, không hard-code trong logic.
export const BALANCE: Balance = raw as Balance;
