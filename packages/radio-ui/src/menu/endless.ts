// Endless configuration and high scores (G4). Own storage keys, never part of the save; everything read back is untrusted and validated.
import { defaultOptions, MODULE_NAMES, parseOptions, type WatchOptions } from "@uboat/sim-core";
import type { StorageLike } from "../sim/session";

export const ENDLESS_KEY = "uboat-radio.endless.v1";
export const SCORES_KEY = "uboat-radio.endless.scores.v1";
const MAX_BYTES = 4096, MAX_SCORES = 60;

/** Last Endless configuration the player used (defaults: all six modules on, normal). Invalid or missing => defaults. */
export function loadEndlessOptions(storage: StorageLike | null): WatchOptions {
  try {
    const raw = storage?.getItem(ENDLESS_KEY) ?? null;
    if (raw !== null && raw.length <= MAX_BYTES) { const o = parseOptions({ ...(JSON.parse(raw) as object), mode: "endless" }); if (o !== null) return o; }
  } catch { /* unreadable storage or JSON */ }
  return defaultOptions("endless");
}
export function saveEndlessOptions(storage: StorageLike | null, o: WatchOptions): boolean {
  if (storage === null) return false;
  try { storage.setItem(ENDLESS_KEY, JSON.stringify(o)); return true; } catch { return false; }
}

/** Scores are kept per (difficulty, module set): an easy set never competes with the full one. */
export const scoreLabel = (o: WatchOptions): string => `${o.difficulty}:${MODULE_NAMES.map((m) => (o.modules[m] ? "1" : "0")).join("")}`;

export interface EndlessScore { readonly correct: number; readonly streak: number; readonly ration: number; readonly survivedSec: number }
const int = (x: unknown, lo: number, hi: number): number | null => (typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi ? x : null);

export function loadScores(storage: StorageLike | null): Record<string, EndlessScore> {
  const out: Record<string, EndlessScore> = {};
  try {
    const raw = storage?.getItem(SCORES_KEY) ?? null;
    if (raw === null || raw.length > MAX_BYTES * 4) return out;
    const j = JSON.parse(raw) as unknown;
    if (typeof j !== "object" || j === null || Array.isArray(j)) return out;
    for (const [k, v] of Object.entries(j).slice(0, MAX_SCORES)) {
      if (!/^(easy|normal|hard):[01]{6,7}$/.test(k) || typeof v !== "object" || v === null) continue;
      const r = v as Record<string, unknown>, c = int(r["correct"], 0, 100000), s = int(r["streak"], 0, 100000), ra = int(r["ration"], -100000, 100000), t = int(r["survivedSec"], 0, 10_000_000);
      if (c !== null && s !== null && ra !== null && t !== null) out[k] = { correct: c, streak: s, ration: ra, survivedSec: t };
    }
  } catch { /* nothing usable */ }
  return out;
}
/** Keeps the best of each field for this (difficulty, modules); returns the previous best (null if none) and whether storage accepted it. */
export function recordScore(storage: StorageLike | null, o: WatchOptions, s: EndlessScore): { previous: EndlessScore | null; saved: boolean } {
  const all = loadScores(storage), key = scoreLabel(o), prev = all[key] ?? null;
  all[key] = prev === null ? s : { correct: Math.max(prev.correct, s.correct), streak: Math.max(prev.streak, s.streak), ration: Math.max(prev.ration, s.ration), survivedSec: Math.max(prev.survivedSec, s.survivedSec) };
  try { storage?.setItem(SCORES_KEY, JSON.stringify(all)); return { previous: prev, saved: storage !== null }; } catch { return { previous: prev, saved: false }; }
}
