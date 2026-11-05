import { describe, expect, it } from "vitest";
import { replay, Watch } from "../src/watch";
import { defaultOptions, ALL_MODULES, type WatchOptions } from "../src/options";
import { makeSeabed } from "../src/seabed";
import { coastKm } from "../src/messages";
import { BALANCE } from "../src/balance";
import type { SimEvent } from "../src/events";

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
const opts: WatchOptions = { ...defaultOptions("endless"), modules: { ...ALL_MODULES, timer: false, weather: false, radar: false, water: false } };
const origin = { x: coastKm() - BALANCE.coast.endlessStartKm, y: BALANCE.watch.originKm.y };
const headingTo = (a: { x: number; y: number }, b: { x: number; y: number }): number => ((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI + 360) % 360;

describe("seabed model", () => {
  it("is deterministic from the seed, zero at the coast, deeper offshore, and lifted by shoals", () => {
    const a = makeSeabed(3, BALANCE, origin), b = makeSeabed(3, BALANCE, origin), c = makeSeabed(4, BALANCE, origin);
    expect(a.shoals).toEqual(b.shoals); expect(a.shoals).not.toEqual(c.shoals); expect(a.shoals).toHaveLength(BALANCE.seabed.shoals.count);
    expect(a.depthAt(coastKm(), 1000)).toBe(0); expect(a.depthAt(coastKm() + 50, 1000)).toBe(0);
    const empty = { ...BALANCE, seabed: { ...BALANCE.seabed, shoals: { ...BALANCE.seabed.shoals, count: 0 } } };
    const flat = makeSeabed(3, empty, origin);
    expect(flat.depthAt(coastKm() - 1, 0)).toBeCloseTo((BALANCE.seabed.maxM * 1) / BALANCE.seabed.slopeKm, 5);
    expect(flat.depthAt(coastKm() - 100, 0)).toBe(BALANCE.seabed.maxM);
    const h = a.shoals[0]!; expect(a.depthAt(h.xKm, h.yKm)).toBeLessThan(flat.depthAt(h.xKm, h.yKm));
    for (const s of a.shoals) { expect(s.xKm).toBeLessThan(coastKm()); expect(a.depthAt(s.xKm, s.yKm)).toBeGreaterThanOrEqual(0); }
  });
  it("the chart shows depth only in watches with options", () => {
    expect(new Watch(1).chartDepth(2000, 1100)).toBeNull(); expect(new Watch(1).chartShoals()).toEqual([]);
    const w = new Watch(1, BALANCE, opts);
    expect(w.chartDepth(2000, 1100)).toBe(Math.round(makeSeabed(1, BALANCE, w.originKm()).depthAt(2000, 1100))); expect(w.chartShoals().length).toBe(BALANCE.seabed.shoals.count);
  });
});

/** A seed whose first-found shoal is within reach and shallow enough to catch a boat diving to 60 m. */
function shallowShoal(): { seed: number; at: { x: number; y: number }; minDepth: number } {
  for (let seed = 1; seed < 400; seed++) {
    const sb = makeSeabed(seed, BALANCE, origin);
    for (const s of sb.shoals) {
      const d = sb.depthAt(s.xKm, s.yKm), far = Math.hypot(s.xKm - origin.x, s.yKm - origin.y);
      if (d < 45 && far < 28 && far > 6) return { seed, at: { x: s.xKm, y: s.yKm }, minDepth: d };
    }
  }
  throw new Error("no suitable shoal");
}

describe("a surfaced boat draws its draft", () => {
  it("a shoal that rises above the draft catches a boat on the surface too", () => {
    let found: { seed: number; at: { x: number; y: number } } | null = null;
    for (let seed = 1; seed < 400 && found === null; seed++) {
      const sb = makeSeabed(seed, BALANCE, origin);
      for (const h of sb.shoals) { const far = Math.hypot(h.xKm - origin.x, h.yKm - origin.y); if (sb.depthAt(h.xKm, h.yKm) < BALANCE.seabed.draftM - 1 && far > 5 && far < 22 && coastKm() - h.xKm > 6) { found = { seed, at: { x: h.xKm, y: h.yKm } }; break; } }
    }
    expect(found).not.toBeNull();
    const w = new Watch(found!.seed, BALANCE, opts); w.dispatch({ kind: "speed", kn: 12 });
    for (let i = 0; i < 160 && ev(w, "BOAT_BOTTOMED").length === 0 && w.endReason === null; i++) { w.dispatch({ kind: "heading", deg: headingTo(w.worldCtx().ownPos, found!.at) }); w.runUntil(w.tSec + 30); }
    expect(ev(w, "BOAT_BOTTOMED")).toHaveLength(1);
  });
});

describe("shoal warning and bottoming", () => {
  it("diving over a shoal warns, then touches bottom: hull cost, way lost, forced up, a note from the chief, once per episode", () => {
    const { seed, at } = shallowShoal();
    const w = new Watch(seed, BALANCE, opts);
    w.dispatch({ kind: "mode", mode: "dive" }); w.dispatch({ kind: "speed", kn: 7 });
    for (let i = 0; i < 400 && ev(w, "BOAT_BOTTOMED").length === 0 && w.endReason === null; i++) {
      w.dispatch({ kind: "heading", deg: headingTo(w.worldCtx().ownPos, at) }); w.runUntil(w.tSec + 30);
    }
    const warn = ev(w, "SHOAL_WARNING"), bot = ev(w, "BOAT_BOTTOMED");
    expect(warn.length).toBeGreaterThanOrEqual(1); expect(warn[0]?.underKeelM).toBeLessThanOrEqual(BALANCE.seabed.warnUnderKeelM);
    expect(bot).toHaveLength(1); expect(bot[0]?.tSec).toBeGreaterThanOrEqual(warn[0]?.tSec ?? 0);
    expect(ev(w, "BOAT_DAMAGED").at(-1)?.hull).toBe(100 - BALANCE.seabed.bottomHull);
    expect(ev(w, "PRIVATE_MSG").some((m) => m.topic === "bottomed" && m.fromRole === "chief")).toBe(true);
    const d0 = w.summary().hull; w.runUntil(w.tSec + 120);
    expect(ev(w, "BOAT_BOTTOMED")).toHaveLength(1); expect(w.summary().hull).toBe(d0); // pushing on does not cost more
  });
  it("on the surface over the same shoal nothing happens; a boat that stays deep in deep water is never warned", () => {
    const { seed, at } = shallowShoal();
    const w = new Watch(seed, BALANCE, opts); w.dispatch({ kind: "speed", kn: 10 });
    for (let i = 0; i < 200; i++) { w.dispatch({ kind: "heading", deg: headingTo(w.worldCtx().ownPos, at) }); w.runUntil(w.tSec + 30); }
    expect(ev(w, "SHOAL_WARNING")).toHaveLength(0); expect(ev(w, "BOAT_BOTTOMED")).toHaveLength(0);
    const deep = new Watch(seed, BALANCE, opts); deep.dispatch({ kind: "mode", mode: "dive" }); deep.dispatch({ kind: "heading", deg: 270 }); deep.dispatch({ kind: "speed", kn: 5 }); deep.runUntil(900);
    expect(ev(deep, "BOAT_BOTTOMED")).toHaveLength(0);
  });
  it("is replayed bit for bit, and the plain night watch has no seabed rule", () => {
    const { seed, at } = shallowShoal();
    const w = new Watch(seed, BALANCE, opts); w.dispatch({ kind: "mode", mode: "dive" }); w.dispatch({ kind: "speed", kn: 7 });
    for (let i = 0; i < 160; i++) { w.dispatch({ kind: "heading", deg: headingTo(w.worldCtx().ownPos, at) }); w.runUntil(w.tSec + 30); }
    const r = replay(seed, w.commandLog(), w.tickCount, BALANCE, opts);
    expect(JSON.stringify(r.bus.getLog())).toBe(JSON.stringify(w.bus.getLog()));
    const n = new Watch(seed); n.dispatch({ kind: "mode", mode: "dive" }); n.dispatch({ kind: "speed", kn: 7 }); n.runUntil(1800);
    expect(ev(n, "SHOAL_WARNING")).toHaveLength(0); expect(ev(n, "BOAT_BOTTOMED")).toHaveLength(0);
  });
});
