import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateForgery, generateGenuine, makeCallsigns, makeKnownFists, verifyTells, type Kind, type WorldCtx } from "../src/messages";
import { encode } from "../src/morse";

const KINDS: Kind[] = ["ORDER", "REPORT", "WEATHER"];
function ctxFor(seed: number): WorldCtx {
  const callsigns = makeCallsigns(seed, 6);
  return { ownPos: { x: 400 + (seed % 200), y: 900 + (seed % 300) }, nowMin: 5000 + (seed % 1000), knownFists: makeKnownFists(seed, callsigns), callsigns };
}

describe("messages", () => {
  it("genuine plaintext is Enigma/Morse-safe", () => {
    const c = ctxFor(1);
    for (let i = 0; i < 50; i++) {
      const { msg } = generateGenuine(1, i, KINDS[i % 3] as Kind, c);
      expect(msg.plain).toMatch(/^[A-Z]+$/);
      expect(() => encode(msg.plain)).not.toThrow();
    }
  });
  it("generation is deterministic", () => {
    const c = ctxFor(7);
    expect(generateForgery(7, 3, "ORDER", 2, c)).toEqual(generateForgery(7, 3, "ORDER", 2, c));
  });
  it("PROPERTY: genuine traffic never trips verifyTells (no false positives)", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 2 ** 30 }), fc.nat(2), fc.nat(500), (seed, k, id) => {
      const c = ctxFor(seed);
      const { msg } = generateGenuine(seed, id, KINDS[k] as Kind, c);
      expect(verifyTells(msg, c)).toEqual([]);
    }), { numRuns: 3000 });
  });
  it("INVARIANT: every forgery at every Intel level carries >=1 verifiable tell", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 2 ** 30 }), fc.nat(2), fc.nat(4), fc.nat(500), (seed, k, level, id) => {
      const c = ctxFor(seed);
      const { msg, truth } = generateForgery(seed, id, KINDS[k] as Kind, level, c);
      expect(truth.forged).toBe(true);
      expect(truth.tells.length).toBeGreaterThanOrEqual(1);
      const seen = verifyTells(msg, c);
      expect(seen.length).toBeGreaterThanOrEqual(1);
      for (const t of seen) expect(truth.tells).toContain(t); // verifier only flags injected tells
    }), { numRuns: 5000 });
  });
  it("REGRESSION: Intel 1 forged callsign never collides with a genuine station", () => {
    // Counterexample from fast-check flake (~1/17 runs): genuine roster contained "UZQ", the old
    // fallback callsign, so verifyTells flagged an un-injected "fist" tell.
    const cases: [number, number, number][] = [[261327, 0, 36], [1306635, 0, 3], [2161887, 0, 6], [5281973, 0, 11]];
    for (const [seed, k, id] of cases) {
      const c = ctxFor(seed);
      const { msg, truth } = generateForgery(seed, id, KINDS[k] as Kind, 1, c);
      expect(c.callsigns).not.toContain(msg.from);
      for (const t of verifyTells(msg, c)) expect(truth.tells).toContain(t);
      expect(verifyTells(msg, c).length).toBeGreaterThanOrEqual(1);
    }
    fc.assert(fc.property(fc.integer({ min: 0, max: 2 ** 30 }), fc.nat(500), (seed, id) => {
      const c = ctxFor(seed);
      expect(c.callsigns).not.toContain(generateForgery(seed, id, "ORDER", 1, c).msg.from);
    }), { numRuns: 5000 });
  });
  it("Intel 4 still leaves exactly one tell", () => {
    const c = ctxFor(11);
    for (let i = 0; i < 200; i++) expect(generateForgery(11, i, "REPORT", 4, c).truth.tells.length).toBe(1);
  });
});
