// Endless pacing (G4). Pure functions of the balance table and the message index n (0-based); the Watch draws jitter and the
// forged/genuine coin from derive(seed, "endless", n), so a replay produces the same stream.
import type { Balance } from "./balance";
import type { Difficulty } from "./options";

const D = (b: Balance, d: Difficulty): Balance["endless"]["difficulties"][Difficulty] => b.endless.difficulties[d];

/** Seconds between message n and message n+1 (before jitter): shrinks geometrically down to a floor. */
export const gapSec = (b: Balance, d: Difficulty, n: number): number => Math.max(D(b, d).gapMin, D(b, d).gap0 * Math.pow(D(b, d).gapDecay, n));
/** Probability that message n is a forgery: rises linearly up to a cap. */
export const forgedProbability = (b: Balance, d: Difficulty, n: number): number => Math.min(D(b, d).pForgedMax, D(b, d).pForged0 + D(b, d).pForgedStep * n);
/** Hand-over deadline of message n (seconds of sim time): shrinks down to a floor. */
export const deadlineSec = (b: Balance, d: Difficulty, n: number): number => Math.max(D(b, d).deadlineMin, D(b, d).deadline0 - D(b, d).deadlineStep * n);
