// Element-level Morse channel. Tokens: '.' '-' '_' (letter gap) '/' (word gap).
import type { Balance } from "./balance";
import { BALANCE } from "./balance";
import type { Rng } from "./rng";

const TABLE: Readonly<Record<string, string>> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
};
const REVERSE: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(TABLE).map(([k, v]) => [v, k]));

/** Words separated by spaces; unknown characters are rejected. */
export function encode(text: string): string {
  return text
    .toUpperCase()
    .split(" ")
    .filter((w) => w.length > 0)
    .map((w) =>
      [...w].map((ch) => {
        const m = TABLE[ch];
        if (m === undefined) throw new RangeError(`no morse for '${ch}'`);
        return m;
      }).join("_"),
    )
    .join("/");
}

/** Unmatched sequences decode to '?'. */
export function decode(tokens: string): string {
  return tokens
    .split("/")
    .map((w) => w.split("_").filter((l) => l.length > 0).map((l) => REVERSE[l] ?? "?").join(""))
    .join(" ");
}

export function noiseProbability(snrDb: number, jam: number, b: Balance = BALANCE): number {
  const m = b.morse;
  return Math.min(m.pMax, m.pBase + m.pSnr * Math.exp(-snrDb / m.snrScale) + m.pJam * jam);
}

/**
 * Corrupt a token stream. One RNG draw order per element => deterministic replays.
 * flip: dit<->dah, drop: element lost, crash: spurious element, spuriousGap: premature letter gap.
 * Gaps may vanish ('_' removed => letters merge; '/' degrades to '_').
 */
export function applyNoise(tokens: string, snrDb: number, jam: number, rng: Rng, b: Balance = BALANCE): string {
  const p = noiseProbability(snrDb, jam, b);
  const r = b.morse.errorRatios;
  const total = r.flip + r.drop + r.crash + r.spuriousGap;
  let out = "";
  for (const t of tokens) {
    if (t === "_" || t === "/") {
      if (rng.chance(p * b.morse.gapVanishFactor)) {
        if (t === "/") out += "_";
        continue;
      }
      out += t;
      continue;
    }
    if (!rng.chance(p)) { out += t; continue; }
    const x = rng.next() * total;
    if (x < r.flip) out += t === "." ? "-" : ".";
    else if (x < r.flip + r.drop) { /* element dropped */ }
    else if (x < r.flip + r.drop + r.crash) out += t + (rng.chance(0.5) ? "." : "-");
    else out += t + "_";
  }
  return out;
}

export interface Fist {
  readonly wpm: number;
  readonly dahRatio: number;
  readonly gapStretch: number;
  readonly jitter: number;
}

export function randomFist(rng: Rng, b: Balance = BALANCE): Fist {
  const lerp = (r: { min: number; max: number }): number => r.min + rng.next() * (r.max - r.min);
  return {
    wpm: Math.round(lerp(b.morse.wpmRange)),
    dahRatio: lerp(b.fist.dahRatio),
    gapStretch: lerp(b.fist.gapStretch),
    jitter: lerp(b.fist.jitter),
  };
}

/** Normalized distance between two fists; the physical tell for forged traffic. */
export function fistDistance(a: Fist, b: Fist): number {
  return 0.5 * Math.abs(a.wpm - b.wpm) / 10
    + 0.3 * Math.abs(a.dahRatio - b.dahRatio) / 0.5
    + 0.2 * Math.abs(a.gapStretch - b.gapStretch) / 0.3;
}

export interface Segment { readonly tone: boolean; readonly ms: number }

/**
 * Timing plan (unit = 1200/wpm ms). `cosmeticRng` MUST be a separate stream from the sim RNG
 * so audio jitter never desyncs replays. Presentation schedules these on the audio clock.
 */
export function schedule(tokens: string, fist: Fist, cosmeticRng: Rng): Segment[] {
  const unit = 1200 / fist.wpm;
  const j = (ms: number): number => Math.max(1, ms * (1 + (cosmeticRng.next() * 2 - 1) * fist.jitter));
  const segs: Segment[] = [];
  let prevElement = false;
  for (const t of tokens) {
    if (t === "." || t === "-") {
      if (prevElement) segs.push({ tone: false, ms: j(unit) });
      segs.push({ tone: true, ms: j(unit * (t === "." ? 1 : fist.dahRatio)) });
      prevElement = true;
    } else {
      segs.push({ tone: false, ms: j(unit * (t === "_" ? 3 : 7) * fist.gapStretch) });
      prevElement = false;
    }
  }
  return segs;
}
