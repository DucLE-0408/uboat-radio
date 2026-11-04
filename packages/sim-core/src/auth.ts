// Authentication: per-net/per-day Latin squares, challenge-reply (single-use cells), check group, keybook.
import { derive, type Rng } from "./rng";
import type { Net } from "./messages";

export type AuthTable = readonly (readonly string[])[]; // 26x26 of letters, a Latin square

const L = (i: number): string => String.fromCharCode(65 + i);
const idx = (c: string): number => c.charCodeAt(0) - 65;

/**
 * Vietnamese: Latin square 26x26 = bảng cộng cyclic (i+j) mod 26, sau đó hoán vị hàng, cột và ký hiệu.
 * Các phép hoán vị bảo toàn tính chất Latin (mỗi hàng/cột chứa đủ 26 chữ, không lặp).
 */
export function buildLatinSquare(rng: Rng): AuthTable {
  const base = Array.from({ length: 26 }, (_, i) => i);
  const rows = rng.shuffle(base), cols = rng.shuffle(base), sym = rng.shuffle(base);
  return rows.map((r) => cols.map((c) => L(sym[(r + c) % 26] as number)));
}

/** HQ and boat derive the identical table from the same seed (pre-shared secret model). */
export function authTable(seed: number | string, net: Net, day: number): AuthTable {
  return buildLatinSquare(derive(seed, "auth", net, day));
}

export function isLatinSquare(t: AuthTable): boolean {
  for (let i = 0; i < 26; i++) {
    if (new Set(t[i]).size !== 26) return false;
    if (new Set(t.map((r) => r[i])).size !== 26) return false;
  }
  return true;
}

export function lookup(t: AuthTable, row: string, col: string): string {
  return (t[idx(row)] as readonly string[])[idx(col)] as string;
}

export function checksum(plain: string): number {
  let s = 0;
  for (const ch of plain) s += idx(ch);
  return s % 26;
}

/** Final group of a message: table[callsign[0]][checksum(plaintext) mod 26]. */
export function checkGroup(t: AuthTable, callsign: string, plain: string): string {
  return lookup(t, callsign[0] as string, L(checksum(plain)));
}

export interface Challenge { readonly row: string; readonly col: string }
export type ChallengeResult = "ok" | "wrong" | "replay";

/** Each cell may be used once per (net, day) — anti-replay. */
export class ChallengeLedger {
  private readonly used = new Set<string>();

  constructor(private readonly table: AuthTable) {}

  issue(rng: Rng): Challenge {
    if (this.used.size >= 26 * 26) throw new Error("ledger exhausted");
    for (;;) {
      const row = L(rng.int(26)), col = L(rng.int(26));
      if (!this.used.has(row + col)) return { row, col };
    }
  }

  /** Burns the cell on ANY answer (right or wrong) so brute-forcing a cell is impossible. */
  verify(ch: Challenge, reply: string): ChallengeResult {
    const key = ch.row + ch.col;
    if (this.used.has(key)) return "replay";
    this.used.add(key);
    return lookup(this.table, ch.row, ch.col) === reply ? "ok" : "wrong";
  }

  usedCells(): string[] {
    return [...this.used].sort();
  }
}

/** Date-gated, destroyable book of per-day tables for one net. */
export class Keybook {
  private destroyed = false;

  constructor(private readonly seed: number | string, readonly net: Net) {}

  /** Cannot open day N before day N. Throws once the book is destroyed (ink dissolved). */
  open(day: number, today: number): AuthTable {
    if (this.destroyed) throw new Error("keybook destroyed");
    if (day > today) throw new RangeError(`day ${day} is sealed until day ${day} (today ${today})`);
    return authTable(this.seed, this.net, day);
  }

  destroy(): void {
    this.destroyed = true;
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }
}
