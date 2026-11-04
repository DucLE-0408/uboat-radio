import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { authTable, buildLatinSquare, checkGroup, ChallengeLedger, isLatinSquare, Keybook, lookup } from "../src/auth";
import { Intel } from "../src/intel";
import { HfdfDetector } from "../src/detection";
import { EventBus, type SimEvent } from "../src/events";
import { derive } from "../src/rng";
import { BALANCE } from "../src/balance";

describe("auth", () => {
  it("PROPERTY: every table is a Latin square", () => {
    fc.assert(fc.property(fc.integer(), (seed) => isLatinSquare(buildLatinSquare(derive(seed, "t")))), { numRuns: 300 });
  });
  it("HQ and boat derive identical tables; nets and days are independent", () => {
    const a = authTable(1, "HQ", 5), b = authTable(1, "HQ", 5);
    expect(a).toEqual(b);
    const agree = (x: typeof a, y: typeof a): number => { let n = 0; for (let i = 0; i < 26; i++) for (let j = 0; j < 26; j++) if (x[i]![j] === y[i]![j]) n++; return n; };
    // Compromise of one net must not leak another: agreement stays near chance (676/26 = 26).
    expect(agree(a, authTable(1, "PACK", 5))).toBeLessThan(80);
    expect(agree(a, authTable(1, "WX", 5))).toBeLessThan(80);
    expect(agree(a, authTable(1, "HQ", 6))).toBeLessThan(80);
  });
  it("challenge-reply: single-use cells, anti-replay, wrong burns the cell", () => {
    const t = authTable(2, "HQ", 1);
    const led = new ChallengeLedger(t);
    const rng = derive(2, "ch");
    const c = led.issue(rng);
    expect(led.verify(c, lookup(t, c.row, c.col))).toBe("ok");
    expect(led.verify(c, lookup(t, c.row, c.col))).toBe("replay");
    const c2 = led.issue(rng);
    expect(led.verify(c2, "?")).toBe("wrong");
    expect(led.verify(c2, lookup(t, c2.row, c2.col))).toBe("replay");
    expect(led.usedCells()).toEqual([c.row + c.col, c2.row + c2.col].sort());
  });
  it("ledger never reissues a used cell", () => {
    const led = new ChallengeLedger(authTable(3, "PACK", 1));
    const rng = derive(3, "ch");
    const seen = new Set<string>();
    for (let i = 0; i < 676; i++) {
      const c = led.issue(rng);
      expect(seen.has(c.row + c.col)).toBe(false);
      seen.add(c.row + c.col);
      led.verify(c, "A");
    }
    expect(() => led.issue(rng)).toThrow();
  });
  it("check group depends on callsign initial and plaintext", () => {
    const t = authTable(4, "HQ", 1);
    expect(checkGroup(t, "UAB", "ANGRIFF")).toBe(checkGroup(t, "UAB", "ANGRIFF"));
    // Different checksum (mod 26) or different initial => different table cell.
    expect(checkGroup(t, "UAB", "A")).not.toBe(checkGroup(t, "UAB", "B")); // same row, adjacent columns differ (Latin)
    expect(checkGroup(t, "UAB", "A")).not.toBe(checkGroup(t, "VAB", "A")); // same column, adjacent rows differ (Latin)
    expect(checkGroup(t, "UAB", "A")).toBe(lookup(t, "U", "A"));
  });
  it("keybook: date-gated and destroyable", () => {
    const kb = new Keybook(5, "HQ");
    expect(() => kb.open(3, 2)).toThrow();
    expect(kb.open(2, 2)).toEqual(authTable(5, "HQ", 2));
    kb.destroy();
    expect(kb.isDestroyed()).toBe(true);
    expect(() => kb.open(1, 2)).toThrow();
  });
});

describe("intel ladder", () => {
  it("levels follow thresholds and pass probabilities", () => {
    const i = new Intel();
    expect(i.level).toBe(0);
    expect(i.forgeryPassProbability()).toBe(0);
    i.transmit(150); // 15
    expect(i.level).toBe(1);
    expect(i.forgeryPassProbability()).toBe(0);
    i.transmit(250); // 40
    expect(i.level).toBe(2);
    expect(i.forgeryPassProbability()).toBeCloseTo(1 / 26, 10);
    i.transmit(400); // 80
    expect(i.level).toBe(3);
    expect(i.knownFraction()).toBeCloseTo(BALANCE.intel.level3KnownFraction.min, 10);
    i.transmit(600); // 140
    expect(i.level).toBe(4);
    expect(i.forgeryPassProbability()).toBe(1);
  });
  it("repeated pattern/indicator and lost codebook raise intel", () => {
    const i = new Intel();
    i.pattern("hdr"); i.indicator("VJNA");
    expect(i.getScore()).toBe(0);
    i.pattern("hdr"); i.indicator("VJNA");
    expect(i.getScore()).toBe(BALANCE.intel.repeatedPattern + BALANCE.intel.reusedIndicator);
    const j = new Intel(); j.codebookLost();
    expect(j.level).toBeGreaterThanOrEqual(2);
  });
  it("level 3 pass probability is monotone in score", () => {
    const i = new Intel(); i.transmit(800);
    let prev = 0;
    while (i.level === 3) { const p = i.forgeryPassProbability(); expect(p).toBeGreaterThanOrEqual(prev); prev = p; i.transmit(10); }
  });
});

function run(seed: number, txSec: number, horizon = 3600, step = 0.5): SimEvent[] {
  const det = new HfdfDetector(derive(seed, "hfdf"));
  const ev: SimEvent[] = [];
  for (let t = 0; t < horizon; t += step) ev.push(...det.tick(step, t < txSec ? { freqKhz: 7000 } : null, { exposure: 1, intelLevel: 0 }));
  return ev;
}

describe("HF/DF detection", () => {
  it("is deterministic", () => { expect(run(1, 300)).toEqual(run(1, 300)); });
  it("no transmission => no detection", () => {
    for (let s = 0; s < 50; s++) expect(run(s, 0)).toEqual([]);
  });
  it("longer transmission => higher detection rate", () => {
    const rate = (sec: number): number => { let n = 0; for (let s = 0; s < 200; s++) if (run(s, sec).some((e) => e.type === "HFDF_FIX")) n++; return n / 200; };
    const short = rate(30), long = rate(400);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeGreaterThan(0.5);
    expect(short).toBeLessThan(0.3);
  });
  it("detection chain: FIX -> ESCORT_DISPATCHED -> DEPTH_CHARGE in order", () => {
    // Horizon 3h: escort travel (<= 80 km at 45 km/h) + reaction (<= 240 s) must complete.
    const ev = run(3, 600, 3 * 3600, 1);
    const types = ev.map((e) => e.type);
    expect(types).toContain("HFDF_FIX");
    expect(types.indexOf("ESCORT_DISPATCHED")).toBeGreaterThan(types.indexOf("HFDF_FIX"));
    expect(types.indexOf("DEPTH_CHARGE")).toBeGreaterThan(types.indexOf("ESCORT_DISPATCHED"));
  });
  it("zero exposure (submerged) is undetectable; sliding window forgets old traffic", () => {
    const det = new HfdfDetector(derive(1, "x"));
    for (let t = 0; t < 600; t += 0.5) expect(det.tick(0.5, { freqKhz: 1 }, { exposure: 0, intelLevel: 4 })).toEqual([]);
    const d2 = new HfdfDetector(derive(1, "y"));
    for (let t = 0; t < 100; t += 0.5) d2.tick(0.5, { freqKhz: 1 }, { exposure: 0, intelLevel: 0 });
    expect(d2.cumulativeTx(1)).toBeGreaterThan(90);
    for (let t = 0; t < 700; t += 0.5) d2.tick(0.5, null, { exposure: 1, intelLevel: 0 });
    expect(d2.cumulativeTx(1)).toBe(0);
  });
  it("frequencies are tracked independently", () => {
    const d = new HfdfDetector(derive(1, "z"));
    for (let t = 0; t < 60; t += 0.5) d.tick(0.5, { freqKhz: 1 }, { exposure: 0, intelLevel: 0 });
    expect(d.cumulativeTx(2)).toBe(0);
  });
});

describe("event bus", () => {
  it("delivers and logs", () => {
    const bus = new EventBus(); const got: SimEvent[] = [];
    const off = bus.subscribe((e) => got.push(e));
    bus.emit({ type: "DEPTH_CHARGE", tSec: 1 }); off(); bus.emit({ type: "DEPTH_CHARGE", tSec: 2 });
    expect(got.length).toBe(1); expect(bus.getLog().length).toBe(2);
  });
});
