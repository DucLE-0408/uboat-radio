// Radio traffic pipeline: plaintext -> Enigma M4 -> Vierergruppen -> check letter -> Morse, and the way back.
// Pure functions of (seed, day, message): HQ and the boat derive the same day key (pre-shared secret model).
import { checkGroup, type AuthTable } from "./auth";
import { Enigma, normalize, type EnigmaConfig } from "./enigma";
import { decode, encode } from "./morse";
import type { Message, Tell, WorldCtx } from "./messages";
import { verifyTells } from "./messages";
import { derive } from "./rng";

const L = (i: number): string => String.fromCharCode(65 + i);
const GROUP = 4;

const RIGHT_ROTORS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

/** Day key: everything except the per-message start position (the indicator). */
export function dayEnigma(seed: number | string, day: number): Omit<EnigmaConfig, "positions"> {
  const r = derive(seed, "enigma", day);
  const rotors = r.shuffle(RIGHT_ROTORS).slice(0, 3) as [typeof RIGHT_ROTORS[number], typeof RIGHT_ROTORS[number], typeof RIGHT_ROTORS[number]];
  const letters = r.shuffle(Array.from({ length: 26 }, (_, i) => L(i)));
  const plugboard: string[] = [];
  for (let i = 0; i < 10; i++) plugboard.push((letters[2 * i] as string) + (letters[2 * i + 1] as string));
  return {
    reflector: r.chance(0.5) ? "B" : "C",
    rotors: [r.chance(0.5) ? "Beta" : "Gamma", rotors[0], rotors[1], rotors[2]],
    rings: "A" + L(r.int(26)) + L(r.int(26)) + L(r.int(26)),
    plugboard,
  };
}

/** Message key sent in the clear (like the real indicator). Reusing one is an Intel leak (see Intel.indicator). */
export function messageIndicator(seed: number | string, id: number, attempt = 0): string {
  const r = derive(seed, "indicator", id, attempt);
  return [0, 1, 2, 3].map(() => L(r.int(26))).join("");
}

export interface Transmission {
  readonly indicator: string;
  readonly groups: readonly string[]; // Vierergruppen of ciphertext
  readonly checkLetter: string; // sent in the clear after the last group
  readonly tokens: string; // clean Morse, before the channel noise
}

/** Pad with X so every group is full; the receiver strips nothing (trailing X is part of the plaintext). */
function padGroups(plain: string): string {
  const rem = plain.length % GROUP;
  return rem === 0 ? plain : plain + "X".repeat(GROUP - rem);
}

function splitGroups(text: string): string[] {
  return text.match(new RegExp(`.{1,${GROUP}}`, "g")) ?? [];
}

export function buildTransmission(
  seed: number | string, day: number, msg: Message, indicator: string, checkLetter: string,
): Transmission {
  const cfg = { ...dayEnigma(seed, day), positions: indicator };
  const cipher = new Enigma(cfg).process(padGroups(normalize(msg.plain)));
  const groups = splitGroups(cipher);
  return { indicator, groups, checkLetter, tokens: encode([...groups, checkLetter].join(" ")) };
}

/**
 * The check letter an honest sender computes (what a forger must guess without the table).
 * Computed over the PADDED plaintext: that is exactly what the receiver's machine prints.
 */
export function trueCheckLetter(table: AuthTable, from: string, plain: string): string {
  return checkGroup(table, from, padGroups(normalize(plain)));
}

/** What the operator copies off the key: letters, spaces between groups, '?' for unreadable characters. */
export function copyFromTokens(tokens: string): string {
  return decode(tokens);
}

export interface Deciphered {
  readonly plain: string;
  /** Check letter as received; null when the last word is not a single readable letter. */
  readonly checkLetter: string | null;
  /** Number of groups whose length was not 4 (damage that a resync could not repair). */
  readonly damagedGroups: number;
}

/**
 * Decipher a copy. Vietnamese: máy Enigma bước theo từng phím, nên mất/thừa một ký tự là lệch toàn bộ phần sau.
 * Ta đặt lại rotor ở đầu mỗi Vierergruppe (điểm đồng bộ lại) nên lỗi chỉ lan trong nhóm hỏng.
 * Nhóm >4 ký tự (khoảng trống bị nuốt) bị cắt thành các nhóm 4 và chiếm thêm chỉ số nhóm => lệch tiếp.
 */
export function decipherCopy(seed: number | string, day: number, indicator: string, copy: string, plugboard?: readonly string[]): Deciphered {
  const day0 = dayEnigma(seed, day);
  const base = plugboard === undefined ? day0 : { ...day0, plugboard }; // G3: the player wires the plugboard; omitted = the day key (P5/classic)
  const words = copy.trim().split(/\s+/).filter((w) => w.length > 0);
  let checkLetter: string | null = null;
  const last = words[words.length - 1];
  if (last !== undefined && last.length === 1 && /[A-Z]/.test(last)) {
    checkLetter = last;
    words.pop();
  }

  const reference = new Enigma({ ...base, positions: indicator });
  const startPos: string[] = [];
  const total = Math.max(words.reduce((n, w) => n + Math.ceil(w.length / GROUP), 0), 1);
  for (let i = 0; i < total + 1; i++) {
    startPos.push(reference.getPositions());
    reference.process("AAAA");
  }

  const machine = new Enigma({ ...base, positions: indicator });
  let plain = "";
  let gi = 0;
  let damaged = 0;
  for (const w of words) {
    const chunks = splitGroups(w);
    if (w.length !== GROUP) damaged++;
    for (const chunk of chunks) {
      machine.setPositions(startPos[gi] as string);
      for (const ch of chunk) plain += machine.press(/[A-Z]/.test(ch) ? ch : "A"); // '?' keeps the rotor in step
      gi++;
    }
  }
  return { plain, checkLetter, damagedGroups: damaged };
}

/**
 * Encipher a reply for sending (G4): padded with X to whole groups of 4, the rotors restart at every group start exactly as
 * `decipherCopy` does, so `decipherCopy(encipherGroups(x)).plain` is the padded `x`. The player's own plugboard may be given.
 */
export function encipherGroups(seed: number | string, day: number, indicator: string, plain: string, plugboard?: readonly string[]): string {
  const day0 = dayEnigma(seed, day);
  const base = plugboard === undefined ? day0 : { ...day0, plugboard };
  const text = normalize(plain);
  const padded = text + "X".repeat((GROUP - (text.length % GROUP)) % GROUP);
  const ref = new Enigma({ ...base, positions: indicator });
  const m = new Enigma({ ...base, positions: indicator });
  const out: string[] = [];
  for (let i = 0; i < padded.length; i += GROUP) {
    m.setPositions(ref.getPositions());
    out.push(m.process(padded.slice(i, i + GROUP)));
    ref.process("AAAA");
  }
  return out.join(" ");
}

/** Does the received check letter match the deciphered plaintext? (false for garble OR forgery) */
export function checkLetterMatches(table: AuthTable, from: string, d: Deciphered): boolean {
  if (d.checkLetter === null) return false;
  return trueCheckLetter(table, from, d.plain) === d.checkLetter;
}

const DIGITS = "EINS|ZWO|DREI|VIER|FUENF|SECHS|SIEBEN|ACHT|NEUN";
const GRID_RE = new RegExp(`X([A-Z]{2})X(${DIGITS})X(${DIGITS})X`);
const DIGIT_OF: Readonly<Record<string, string>> = {
  EINS: "1", ZWO: "2", DREI: "3", VIER: "4", FUENF: "5", SECHS: "6", SIEBEN: "7", ACHT: "8", NEUN: "9",
};

/** Read the grid reference spelled in an ORDER/REPORT body ("XABXEINSXZWOX"), or null if it is unreadable. */
export function extractGrid(plain: string): string | null {
  const m = GRID_RE.exec(plain);
  if (!m) return null;
  return (m[1] as string) + (DIGIT_OF[m[2] as string] as string) + (DIGIT_OF[m[3] as string] as string);
}

export interface RxHeader {
  readonly from: string;
  readonly sentAtMin: number;
  readonly txFist: Message["txFist"];
  readonly dfBearingDeg: number;
}

/**
 * Tells a careful operator can establish from observables alone: header (callsign, DTG, fist, DF bearing)
 * plus the grid read out of the deciphered text. No ground truth involved.
 */
export function assessTells(h: RxHeader, plain: string, ctx: WorldCtx): Tell[] {
  const grid = extractGrid(plain);
  const msg: Message = {
    id: 0, kind: plain.startsWith("NAVIGATIONSBEFEHL") ? "MOVE" : "ORDER", net: "HQ", from: h.from, to: "ALL", sentAtMin: h.sentAtMin,
    claimedGrid: grid ?? "AA11", plain, txFist: h.txFist, dfBearingDeg: h.dfBearingDeg,
  };
  // Without a readable position the grid/bearing checks are meaningless; fist and DTG still stand.
  return verifyTells(msg, ctx).filter((t) => grid !== null || (t !== "grid" && t !== "bearing"));
}
