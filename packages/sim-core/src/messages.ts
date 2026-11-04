// Message generator: genuine orders/reports/weather and forgeries with verifiable tells.
import { BALANCE, type Balance } from "./balance";
import { fistDistance, randomFist, type Fist } from "./morse";
import { derive, type Rng } from "./rng";

export type Net = "HQ" | "PACK" | "WX";
export type Kind = "ORDER" | "REPORT" | "WEATHER";
export type Tell = "fist" | "bearing" | "timestamp" | "grid";

export interface Vec { readonly x: number; readonly y: number } // km

/** Marinequadrat-style reference: col letter, row letter, 2 sub-cell digits (1-9). */
export function gridToPos(grid: string, b: Balance = BALANCE): Vec | null {
  const m = /^([A-Z])([A-Z])([1-9])([1-9])$/.exec(grid);
  if (!m) return null;
  const col = (m[1] as string).charCodeAt(0) - 65;
  const row = (m[2] as string).charCodeAt(0) - 65;
  if (col >= b.world.cols || row >= b.world.rows) return null;
  const sub = b.world.cellKm / 9;
  return {
    x: col * b.world.cellKm + (Number(m[3]) - 0.5) * sub,
    y: row * b.world.cellKm + (Number(m[4]) - 0.5) * sub,
  };
}

export function isLandGrid(grid: string, b: Balance = BALANCE): boolean {
  return b.world.landCols.includes(grid.charCodeAt(0) - 65);
}

/** Bearing in degrees [0,360), 0 = +y (north), clockwise. */
export function bearingDeg(from: Vec, to: Vec): number {
  const d = (Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI;
  return (d + 360) % 360;
}

export function angDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export interface Message {
  readonly id: number;
  readonly kind: Kind;
  readonly net: Net;
  readonly from: string; // claimed sender callsign
  readonly to: string;
  readonly sentAtMin: number; // claimed DTG (minutes of sim time)
  readonly claimedGrid: string;
  readonly plain: string; // A-Z only, words joined by X (Enigma input)
  readonly txFist: Fist; // measured by the operator (observable)
  readonly dfBearingDeg: number; // HF/DF bearing of the true transmitter (observable)
}

/** Ground truth, never shown to the player. */
export interface Truth {
  readonly forged: boolean;
  readonly intelLevel: number | null;
  readonly tells: readonly Tell[];
  readonly surfaceFlaws: readonly ("format" | "callsign")[];
}
export interface Generated { readonly msg: Message; readonly truth: Truth }

export interface WorldCtx {
  readonly ownPos: Vec;
  readonly nowMin: number;
  readonly knownFists: Readonly<Record<string, Fist>>;
  readonly callsigns: readonly string[]; // genuine stations (HQ first)
}

const DIGIT = ["NULL", "EINS", "ZWO", "DREI", "VIER", "FUENF", "SECHS", "SIEBEN", "ACHT", "NEUN"];
export function spell(n: number): string {
  return String(Math.trunc(n)).split("").map((d) => DIGIT[Number(d)] as string).join("X");
}
const spellGrid = (g: string): string => g.slice(0, 2) + "X" + spell(Number(g.slice(2)));

export function makeCallsigns(seed: number | string, n: number): string[] {
  const r = derive(seed, "callsigns");
  const out = ["KDK"]; // HQ
  while (out.length < n) {
    const c = "U" + String.fromCharCode(65 + r.int(26)) + String.fromCharCode(65 + r.int(26));
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

export function makeKnownFists(seed: number | string, callsigns: readonly string[], b: Balance = BALANCE): Record<string, Fist> {
  const out: Record<string, Fist> = {};
  for (const c of callsigns) out[c] = randomFist(derive(seed, "fist", c), b);
  return out;
}

function body(kind: Kind, r: Rng, grid: string): string {
  switch (kind) {
    case "ORDER":
      return ["ANGRIFFSBEFEHL", "KONVOI", spellGrid(grid), "KURS", spell(r.int(360)), "FAHRT", spell(8 + r.int(8)), "KNOTEN"].join("X");
    case "REPORT":
      return ["STANDORT", spellGrid(grid), "TORPEDOS", spell(r.int(14)), "BRENNSTOFF", spell(10 + r.int(90)), "PROZENT"].join("X");
    case "WEATHER":
      return ["WETTER", "WIND", spell(r.int(360)), "STAERKE", spell(1 + r.int(9)), "SEE", spell(r.int(9)), "SICHT", spell(1 + r.int(20))].join("X");
  }
}

const NET_OF: Readonly<Record<Kind, Net>> = { ORDER: "HQ", REPORT: "PACK", WEATHER: "WX" };

function randomGrid(r: Rng, b: Balance, ocean: boolean): string {
  for (;;) {
    const g = String.fromCharCode(65 + r.int(b.world.cols)) + String.fromCharCode(65 + r.int(b.world.rows)) + (1 + r.int(9)) + (1 + r.int(9));
    if (isLandGrid(g, b) !== ocean) return g;
  }
}

function perturbFist(f: Fist, r: Rng, rel: number): Fist {
  const k = (): number => 1 + (r.next() * 2 - 1) * rel;
  return { wpm: f.wpm * k(), dahRatio: f.dahRatio * k(), gapStretch: f.gapStretch * k(), jitter: f.jitter };
}

export function generateGenuine(seed: number | string, id: number, kind: Kind, ctx: WorldCtx, b: Balance = BALANCE): Generated {
  const r = derive(seed, "msg", id);
  const from = kind === "ORDER" ? (ctx.callsigns[0] as string) : (ctx.callsigns[1 + r.int(ctx.callsigns.length - 1)] as string);
  const grid = randomGrid(r, b, true);
  const origin = gridToPos(grid, b) as Vec;
  const msg: Message = {
    id, kind, net: NET_OF[kind], from, to: "ALL",
    sentAtMin: ctx.nowMin - r.int(10),
    claimedGrid: grid,
    plain: body(kind, r, grid),
    txFist: perturbFist(ctx.knownFists[from] as Fist, r, b.fist.measureNoise),
    dfBearingDeg: (bearingDeg(ctx.ownPos, origin) + (r.next() * 2 - 1) * b.df.measureNoiseDeg + 360) % 360,
  };
  return { msg, truth: { forged: false, intelLevel: null, tells: [], surfaceFlaws: [] } };
}

/**
 * Forgery at Allied Intel level 0-4.
 * INVARIANT: at least one verifiable tell (fist / bearing / timestamp / grid) is always
 * injected, even at level 4 (full table, passes auth 100%).
 */
export function generateForgery(seed: number | string, id: number, kind: Kind, intelLevel: number, ctx: WorldCtx, b: Balance = BALANCE): Generated {
  const r = derive(seed, "forge", id);
  const base = generateGenuine(seed, id, kind, ctx, b).msg;
  const flaws: ("format" | "callsign")[] = [];
  let from = base.from;
  let plain = base.plain;
  if (intelLevel === 0) {
    flaws.push("format");
    plain = plain.replace(/X/g, "").slice(0, Math.max(8, plain.length - 6));
  }
  if (intelLevel === 1) {
    flaws.push("callsign");
    // The forged callsign must NOT be a genuine station: otherwise the verifier compares the
    // imitated fist against that station's known fist and reports an un-injected "fist" tell
    // (flaky property failure, e.g. seed 261327 / id 36, where genuine "UZQ" was the old fallback).
    from = "U" + String.fromCharCode(65 + r.int(26)) + "Q";
    for (let i = 0; ctx.callsigns.includes(from) && i < 26; i++) {
      from = "U" + String.fromCharCode(65 + ((from.charCodeAt(1) - 65 + 1) % 26)) + "Q";
    }
  }

  // Vietnamese: số tell giảm dần theo Intel nhưng KHÔNG BAO GIỜ bằng 0 (bất biến forgery).
  // Bearing is only verifiable beyond minRange; otherwise it is not an eligible tell.
  const basePos = gridToPos(base.claimedGrid, b) as Vec;
  const farEnough = Math.hypot(basePos.x - ctx.ownPos.x, basePos.y - ctx.ownPos.y) >= b.df.minRangeKm;
  const pool = r.shuffle<Tell>(farEnough ? ["fist", "bearing", "timestamp", "grid"] : ["fist", "timestamp", "grid"]);
  const count = intelLevel <= 1 ? 3 : intelLevel === 2 ? 2 : 1;
  const tells = pool.slice(0, count);

  // Forger imitates the claimed sender's fist, then a tell is deliberately left in.
  const claimed = ctx.knownFists[base.from] as Fist;
  let txFist = perturbFist(claimed, r, b.fist.measureNoise);
  let dfBearingDeg = base.dfBearingDeg;
  let sentAtMin = base.sentAtMin;
  let claimedGrid = base.claimedGrid;

  for (const t of tells) {
    if (t === "fist") {
      const dir = r.chance(0.5) ? 1 : -1;
      txFist = { ...txFist, wpm: Math.max(5, txFist.wpm + dir * (7 + r.int(5))), dahRatio: txFist.dahRatio + dir * 0.4 };
      if (fistDistance(txFist, claimed) <= b.fist.mismatchThreshold) txFist = { ...txFist, wpm: claimed.wpm + 12 };
    } else if (t === "bearing") {
      // The true transmitter lies in a direction inconsistent with the claimed position.
      const want = bearingDeg(ctx.ownPos, gridToPos(base.claimedGrid, b) as Vec);
      const off = b.df.forgedMinErrorDeg + r.int(100);
      dfBearingDeg = (want + (r.chance(0.5) ? off : -off) + 720) % 360;
    } else if (t === "timestamp") {
      sentAtMin = r.chance(0.5)
        ? ctx.nowMin + 30 + r.int(300)
        : ctx.nowMin - b.world.maxMessageAgeMin - 30 - r.int(600);
    } else {
      const col = b.world.landCols[r.int(b.world.landCols.length)] as number;
      claimedGrid = String.fromCharCode(65 + col) + String.fromCharCode(65 + r.int(b.world.rows)) + (1 + r.int(9)) + (1 + r.int(9));
    }
  }
  const msg: Message = { ...base, from, plain, txFist, dfBearingDeg, sentAtMin, claimedGrid };
  return { msg, truth: { forged: true, intelLevel, tells, surfaceFlaws: flaws } };
}

/**
 * What a careful operator can verify from observables only (no ground truth).
 * Genuine traffic must never trip this (no false positives) — covered by tests.
 */
export function verifyTells(msg: Message, ctx: WorldCtx, b: Balance = BALANCE): Tell[] {
  const found: Tell[] = [];
  const known = ctx.knownFists[msg.from];
  if (known && fistDistance(msg.txFist, known) > b.fist.mismatchThreshold) found.push("fist");
  const pos = gridToPos(msg.claimedGrid, b);
  if (pos === null || isLandGrid(msg.claimedGrid, b)) {
    found.push("grid");
  } else {
    const range = Math.hypot(pos.x - ctx.ownPos.x, pos.y - ctx.ownPos.y);
    if (range >= b.df.minRangeKm && angDiff(bearingDeg(ctx.ownPos, pos), msg.dfBearingDeg) > b.df.toleranceDeg) found.push("bearing");
  }
  if (msg.sentAtMin > ctx.nowMin || msg.sentAtMin < ctx.nowMin - b.world.maxMessageAgeMin) found.push("timestamp");
  return found;
}
