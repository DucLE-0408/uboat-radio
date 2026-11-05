// Ration score (G2, R10.1–R10.2, R10.4). Pure. +1 for every key that matches the Input sheet the player can SEE, -1 for every
// other key (the score may go negative); never compares with the hidden truth. Each copy position scores once, so Backspace and
// retyping cannot farm points. A completion bonus is paid once per mission step per message. Stored in desk.v1, not in the save.

export const MISSION_STEPS = ["printed", "decoded", "echo", "outStamp", "signed", "clipped", "handed"] as const;
export type MissionStep = (typeof MISSION_STEPS)[number];
/** Ration paid the first time a step is done for a message; finishing all seven pays COMPLETE on top. */
export const STEP_BONUS: Readonly<Record<MissionStep, number>> = { printed: 0, decoded: 2, echo: 3, outStamp: 3, signed: 2, clipped: 1, handed: 5 };
export const COMPLETE_BONUS = 5;

export interface RationState {
  readonly score: number;
  /** "rx:attempt" -> number of copy positions already scored. */
  readonly scored: Readonly<Record<string, number>>;
  /** rx id -> bitmask of mission steps already paid. */
  readonly bonus: Readonly<Record<string, number>>;
}
export const RATION_EMPTY: RationState = { score: 0, scored: {}, bonus: {} };

const SCORE_LIM = 100_000, COPY_MAX = 400, MAX_KEYS = 200;

/** Per-position colour of the typed copy: "g" matches the printed Input, "r" does not (or was typed ahead of the printer). */
export function copyMarks(input: string, printed: number, copy: string): string {
  let m = "";
  for (let i = 0; i < copy.length; i++) m += i < printed && i < input.length && copy[i] === input[i] ? "g" : "r";
  return m;
}

/** Scores the positions of `copy` not scored yet for this attempt. Returns the new state (same object when nothing changed). */
export function scoreCopy(s: RationState, key: string, input: string, printed: number, copy: string): RationState {
  const from = s.scored[key] ?? 0, to = Math.min(copy.length, COPY_MAX);
  if (to <= from) return s;
  const marks = copyMarks(input, printed, copy);
  let d = 0;
  for (let i = from; i < to; i++) d += marks[i] === "g" ? 1 : -1;
  if (!(key in s.scored) && Object.keys(s.scored).length >= MAX_KEYS) return s; // bounded storage: a flood of attempts stops scoring
  return { score: Math.max(-SCORE_LIM, Math.min(SCORE_LIM, s.score + d)), scored: { ...s.scored, [key]: to }, bonus: s.bonus };
}

/** Pays the steps in `done` that were not paid for this message yet. */
export function awardSteps(s: RationState, rxId: number, done: Readonly<Record<MissionStep, boolean>>): RationState {
  const id = String(rxId), had = s.bonus[id] ?? 0;
  let mask = had, d = 0;
  MISSION_STEPS.forEach((k, i) => { if (done[k] && (had & (1 << i)) === 0) { mask |= 1 << i; d += STEP_BONUS[k]; } });
  if (mask === had) return s;
  if (!(id in s.bonus) && Object.keys(s.bonus).length >= MAX_KEYS) return s;
  if (had !== (1 << MISSION_STEPS.length) - 1 && mask === (1 << MISSION_STEPS.length) - 1) d += COMPLETE_BONUS;
  return { score: Math.max(-SCORE_LIM, Math.min(SCORE_LIM, s.score + d)), scored: s.scored, bonus: { ...s.bonus, [id]: mask } };
}

/** G3 (R8): each citation costs rations; the citation count itself belongs to the sim. */
export const CITATION_PENALTY = 10;
export function penalize(s: RationState, citations: number): RationState {
  if (citations <= 0) return s;
  return { score: Math.max(-SCORE_LIM, s.score - CITATION_PENALTY * citations), scored: s.scored, bonus: s.bonus };
}

/** G4: a reply HQ could read pays rations (the sim reports it; the score stays the desk's). */
export const SEND_REWARD = 20;
export function reward(s: RationState, n: number): RationState {
  if (n <= 0) return s;
  return { score: Math.min(SCORE_LIM, s.score + SEND_REWARD * n), scored: s.scored, bonus: s.bonus };
}

/** G5: reaching an ordered position pays, missing the deadline costs (the sim also takes a resupply point). */
export const MOVE_REWARD = 30, MOVE_PENALTY = 25;
export const GROUND_PENALTY = 20; // G5 coast: running aground costs rations (the sim takes hull and raises Intel)
export function adjust(s: RationState, delta: number): RationState {
  if (delta === 0) return s;
  return { score: Math.max(-SCORE_LIM, Math.min(SCORE_LIM, s.score + delta)), scored: s.scored, bonus: s.bonus };
}

const int = (x: unknown, lo: number, hi: number): number | null => (typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi ? x : null);

/** Validates a stored ration (untrusted). Anything malformed yields the empty state; single bad entries are dropped. */
export function parseRation(x: unknown): RationState {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return RATION_EMPTY;
  const o = x as Record<string, unknown>, score = int(o["score"], -SCORE_LIM, SCORE_LIM);
  if (score === null) return RATION_EMPTY;
  const scored: Record<string, number> = {}, bonus: Record<string, number> = {};
  const sc = o["scored"], bo = o["bonus"];
  if (typeof sc === "object" && sc !== null && !Array.isArray(sc)) {
    for (const [k, v] of Object.entries(sc).slice(0, MAX_KEYS)) { const n = int(v, 0, COPY_MAX); if (/^\d{1,6}:\d{1,3}$/.test(k) && n !== null) scored[k] = n; }
  }
  if (typeof bo === "object" && bo !== null && !Array.isArray(bo)) {
    for (const [k, v] of Object.entries(bo).slice(0, MAX_KEYS)) { const n = int(v, 0, (1 << MISSION_STEPS.length) - 1); if (/^\d{1,6}$/.test(k) && n !== null) bonus[k] = n; }
  }
  return { score, scored, bonus };
}
