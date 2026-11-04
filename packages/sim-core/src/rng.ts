// Deterministic PRNG. The ONLY source of randomness in the sim core.
// NOTE (multiplayer): replace `derive` with HMAC-SHA256/HKDF keyed by a server-side campaign secret.

/** FNV-1a 32-bit over UTF-8 bytes. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  // Manual UTF-8: core must not depend on DOM/Node globals.
  const bytes: number[] = [];
  for (const ch of input) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** mulberry32: uniform float in [0, 1). */
  next(): number {
    // Vietnamese: toàn bộ phép toán phải giữ ở uint32 để kết quả giống nhau trên mọi engine.
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    if (!Number.isInteger(n) || n <= 0) throw new RangeError(`Rng.int: bad bound ${n}`);
    return Math.floor(this.next() * n);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError("Rng.pick: empty");
    return items[this.int(items.length)] as T;
  }

  /** Fisher-Yates; returns a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j] as T, a[i] as T];
    }
    return a;
  }

  /** Serializable state, for snapshots/replay checkpoints. */
  getState(): number {
    return this.state;
  }
}

export type SeedPath = ReadonlyArray<string | number>;

/**
 * Independent stream per path. HQ and boat derive identical tables from the same
 * seed + path (pre-shared secret model). Separator \u0000 prevents ("a","bc") == ("ab","c").
 */
export function derive(seed: number | string, ...path: SeedPath): Rng {
  const key = [String(seed), ...path.map(String)].join("\u0000");
  return new Rng(fnv1a(key));
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  return rng.shuffle(items);
}
