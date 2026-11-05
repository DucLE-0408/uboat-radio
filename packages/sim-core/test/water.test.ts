import { describe, expect, it } from "vitest";
import { replay, Watch } from "../src/watch";
import { defaultOptions, ALL_MODULES, type WatchOptions } from "../src/options";
import { makeWater } from "../src/water";
import { SonarField } from "../src/sonar";
import { derive } from "../src/rng";
import { coastKm } from "../src/messages";
import { BALANCE, type Balance } from "../src/balance";
import type { SimEvent } from "../src/events";

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
const on: WatchOptions = { ...defaultOptions("endless"), modules: { ...ALL_MODULES, timer: false, weather: false, radar: false } };
const off: WatchOptions = { ...on, modules: { ...on.modules, water: false } };
const origin = { x: coastKm() - BALANCE.coast.endlessStartKm, y: BALANCE.watch.originKm.y };
const withW = (over: Partial<Balance["water"]>): Balance => ({ ...BALANCE, water: { ...BALANCE.water, ...over } });

describe("water field", () => {
  it("is deterministic, bounded, continuous, warmer to the south and cooler at the coast, and the chart omits the eddies", () => {
    const a = makeWater(5, BALANCE, origin), b = makeWater(5, BALANCE, origin), c = makeWater(6, BALANCE, origin), w = BALANCE.water;
    let diff = 0, eddyGap = 0;
    for (let x = origin.x - 60; x < origin.x + 36; x += 3) for (let y = origin.y - 60; y < origin.y + 60; y += 3) {
      const s = a.at(x, y); expect(s).toEqual(b.at(x, y));
      expect(s.layerM).toBeGreaterThanOrEqual(w.layerMinM); expect(s.layerM).toBeLessThanOrEqual(w.layerMaxM);
      expect(Math.abs(a.at(x + 0.5, y).tempC - s.tempC)).toBeLessThan(1.5); // half a km never jumps
      if (s.tempC !== c.at(x, y).tempC) diff++;
      eddyGap = Math.max(eddyGap, Math.abs(s.tempC - a.chart(x, y).tempC));
    }
    expect(diff).toBeGreaterThan(100); expect(eddyGap).toBeGreaterThan(0.5); // the real water differs from the chart somewhere
    expect(a.chart(origin.x, origin.y - 80).tempC).toBeGreaterThan(a.chart(origin.x, origin.y + 80).tempC); // south is warmer
    expect(a.chart(coastKm() - 1, origin.y).tempC).toBeLessThan(a.chart(coastKm() - 60, origin.y).tempC); // the coast is cooler
  });
  it("a warmer chart cell has a deeper layer", () => {
    const a = makeWater(5, BALANCE, origin);
    expect(a.chart(origin.x, origin.y - 80).layerM).toBeGreaterThanOrEqual(a.chart(origin.x, origin.y + 80).layerM);
  });
});

describe("below the layer", () => {
  const low = withW({ layerMinM: 10, layerMaxM: 10, hydroLossDb: 5 }); // the layer lies at 10 m everywhere, so a dived boat is below it
  it("muffles surface ships for a dived boat only, and only with the module", () => {
    const heard = (seed: number, b: Balance, o: WatchOptions, dive: boolean): number => {
      const w = new Watch(seed, b, o); if (dive) { w.dispatch({ kind: "mode", mode: "dive" }); w.runUntil(90); }
      const l = w.listen(); return l.length === 0 ? NaN : (l[0] as { snrDb: number }).snrDb;
    };
    let seed = 1; // a seed whose merchant is audible both surfaced and dived, with and without the loss
    while (seed < 500 && [heard(seed, low, on, false), heard(seed, low, on, true), heard(seed, low, off, true)].some(Number.isNaN)) seed++;
    expect(seed).toBeLessThan(500);
    expect(heard(seed, low, on, false)).toBeCloseTo(heard(seed, low, off, false), 6); // surfaced: above the layer, no loss
    expect(heard(seed, low, off, true) - heard(seed, low, on, true)).toBeCloseTo(5, 1); // dived: below it
  });
  it("the ASDIC lock rate is scaled by the factor passed in (below the layer it is lower)", () => {
    const b: Balance = { ...BALANCE, sonar: { ...BALANCE.sonar, asdicLockPerSec: 5 } };
    const pings = (scale: number): number => {
      const f = new SonarField(); f.add({ id: 100, kind: "escort", x: 500, y: 0, courseDeg: 0, speedMs: 0, shaftRps: 3, blades: 3, srcLevelDb: 150 });
      const rng = derive(1, "asdic"); let n = 0;
      for (let t = 0; t < 60; t++) n += f.tick(1, t, { x: 0, y: 0, speedKn: 0 }, rng, b, undefined, scale).length;
      return n;
    };
    expect(pings(0)).toBe(0); expect(pings(1)).toBeGreaterThan(pings(0.05));
  });
});

describe("the thermometer", () => {
  it("reports each minute at the estimated position, with bounded noise and 5 m layer steps; nothing without the module or in the night watch", () => {
    const w = new Watch(5, BALANCE, on); w.runUntil(600);
    const s = ev(w, "WATER_SAMPLE");
    expect(s.length).toBeGreaterThanOrEqual(10); expect(s[1]!.tSec - s[0]!.tSec).toBeCloseTo(BALANCE.water.sampleEverySec, 0);
    for (const x of s) { expect(x.layerM % 5).toBe(0); expect(x.tempC).toBeGreaterThan(0); expect(Math.abs(x.xKm - w.navFix().xKm)).toBeLessThan(5); }
    const n = new Watch(5, BALANCE); n.runUntil(600); const o = new Watch(5, BALANCE, off); o.runUntil(600);
    expect(ev(n, "WATER_SAMPLE")).toHaveLength(0); expect(ev(o, "WATER_SAMPLE")).toHaveLength(0);
    expect(w.chartWater(0, 0)).not.toBeNull(); expect(o.chartWater(0, 0)).toBeNull();
  });
  it("replays bit-exactly", () => {
    const w = new Watch(9, BALANCE, on); w.dispatch({ kind: "speed", kn: 8 }); w.dispatch({ kind: "mode", mode: "dive" }); w.runUntil(1500);
    expect(replay(9, w.commandLog(), w.tickCount, BALANCE, on).bus.getLog()).toEqual(w.bus.getLog());
  });
});
