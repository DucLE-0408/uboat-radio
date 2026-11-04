// Enigma M4 (Kriegsmarine). Steps once per keypress => a dropped/inserted character
// desyncs everything after it; Vierergruppen are the resync points.

export type RotorName = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII";
export type GreekName = "Beta" | "Gamma";
export type ReflectorName = "B" | "C"; // thin reflectors

interface RotorDef {
  readonly wiring: string;
  readonly notches: string;
}

const ROTORS: Readonly<Record<RotorName | GreekName, RotorDef>> = {
  I: { wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ", notches: "Q" },
  II: { wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE", notches: "E" },
  III: { wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO", notches: "V" },
  IV: { wiring: "ESOVPZJAYQUIRHXLNFTGKDCMWB", notches: "J" },
  V: { wiring: "VZBRGITYUPSDNHLXAWMJQOFECK", notches: "Z" },
  VI: { wiring: "JPGVOUMFYQBENHZRDKASXLICTW", notches: "ZM" },
  VII: { wiring: "NZJHGRCXMYSWBOUFAIVLPEKQDT", notches: "ZM" },
  VIII: { wiring: "FKQHTLXOCBJSPDZRAMEWNIUYGV", notches: "ZM" },
  Beta: { wiring: "LEYJVCNIXWPBQMDRTAKZGFUHOS", notches: "" },
  Gamma: { wiring: "FSOKANUERHMBTIYCWLQPZXVGJD", notches: "" },
};

const REFLECTORS: Readonly<Record<ReflectorName, string>> = {
  B: "ENKQAUYWJICOPBLMDXZVFTHRGS",
  C: "RDOBJNTKVEHMLFCWZAXGYIPSUQ",
};

/** Plain-data config (serialization-friendly). Rotor order: greek, left, middle, right. */
export interface EnigmaConfig {
  readonly reflector: ReflectorName;
  readonly rotors: readonly [GreekName, RotorName, RotorName, RotorName];
  readonly rings: string; // 4 letters, e.g. "AAAV"
  readonly positions: string; // 4 letters, message key
  readonly plugboard: readonly string[]; // pairs, e.g. ["AT","BL"]
}

const A = 65;
const code = (c: string): number => c.charCodeAt(0) - A;

function invert(wiring: string): number[] {
  const inv = new Array<number>(26).fill(0);
  for (let i = 0; i < 26; i++) inv[code(wiring[i] as string)] = i;
  return inv;
}

export class Enigma {
  private readonly fwd: number[][];
  private readonly bwd: number[][];
  private readonly notches: Set<number>[];
  private readonly refl: number[];
  private readonly ring: number[];
  private readonly plug: number[];
  private pos: number[];

  constructor(cfg: EnigmaConfig) {
    if (!/^[A-Z]{4}$/.test(cfg.rings) || !/^[A-Z]{4}$/.test(cfg.positions)) {
      throw new RangeError("rings/positions must be 4 letters A-Z");
    }
    if (new Set(cfg.rotors).size !== 4) throw new RangeError("rotors must be distinct");
    this.fwd = cfg.rotors.map((r) => [...ROTORS[r].wiring].map(code));
    this.bwd = cfg.rotors.map((r) => invert(ROTORS[r].wiring));
    this.notches = cfg.rotors.map((r) => new Set([...ROTORS[r].notches].map(code)));
    this.refl = [...REFLECTORS[cfg.reflector]].map(code);
    this.ring = [...cfg.rings].map(code);
    this.pos = [...cfg.positions].map(code);
    this.plug = Array.from({ length: 26 }, (_, i) => i);
    for (const pair of cfg.plugboard) {
      if (!/^[A-Z]{2}$/.test(pair)) throw new RangeError(`bad plug pair ${pair}`);
      const a = code(pair[0] as string);
      const b = code(pair[1] as string);
      if (a === b || this.plug[a] !== a || this.plug[b] !== b) throw new RangeError(`bad plug pair ${pair}`);
      this.plug[a] = b;
      this.plug[b] = a;
    }
  }

  getPositions(): string {
    return this.pos.map((p) => String.fromCharCode(A + p)).join("");
  }

  /** Resync point: set rotor positions (Vierergruppe restart). */
  setPositions(positions: string): void {
    if (!/^[A-Z]{4}$/.test(positions)) throw new RangeError("positions must be 4 letters");
    this.pos = [...positions].map(code);
  }

  // Vietnamese: indices 0=Greek, 1=trái, 2=giữa, 3=phải. Greek + reflector không bao giờ quay.
  private step(): void {
    const [, , m, r] = this.pos as [number, number, number, number];
    const rightAtNotch = (this.notches[3] as Set<number>).has(r);
    const midAtNotch = (this.notches[2] as Set<number>).has(m);
    // Double-stepping: rotor giữa ở notch sẽ tự quay VÀ kéo rotor trái, dù rotor phải không ở notch.
    if (midAtNotch) {
      this.pos[1] = ((this.pos[1] as number) + 1) % 26;
      this.pos[2] = (m + 1) % 26;
    } else if (rightAtNotch) {
      this.pos[2] = (m + 1) % 26;
    }
    this.pos[3] = (r + 1) % 26;
  }

  private through(table: number[][], i: number, c: number): number {
    const p = this.pos[i] as number;
    const r = this.ring[i] as number;
    const shift = (p - r + 26) % 26;
    return (((table[i] as number[])[(c + shift) % 26] as number) - shift + 26) % 26;
  }

  /** Encipher one letter A-Z (steps first, as the real machine). */
  press(letter: string): string {
    if (!/^[A-Z]$/.test(letter)) throw new RangeError(`not A-Z: ${letter}`);
    this.step();
    let c = this.plug[code(letter)] as number;
    for (let i = 3; i >= 0; i--) c = this.through(this.fwd, i, c);
    c = this.refl[c] as number;
    for (let i = 0; i <= 3; i++) c = this.through(this.bwd, i, c);
    return String.fromCharCode(A + (this.plug[c] as number));
  }

  /** Encipher/decipher; non A-Z characters are rejected (caller normalizes). */
  process(text: string): string {
    let out = "";
    for (const ch of text) out += this.press(ch);
    return out;
  }
}

/** Format into 4-letter groups (Vierergruppen). */
export function toGroups(text: string, size = 4): string {
  return (text.match(new RegExp(`.{1,${size}}`, "g")) ?? []).join(" ");
}

export function normalize(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, "");
}
