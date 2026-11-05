import { describe, expect, it } from "vitest";
import { replay, Watch } from "../src/watch";
import { defaultOptions, ALL_MODULES, parseOptions, type WatchOptions } from "../src/options";
import { clearness, makeWeather } from "../src/weather";
import { BALANCE, type Balance } from "../src/balance";
import type { SimEvent } from "../src/events";

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
const opts: WatchOptions = { ...defaultOptions("endless"), modules: { ...ALL_MODULES, timer: false } };
const noWx: WatchOptions = { ...opts, modules: { ...opts.modules, weather: false } };
const harsh: Balance = { ...BALANCE, weather: { ...BALANCE.weather, sightHazardPerSecClear: 1, minVisKm: 0, maxVisKm: 1, visSkew: 1 } }; // always clear enough, always sighted

describe("weather model", () => {
  it("is a deterministic, bounded, continuous function of time and differs by seed", () => {
    const a = makeWeather(7, BALANCE), b = makeWeather(7, BALANCE), c = makeWeather(8, BALANCE);
    let diff = 0, prev = a.at(0).visKm;
    for (let t = 0; t < 4 * 86400; t += 60) {
      const s = a.at(t);
      expect(s).toEqual(b.at(t));
      expect(s.visKm).toBeGreaterThanOrEqual(BALANCE.weather.minVisKm); expect(s.visKm).toBeLessThanOrEqual(BALANCE.weather.maxVisKm);
      expect(s.force).toBeGreaterThanOrEqual(1); expect(s.force).toBeLessThanOrEqual(BALANCE.weather.maxForce);
      expect(s.windDeg).toBeGreaterThanOrEqual(0); expect(s.windDeg).toBeLessThan(360);
      expect(s.seaState).toBeGreaterThanOrEqual(0); expect(s.seaState).toBeLessThanOrEqual(8);
      expect(Math.abs(s.visKm - prev)).toBeLessThan(2); prev = s.visKm; // 60 s steps never jump, also across the wrap
      if (s.visKm !== c.at(t).visKm) diff++;
    }
    expect(diff).toBeGreaterThan(100);
  });
  it("clearness is 0 in fog and 1 in the clearest air", () => {
    expect(clearness(BALANCE, BALANCE.weather.minVisKm)).toBe(0); expect(clearness(BALANCE, BALANCE.weather.maxVisKm)).toBe(1); expect(clearness(BALANCE, 0)).toBe(0);
  });
  it("options parse: weather is a module, and saves without it get it on", () => {
    const o = { mode: "endless", difficulty: "normal", modules: { timer: true, rotors: true, stamps: true, signatures: true, cables: true, teletyper: true, map: true } };
    expect(parseOptions(o)?.modules.weather).toBe(true);
    expect(parseOptions({ ...o, modules: { ...o.modules, weather: "yes" } })).toBeNull();
  });
});

describe("weather in the watch", () => {
  it("the bridge reports on a schedule while it can see the sea, and not when deep", () => {
    const w = new Watch(3, BALANCE, opts); w.runUntil(1900);
    const r = ev(w, "WEATHER_REPORT");
    expect(r.length).toBe(4); // t = 0, 600, 1200, 1800
    for (const x of r) { expect(x.visKm).toBeGreaterThanOrEqual(1); expect(x.windDeg % 10).toBe(0); }
    const d = new Watch(3, BALANCE, opts); d.dispatch({ kind: "mode", mode: "dive" }); d.runUntil(1900);
    expect(ev(d, "WEATHER_REPORT").length).toBeLessThanOrEqual(1);
  });
  it("a surfaced boat in clear air is sighted, then the escort and charges follow", () => {
    const w = new Watch(3, harsh, opts); w.runUntil(40);
    expect(ev(w, "SIGHTED")).toHaveLength(1);
    w.runUntil(2000);
    expect(ev(w, "ESCORT_DISPATCHED").length).toBeGreaterThanOrEqual(1); expect(ev(w, "DEPTH_CHARGE").length).toBeGreaterThanOrEqual(1);
    expect(ev(w, "HFDF_FIX")).toHaveLength(0); // seen, not heard
  });
  it("a submerged boat is not sighted", () => {
    const w = new Watch(3, harsh, opts); w.dispatch({ kind: "mode", mode: "dive" }); w.runUntil(1500);
    expect(w.boat.state().depthM).toBeGreaterThan(BALANCE.boat.periscopeDepthM + 1);
    expect(ev(w, "SIGHTED").length).toBeLessThanOrEqual(1); // at most the sighting while it was still going down; none after the cooldown
    for (const e of ev(w, "SIGHTED")) expect(e.tSec).toBeLessThan(60);
  });
  it("module off and the plain night watch have no weather at all (D10)", () => {
    const off = new Watch(3, harsh, noWx); off.runUntil(1500); const night = new Watch(3, harsh); night.runUntil(1500);
    for (const w of [off, night]) for (const t of ["WEATHER_REPORT", "SIGHTED"] as const) expect(ev(w, t)).toHaveLength(0);
  });
  it("replays bit-exactly with weather on", () => {
    const w = new Watch(9, BALANCE, opts); w.dispatch({ kind: "speed", kn: 8 }); w.runUntil(3000);
    const r = replay(9, w.commandLog(), w.tickCount, BALANCE, opts);
    expect(r.bus.getLog()).toEqual(w.bus.getLog());
  });
});
