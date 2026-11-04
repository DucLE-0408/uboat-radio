import { describe, it, expect } from "vitest";
import { applyNoise, decode, encode, fistDistance, noiseProbability, randomFist, schedule } from "../src/morse";
import { derive } from "../src/rng";

describe("morse", () => {
  it("encode/decode round-trips A-Z 0-9 and words", () => {
    const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 SOS";
    expect(decode(encode(t))).toBe(t);
    expect(encode("AB C")).toBe(".-_-.../-.-.");
  });
  it("unmatched sequence -> ?", () => { expect(decode("......._.-")).toBe("?A"); });
  it("rejects unsupported characters", () => { expect(() => encode("A#")).toThrow(); });
  it("noise probability formula and cap", () => {
    expect(noiseProbability(100, 0)).toBeCloseTo(0.002, 4);
    expect(noiseProbability(-50, 1)).toBe(0.5);
    expect(noiseProbability(6, 0)).toBeCloseTo(0.002 + 0.25 * Math.exp(-1), 6);
  });
  it("noise is deterministic per seed and clean at high SNR", () => {
    const tok = encode("ANGRIFF KONVOI");
    expect(applyNoise(tok, 100, 0, derive(1, "n"))).toBe(applyNoise(tok, 100, 0, derive(1, "n")));
    expect(applyNoise(tok, 60, 0, derive(1, "n"))).toBe(tok);
  });
  it("error rate tracks p", () => {
    const tok = encode("EEEEEEEEEEEEEEEEEEEE").replace(/_/g, "");
    let changed = 0; const N = 2000; const r = derive(5, "n");
    for (let i = 0; i < N; i++) if (applyNoise(tok, 0, 0.5, r) !== tok) changed++;
    expect(changed / N).toBeGreaterThan(0.9); // p ~ 0.45/element over 20 elements
  });
  it("noisy decode degrades with jamming", () => {
    const tok = encode("UNTERWASSER GEDRUECKT");
    const ok = (jam: number): number => { let n = 0; const r = derive(3, "n", jam); for (let i = 0; i < 300; i++) if (decode(applyNoise(tok, 10, jam, r)) === "UNTERWASSER GEDRUECKT") n++; return n; };
    expect(ok(0)).toBeGreaterThan(ok(0.8));
  });
  it("schedule: unit = 1200/wpm, cosmetic rng isolated from sim rng", () => {
    const f = { wpm: 20, dahRatio: 3, gapStretch: 1, jitter: 0 };
    const s = schedule(".-", f, derive(1, "cos"));
    expect(s.map((x) => x.ms)).toEqual([60, 60, 180]);
    const sim = derive(2, "sim"); const before = sim.getState();
    schedule("...", { ...f, jitter: 0.1 }, derive(9, "cos"));
    expect(sim.getState()).toBe(before);
  });
  it("fist distance is zero for identical, symmetric", () => {
    const a = randomFist(derive(1, "a")), b = randomFist(derive(1, "b"));
    expect(fistDistance(a, a)).toBe(0);
    expect(fistDistance(a, b)).toBeCloseTo(fistDistance(b, a), 12);
  });
});
