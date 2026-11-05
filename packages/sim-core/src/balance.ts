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
  /** G5: seabed depth (a slope off the coast plus seeded shoals), warning margins and the hull cost of touching bottom. */
  readonly seabed: {
    readonly maxM: number; readonly slopeKm: number;
    readonly shoals: { readonly count: number; readonly spreadKm: number; readonly minRadiusKm: number; readonly maxRadiusKm: number; readonly minLiftM: number; readonly maxLiftM: number };
    readonly draftM: number; readonly clearanceM: number; readonly warnUnderKeelM: number; readonly rearmUnderKeelM: number; readonly bottomHull: number;
    /** Depth charges over a shallow bottom: they burst `dropAboveFloorM` above it (never shallower than `minDropM`), and the bottom throws the blast back (`reflectMult`) when under `reflectUnderKeelM` is left under the keel. */
    readonly reflectMult: number; readonly reflectUnderKeelM: number; readonly minDropM: number; readonly dropAboveFloorM: number;
  };
  /** G5: the coast (the land columns on the east edge): warning distance, hull damage on grounding, how far off it Endless starts, margins for ordered cells and Orders items. */
  readonly coast: { readonly warnKm: number; readonly groundHull: number; readonly clearKm: number; readonly endlessStartKm: number; readonly moveMarginKm: number; readonly itemMarginKm: number };
  /** G5: movement orders (distance to the ordered cell, deadline arithmetic, arrival radius) and dead-reckoning drift. */
  readonly move: { readonly chance: number; readonly minKm: number; readonly maxKm: number; readonly assumedKn: number; readonly marginFactor: number; readonly arriveKm: number };
  readonly nav: { readonly driftPerKm: number; readonly baseErrKm: number };
  /** G4: Endless pacing per difficulty, replies the player sends, Private Message pacing, crew roster. */
  readonly endless: { readonly maxPending: number; readonly difficulties: Readonly<Record<"easy" | "normal" | "hard", {
    readonly gap0: number; readonly gapDecay: number; readonly gapMin: number;
    readonly pForged0: number; readonly pForgedStep: number; readonly pForgedMax: number;
    readonly deadline0: number; readonly deadlineStep: number; readonly deadlineMin: number;
  }>> };
  readonly send: { readonly wpm: number; readonly maxChars: number; readonly maxPending: number };
  readonly pm: { readonly gapSec: number; readonly capCount: number; readonly capWindowSec: number; readonly longTxStepSec: number };
  readonly roster: { readonly absentHullAt: number; readonly names: readonly string[] };
  /** G3 (desk UI): paperwork citations. Counts are the running number of citations in one watch. */
  readonly paper: {
    readonly deadlineSec: number;
    readonly warnUntil: number; readonly locatedAt: number; readonly severeAt: number; readonly executeAt: number;
    readonly lostAt: readonly number[];
    /** Enemy strike after a citation: how well they know the position, and how soon the escort and its depth charge arrive. */
    readonly located: { readonly positionKnown: number; readonly reactSec: Range; readonly etaSec: Range };
    readonly severe: { readonly positionKnown: number; readonly reactSec: Range; readonly etaSec: Range };
    readonly items: { readonly safeCoords: number; readonly resupply: number; readonly rangeKm: number };
  };
  readonly watch: {
    readonly durationSec: number; readonly startMin: number; readonly originKm: { readonly x: number; readonly y: number };
    readonly freqKhz: number; readonly seaState: number; readonly rxSnrDb: number; readonly jam: number;
    readonly startIntelScore: number; readonly repeatDelaySec: Range; readonly repeatTxSec: number;
    readonly challengeTxSec: number; readonly ackTxSec: number; readonly challengeReplySec: Range;
    readonly sonarPeriodSec: number;
    readonly merchant: { readonly rangeM: number; readonly speedMs: number };
    readonly ambush: { readonly rangeM: number; readonly speedMs: number };
    readonly messages: readonly { readonly atSec: number; readonly forged: boolean }[];
  };
}

// Vietnamese: data-driven balance — mọi tunable nằm trong data/balance.json, không hard-code trong logic.
export const BALANCE: Balance = raw as Balance;
