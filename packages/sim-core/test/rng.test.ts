import { describe, it, expect } from "vitest";
import { derive, fnv1a, Rng } from "../src/rng";

describe("rng", () => {
  it("fnv1a known vectors", () => {
    expect(fnv1a("")).toBe(0x811c9dc5);
    expect(fnv1a("a")).toBe(0xe40c292c);
    expect(fnv1a("foobar")).toBe(0xbf9cf968);
  });
  it("is deterministic and in [0,1)", () => {
    const a = new Rng(42), b = new Rng(42);
    for (let i = 0; i < 1000; i++) {
      const x = a.next();
      expect(x).toBe(b.next());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it("derive: same path equal, different path independent, no concat collision", () => {
    expect(derive(1, "HQ", 3).next()).toBe(derive(1, "HQ", 3).next());
    expect(derive(1, "HQ").next()).not.toBe(derive(1, "PACK").next());
    expect(derive(1, "a", "bc").next()).not.toBe(derive(1, "ab", "c").next());
  });
  it("shuffle is a permutation and does not mutate input", () => {
    const src = Array.from({ length: 26 }, (_, i) => i);
    const out = derive(7, "s").shuffle(src);
    expect([...out].sort((x, y) => x - y)).toEqual(src);
    expect(src[0]).toBe(0);
  });
  it("int is roughly uniform", () => {
    const r = new Rng(9), c = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) c[r.int(10)]++;
    for (const n of c) expect(Math.abs(n - 2000)).toBeLessThan(250);
  });
});
