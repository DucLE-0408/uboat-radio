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
  readonly sonar: {
    readonly alphaDbPerKm: number; readonly seaNoiseBase: number; readonly seaNoisePerState: number;
    readonly selfNoiseBase: number; readonly selfNoisePerKnot: number;
    readonly cavitationSpeedKn: number; readonly cavitationDb: number;
    readonly detectThresholdDb: number; readonly bearingErrorK: number;
    readonly bearingErrorMinDeg: number; readonly bearingErrorMaxDeg: number;
    readonly asdicRangeM: number; readonly asdicLockPerSec: number; readonly asdicSpeedFactorKn: number;
    readonly kinds: Readonly<Record<"merchant" | "escort" | "uboat", {
      readonly shaftRps: Range; readonly blades: number; readonly srcLevelDb: Range;
    }>>;
    readonly classBands: { readonly merchantMaxHz: number; readonly escortMinHz: number };
  };
  readonly boat: {
    readonly maxSpeedSurfaceKn: number; readonly maxSpeedDivedKn: number; readonly turnRateDegPerSec: number;
    readonly accelKnPerSec: number; readonly periscopeDepthM: number; readonly diveDepthM: number;
    readonly maxDepthM: number; readonly descentMps: number; readonly ascentMps: number;
    readonly antennaExposure: { readonly surface: number; readonly periscope: number; readonly dive: number };
    readonly hull: number; readonly depthChargeDamage: number; readonly depthChargeLethalRadiusM: number;
    readonly depthChargeDropDepthM: number; readonly torpedoes: number;
    readonly radioSelfNoisePerKnotDb: number;
  };
}

// Vietnamese: data-driven balance — mọi tunable nằm trong data/balance.json, không hard-code trong logic.
export const BALANCE: Balance = raw as Balance;
