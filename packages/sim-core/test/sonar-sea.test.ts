import { describe, expect, it } from "vitest";
import { Watch } from "../src/watch";
import { defaultOptions, ALL_MODULES, type WatchOptions } from "../src/options";
import { detectRangeKm, noiseLevelDb, transmissionLossDb } from "../src/sonar";
import { asdicSeaFactor, makeWeather } from "../src/weather";
import { BALANCE } from "../src/balance";

const opts: WatchOptions = { ...defaultOptions("endless"), modules: { ...ALL_MODULES, timer: false, radar: false, water: false } };
const noWx: WatchOptions = { ...opts, modules: { ...opts.modules, weather: false } };

describe("detection range", () => {
  it("is the range at which the source just clears the noise, and falls with sea state and own speed", () => {
    const src = 150, r = detectRangeKm(src, 3, 0);
    expect(src - transmissionLossDb(r * 1000) - noiseLevelDb(3, 0)).toBeCloseTo(BALANCE.sonar.detectThresholdDb, 3);
    expect(detectRangeKm(src, 6, 0)).toBeLessThan(r); expect(detectRangeKm(src, 3, 5)).toBeLessThan(r);
    expect(detectRangeKm(src, 3, 9)).toBeLessThan(detectRangeKm(src, 3, 6)); // cavitation costs a step
  });
  it("is a monotone function of the source level", () => {
    expect(detectRangeKm(160, 3, 0)).toBeGreaterThan(detectRangeKm(145, 3, 0));
  });
});

describe("sea state in the sonar", () => {
  it("the ASDIC lock factor is 1 when calm and the minimum at sea state 8", () => {
    expect(asdicSeaFactor(BALANCE, 0)).toBe(1); expect(asdicSeaFactor(BALANCE, BALANCE.weather.calmSeaState)).toBe(1);
    expect(asdicSeaFactor(BALANCE, 8)).toBeCloseTo(BALANCE.weather.asdicMinFactor, 10);
  });
  it("with weather the hydrophone works in the weather's sea; without it, in the fixed one", () => {
    let seed = 1; // a seed whose opening sea differs from the fixed one but still lets the merchant be heard both ways
    const ok = (n: number): boolean => Math.abs(makeWeather(n, BALANCE).at(0).sea - BALANCE.watch.seaState) >= 1 && new Watch(n, BALANCE, opts).listen().length > 0 && new Watch(n, BALANCE, noWx).listen().length > 0;
    while (!ok(seed) && seed < 500) seed++;
    expect(seed).toBeLessThan(500);
    const sea = makeWeather(seed, BALANCE).at(0).sea;
    const on = new Watch(seed, BALANCE, opts).listen(), off = new Watch(seed, BALANCE, noWx).listen(), plain = new Watch(seed, BALANCE).listen();
    expect(off).toEqual(plain); // the fixed sea state is unchanged
    const a = on[0], b = off[0];
    expect(a).toBeDefined(); expect(b).toBeDefined();
    if (sea > BALANCE.watch.seaState) expect(a!.snrDb).toBeLessThan(b!.snrDb); else expect(a!.snrDb).toBeGreaterThan(b!.snrDb);
  });
});
