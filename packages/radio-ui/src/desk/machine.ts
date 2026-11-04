// Desk cipher machine (G2, R4.3–R4.7): pure state, no DOM. Everything the windows and the lampboard show is a function of
// (day key, the 4 letters the player set, the copy typed so far) so Backspace, reload and replay cannot desynchronise it.
// Vietnamese: máy giả lập chỉ là "cách tính" hiển thị; bản rõ cuối cùng vẫn do decipherCopy (qua Watch.decipher) quyết định.
import { Enigma, dayEnigma, validPlugboard } from "@uboat/sim-core";

export const GROUP = 4;
export const WHEELS = 4; // Greek, left, middle, right (M4 order, same as the indicator)
const LETTER = /^[A-Z]{4}$/;

export const isPositions = (s: unknown): s is string => typeof s === "string" && LETTER.test(s);

export interface MachineView {
  /** What the 4 windows show now: after the last typed key, or the start of the next group right after a Space. */
  readonly window: string;
  /** Lamp lit by the last typed key (the enciphered/deciphered letter), or null when nothing is typed or after a Space. */
  readonly lamp: string | null;
  /** The letters the machine produced for the whole copy (the same as decipherCopy's plain text, minus the check letter). */
  readonly plain: string;
}

/**
 * Replays `copy` through the machine exactly like `decipherCopy` does: the rotors step per key (odometer with the double-step,
 * the Greek wheel never steps) and are reset to the start of group k at every Vierergruppe boundary, so a short or long group
 * only damages itself and the groups after it keep their own start positions.
 * `dropCheck` removes a trailing one-letter word (the check letter, which decipherCopy does not decipher).
 */
export function replayCopy(seed: number | string, day: number, start: string, copy: string, dropCheck = false, plugboard?: readonly string[]): MachineView {
  if (!isPositions(start)) throw new RangeError("start must be 4 letters A-Z");
  const day0 = dayEnigma(seed, day);
  const base = plugboard === undefined ? day0 : { ...day0, plugboard }; // G3: the plugboard the player wired (undefined = the day key, as in G2)
  const words = copy.split(/\s+/).filter((w) => w.length > 0);
  if (dropCheck) { const last = words[words.length - 1]; if (last !== undefined && last.length === 1 && /[A-Z]/.test(last)) words.pop(); }
  const groups = words.reduce((n, w) => n + Math.ceil(w.length / GROUP), 0);
  const ref = new Enigma({ ...base, positions: start });
  const startPos: string[] = [];
  for (let i = 0; i <= groups; i++) { startPos.push(ref.getPositions()); ref.process("AAAA"); }
  const m = new Enigma({ ...base, positions: start });
  let plain = "", lamp: string | null = null, gi = 0, window = start;
  for (const w of words) {
    for (let k = 0; k < w.length; k += GROUP) {
      m.setPositions(startPos[gi] as string);
      for (const ch of w.slice(k, k + GROUP)) { lamp = m.press(/[A-Z]/.test(ch) ? ch : "A"); plain += lamp; } // '?' keeps the rotor in step
      window = m.getPositions();
      gi++;
    }
  }
  const atBoundary = copy.length > 0 && /\s$/.test(copy);
  if (words.length === 0) return { window: start, lamp: null, plain };
  if (atBoundary) return { window: startPos[gi] as string, lamp: null, plain };
  return { window, lamp, plain };
}

export interface MachineState { readonly power: boolean; readonly cover: boolean; readonly pos: string; readonly plugs?: readonly string[] }
export const MACHINE_DEFAULT: MachineState = { power: false, cover: false, pos: "AAAA", plugs: [] };

/** Switches, cover and the 4 letters the player dialled in. Methods return false when the real machine would refuse. */
export class DeskMachine {
  power = false;
  cover = false;
  private letters: number[] = [0, 0, 0, 0];
  /** Plug pairs the player wired (G3); the day key is on the Orders and is NOT applied for them. */
  private pairs: string[] = [];

  constructor(s: MachineState = MACHINE_DEFAULT) { this.load(s); }

  load(s: MachineState): void {
    this.power = s.power && !s.cover; // a stored state with the cover open and the power on cannot exist
    this.cover = s.cover;
    this.letters = isPositions(s.pos) ? [...s.pos].map((c) => c.charCodeAt(0) - 65) : [0, 0, 0, 0];
    this.pairs = s.plugs !== undefined && validPlugboard(s.plugs) ? [...s.plugs] : [];
  }
  state(): MachineState { return { power: this.power, cover: this.cover, pos: this.positions, plugs: [...this.pairs] }; }
  get plugboard(): readonly string[] { return this.pairs; }
  /** Partner of `ch` on the board, or null. */
  partnerOf(ch: string): string | null { const p = this.pairs.find((q) => q.includes(ch)); return p === undefined ? null : (p[0] === ch ? p[1] : p[0]) as string; }
  /** Wire two letters (cover open only; both free, distinct, at most 10 pairs). */
  plug(a: string, b: string): boolean {
    if (!this.cover || !/^[A-Z]$/.test(a) || !/^[A-Z]$/.test(b) || a === b || this.partnerOf(a) !== null || this.partnerOf(b) !== null || this.pairs.length >= 10) return false;
    this.pairs.push(a < b ? a + b : b + a);
    return true;
  }
  /** Pull the plug on `ch` (and its partner). */
  unplug(ch: string): boolean {
    if (!this.cover) return false;
    const n = this.pairs.length;
    this.pairs = this.pairs.filter((q) => !q.includes(ch));
    return this.pairs.length !== n;
  }
  clearPlugs(): boolean { if (!this.cover || this.pairs.length === 0) return false; this.pairs = []; return true; }
  get positions(): string { return this.letters.map((n) => String.fromCharCode(65 + n)).join(""); }

  /** The keyboard works only with the power on and the cover shut. */
  get keysLive(): boolean { return this.power && !this.cover; }

  setPower(on: boolean): boolean {
    if (on && this.cover) return false; // the interlock: no power with the rotor cover open
    this.power = on;
    return true;
  }
  /** Rotors are reachable only while the machine is off. */
  openCover(): boolean { if (this.power) return false; this.cover = true; return true; }
  closeCover(): void { this.cover = false; }

  /** One notch of the mouse wheel (or an arrow key) on wheel `i`; only with the cover open. */
  rotate(i: number, delta: number): boolean {
    if (!this.cover || !Number.isInteger(i) || i < 0 || i >= WHEELS || !Number.isInteger(delta)) return false;
    this.letters[i] = (((this.letters[i] as number) + delta) % 26 + 26) % 26;
    return true;
  }
  /** Keyboard path: type the letter you want on wheel `i`. */
  setLetter(i: number, ch: string): boolean {
    if (!this.cover || !Number.isInteger(i) || i < 0 || i >= WHEELS || !/^[A-Z]$/.test(ch)) return false;
    this.letters[i] = ch.charCodeAt(0) - 65;
    return true;
  }
}
