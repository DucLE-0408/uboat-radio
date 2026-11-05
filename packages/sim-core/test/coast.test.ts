import { describe, expect, it } from "vitest";
import { replay, Watch } from "../src/watch";
import { ALL_MODULES, defaultOptions, type WatchOptions } from "../src/options";
import { coastKm, gridToPos, moveBrief, type Vec } from "../src/messages";
import { derive } from "../src/rng";
import { BALANCE } from "../src/balance";
import type { SimEvent } from "../src/events";

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
const endless = (over: Partial<WatchOptions> = {}): WatchOptions => ({ ...defaultOptions("endless"), modules: { ...ALL_MODULES, timer: false, weather: false, radar: false, water: false }, ...over });
const trueX = (w: Watch): number => w.worldCtx().ownPos.x;
const eastFast = (w: Watch): void => { w.dispatch({ kind: "heading", deg: 90 }); w.dispatch({ kind: "speed", kn: 17 }); };

describe("coast geometry", () => {
  it("the coast is the first land column and Endless starts 40 km off it; the night watch keeps its start", () => {
    expect(coastKm()).toBe(2070);
    expect(coastKm() - new Watch(1, BALANCE, endless()).worldCtx().ownPos.x).toBeCloseTo(BALANCE.coast.endlessStartKm, 5);
    expect(new Watch(1).worldCtx().ownPos).toEqual(BALANCE.watch.originKm);
    expect(new Watch(1, BALANCE, endless()).originKm().y).toBe(BALANCE.watch.originKm.y);
  });
  it("Orders points and ordered cells stay at sea, on every seed", () => {
    for (let seed = 1; seed <= 120; seed++) {
      const w = new Watch(seed, BALANCE, endless()), o = w.originKm();
      for (const i of w.orderItems()) expect(o.x + i.xKm).toBeLessThanOrEqual(coastKm() - BALANCE.coast.itemMarginKm);
      const b = moveBrief(derive(seed, "t"), w.worldCtx().ownPos);
      if (b !== null) expect((gridToPos(b.grid) as Vec).x).toBeLessThanOrEqual(coastKm() - BALANCE.coast.moveMarginKm);
    }
  });
});

describe("running aground", () => {
  it("warns at 10 km, then holds the boat at the shore, costs hull and Intel, and the chief writes", () => {
    const w = new Watch(5, BALANCE, endless()); const lv0 = w.summary().intelLevel;
    eastFast(w); w.runUntil(8000);
    const warn = ev(w, "COAST_WARNING"), grounded = ev(w, "BOAT_GROUNDED");
    expect(warn).toHaveLength(1); expect(warn[0]?.distKm).toBeLessThanOrEqual(BALANCE.coast.warnKm);
    expect(grounded).toHaveLength(1); expect(grounded[0]?.tSec).toBeGreaterThan(warn[0]?.tSec ?? 0);
    expect(ev(w, "BOAT_DAMAGED").at(-1)?.hull).toBe(100 - BALANCE.coast.groundHull);
    expect(w.summary().hull).toBe(100 - BALANCE.coast.groundHull);
    expect(trueX(w)).toBeLessThanOrEqual(coastKm()); expect(coastKm() - trueX(w)).toBeLessThan(0.01);
    expect(w.navFix().xKm).toBeLessThan(coastKm() + 1);
    expect(w.summary().intelLevel).toBeGreaterThanOrEqual(Math.min(4, lv0 + 1));
    expect(ev(w, "PRIVATE_MSG").some((m) => m.topic === "grounded" && m.fromRole === "chief")).toBe(true);
  });
  it("pushing on does not cost more; backing off and coming back runs aground again", () => {
    const w = new Watch(5, BALANCE, endless()); eastFast(w); w.runUntil(8000);
    expect(ev(w, "BOAT_GROUNDED")).toHaveLength(1);
    eastFast(w); w.runUntil(w.tSec + 600); // still pointing at the rocks
    expect(ev(w, "BOAT_GROUNDED")).toHaveLength(1);
    w.dispatch({ kind: "heading", deg: 270 }); w.dispatch({ kind: "speed", kn: 10 }); w.runUntil(w.tSec + 400);
    expect(coastKm() - trueX(w)).toBeGreaterThan(BALANCE.coast.clearKm);
    w.runUntil(w.tSec + 3200); // far enough off (past the warning distance and its hysteresis) to be warned again
    eastFast(w); w.runUntil(w.tSec + 3000);
    expect(ev(w, "BOAT_GROUNDED")).toHaveLength(2);
    expect(ev(w, "COAST_WARNING").length).toBeGreaterThanOrEqual(2); // warned again on the second approach
  });
  it("repeated groundings can sink the boat", () => {
    const w = new Watch(5, BALANCE, endless());
    for (let i = 0; i < 6 && w.endReason === null; i++) { eastFast(w); w.runUntil(w.tSec + 3000); w.dispatch({ kind: "heading", deg: 270 }); w.dispatch({ kind: "speed", kn: 10 }); w.runUntil(w.tSec + 400); }
    expect(w.endReason).toBe("sunk");
    expect(ev(w, "BOAT_GROUNDED").length).toBe(4);
  });
  it("is replayed bit for bit", () => {
    const o = endless(); const w = new Watch(9, BALANCE, o); eastFast(w); w.runUntil(7000); w.dispatch({ kind: "heading", deg: 250 }); w.runUntil(8000);
    const r = replay(9, w.commandLog(), w.tickCount, BALANCE, o);
    expect(JSON.stringify(r.bus.getLog())).toBe(JSON.stringify(w.bus.getLog()));
  });
  it("the plain night watch has no coast rule (the coast is over a thousand km away)", () => {
    const w = new Watch(5); w.dispatch({ kind: "heading", deg: 90 }); w.dispatch({ kind: "speed", kn: 17 }); w.runUntil(1800);
    expect(ev(w, "COAST_WARNING")).toHaveLength(0); expect(ev(w, "BOAT_GROUNDED")).toHaveLength(0);
  });
});
