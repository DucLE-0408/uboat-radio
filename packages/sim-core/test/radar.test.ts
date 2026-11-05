import { describe, expect, it } from "vitest";
import { replay, Watch } from "../src/watch";
import { defaultOptions, ALL_MODULES, type WatchOptions } from "../src/options";
import { makeRadar, radarEra, radarSeaFactor } from "../src/radar";
import { BALANCE, type Balance } from "../src/balance";
import type { SimEvent } from "../src/events";

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
const base: WatchOptions = { ...defaultOptions("endless"), modules: { ...ALL_MODULES, timer: false, weather: false, water: false } };
const noRadar: WatchOptions = { ...base, modules: { ...base.modules, radar: false } };
const withB = (over: Partial<Balance["radar"]>): Balance => ({ ...BALANCE, radar: { ...BALANCE.radar, ...over } });
const SEED = 6;

/** Start, end of the first patrol window, found from the schedule itself. */
function first(b: Balance): { start: number; end: number; warnAt: number | null } {
  const r = makeRadar(SEED, b);
  for (let t = 0; t < 20000; t += 5) { const c = r.at(t); if (c !== null) return { start: c.window.start, end: c.window.end, warnAt: c.window.warnAt }; }
  throw new Error("no window");
}

describe("patrol schedule", () => {
  it("is deterministic, ordered, inside its bounds, quiet at the start, and repeats", () => {
    const a = makeRadar(SEED, BALANCE), b = makeRadar(SEED, BALANCE), c = makeRadar(SEED + 1, BALANCE);
    const f = first(BALANCE);
    expect(f.start).toBeGreaterThanOrEqual(BALANCE.radar.firstGapSec);
    expect(f.end - f.start).toBeGreaterThanOrEqual(BALANCE.radar.windowSec.min); expect(f.end - f.start).toBeLessThanOrEqual(BALANCE.radar.windowSec.max);
    let diff = 0, wins = 0, prev = false;
    for (let t = 0; t < 3 * 86400; t += 30) {
      const x = a.at(t); expect(x).toEqual(b.at(t));
      if (x !== null) { expect(x.window.end).toBeGreaterThan(x.window.start); if (x.active) expect(t).toBeGreaterThanOrEqual(x.window.start); }
      const on = x?.active === true; if (on && !prev) wins++; prev = on;
      if (JSON.stringify(x) !== JSON.stringify(c.at(t))) diff++;
    }
    expect(a.at(10)).toBeNull(); expect(diff).toBeGreaterThan(100); expect(wins).toBeGreaterThan(30);
  });
  it("the sea clutter factor is 1 when calm and the minimum at sea state 8; the enemy improves with the hours up to a cap", () => {
    expect(radarSeaFactor(BALANCE, 2)).toBe(1); expect(radarSeaFactor(BALANCE, 8)).toBeCloseTo(BALANCE.radar.seaMinFactor, 10);
    expect(radarEra(BALANCE, 0)).toBe(1); expect(radarEra(BALANCE, 7200)).toBeCloseTo(1 + 2 * BALANCE.radar.eraGrowthPerHour, 10); expect(radarEra(BALANCE, 1e7)).toBe(BALANCE.radar.eraCap);
  });
});

describe("radar in the watch", () => {
  it("the Metox warns before the window and clears after it; a boat on the surface is picked up and an escort follows, with no HF/DF fix", () => {
    const b = withB({ metoxReliability: 1, hazardPerSecSurface: 5 }), f = first(b);
    const w = new Watch(SEED, b, base); w.runUntil(f.end + 700);
    const warn = ev(w, "RADAR_WARNING"), clear = ev(w, "RADAR_CLEAR"), hit = ev(w, "RADAR_DETECTED");
    expect(warn).toHaveLength(1); expect(warn[0]!.tSec).toBeLessThanOrEqual(f.start); expect(warn[0]!.tSec).toBeGreaterThanOrEqual((f.warnAt as number) - 1);
    expect(clear.length).toBeGreaterThanOrEqual(1); expect(clear[0]!.tSec).toBeGreaterThanOrEqual(f.end);
    expect(hit.length).toBeGreaterThanOrEqual(1); expect(hit[0]!.tSec).toBeGreaterThanOrEqual(f.start); // a long window can outlast the escort cooldown and pick us up again
    expect(ev(w, "ESCORT_DISPATCHED").length).toBeGreaterThanOrEqual(1); expect(ev(w, "HFDF_FIX")).toHaveLength(0);
  });
  it("heeding the warning works: a boat that dives before the window is never picked up", () => {
    const b = withB({ metoxReliability: 1, hazardPerSecSurface: 5 }), f = first(b);
    const w = new Watch(SEED, b, base); w.runUntil(f.warnAt as number + 1); w.dispatch({ kind: "mode", mode: "dive" }); w.runUntil(f.end + 700);
    expect(ev(w, "RADAR_WARNING")).toHaveLength(1); expect(ev(w, "RADAR_DETECTED")).toHaveLength(0); expect(ev(w, "ESCORT_DISPATCHED")).toHaveLength(0);
  });
  it("a missed warning (unreliable Metox) leaves the boat exposed without a sound", () => {
    const b = withB({ metoxReliability: 0, hazardPerSecSurface: 5 }), f = first(b);
    expect(f.warnAt).toBeNull();
    const w = new Watch(SEED, b, base); w.runUntil(f.end + 700);
    expect(ev(w, "RADAR_WARNING")).toHaveLength(0); expect(ev(w, "RADAR_DETECTED").length).toBeGreaterThanOrEqual(1);
  });
  it("module off and the plain night watch have no radar at all (D10)", () => {
    const b = withB({ metoxReliability: 1, hazardPerSecSurface: 5 }), f = first(b);
    const off = new Watch(SEED, b, noRadar); off.runUntil(f.end + 300); const night = new Watch(SEED, b); night.runUntil(f.end + 300);
    for (const w of [off, night]) for (const t of ["RADAR_WARNING", "RADAR_CLEAR", "RADAR_DETECTED"] as const) expect(ev(w, t)).toHaveLength(0);
  });
  it("replays bit-exactly across a patrol", () => {
    const f = first(BALANCE), w = new Watch(SEED, BALANCE, base); w.dispatch({ kind: "speed", kn: 6 }); w.runUntil(f.end + 600);
    const r = replay(SEED, w.commandLog(), w.tickCount, BALANCE, base);
    expect(r.bus.getLog()).toEqual(w.bus.getLog());
  });
});
