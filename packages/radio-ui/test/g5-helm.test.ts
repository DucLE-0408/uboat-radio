import { describe, expect, it } from "vitest";
import { posToGrid, gridToPos, type SimEvent } from "@uboat/sim-core";
import { angDelta, bearingTo, parseGrid, ZOOM_KM } from "../src/desk/helm";
import { adjust, GROUND_PENALTY, MOVE_PENALTY, MOVE_REWARD, RATION_EMPTY } from "../src/desk/ration";
import { rebuildStore, Store } from "../src/store";

describe("helm geometry", () => {
  it("angDelta is the short way round", () => {
    expect(angDelta(350, 10)).toBe(20); expect(angDelta(10, 350)).toBe(-20); expect(angDelta(0, 180)).toBe(180); expect(angDelta(90, 90)).toBe(0); expect(angDelta(0, 359)).toBe(-1);
  });
  it("bearingTo uses compass bearings with north up", () => {
    const o = { x: 0, y: 0 };
    expect(bearingTo(o, { x: 0, y: 10 })).toBeCloseTo(0, 5); expect(bearingTo(o, { x: 10, y: 0 })).toBeCloseTo(90, 5);
    expect(bearingTo(o, { x: 0, y: -10 })).toBeCloseTo(180, 5); expect(bearingTo(o, { x: -10, y: 0 })).toBeCloseTo(270, 5);
  });
  it("parseGrid agrees with the sim's gridToPos and rejects anything else", () => {
    for (const g of ["AA11", "LM14", "KM85", "ZZ99"]) expect(parseGrid(g)).toEqual(gridToPos(g));
    expect(posToGrid(parseGrid("LM14") as { x: number; y: number })).toBe("LM14");
    for (const bad of ["", "LM1", "lm14", "LM10", "LM144"]) expect(parseGrid(bad)).toBeNull();
  });
  it("three zoom levels from local to the whole map", () => {
    expect(ZOOM_KM).toEqual([60, 600, 2340]);
  });
});

describe("movement orders in the store and ration", () => {
  const ev = (e: Partial<SimEvent> & { type: SimEvent["type"] }): SimEvent => e as SimEvent;
  it("rebuilds the order in force, reached and missed counts, and lost items from the log", () => {
    const log: SimEvent[] = [
      ev({ type: "ORDER_ACCEPTED", tSec: 100, rxId: 3, grid: "LM14", deadlineSec: 3600 }),
      ev({ type: "ORDER_REACHED", tSec: 900, rxId: 3 }),
      ev({ type: "ORDER_ACCEPTED", tSec: 1000, rxId: 5, grid: "LM24", deadlineSec: 600 }),
    ];
    const s = new Store(); rebuildStore(s, log, [], 1100);
    expect(s.state.moveOrder).toEqual({ rxId: 5, grid: "LM24", deadlineAt: 1600 }); expect(s.state.ordersReached).toBe(1); expect(s.state.ordersFailed).toBe(0);
    const s2 = new Store(); rebuildStore(s2, [...log, ev({ type: "ORDER_FAILED", tSec: 1600, rxId: 5, lostItem: "supply1" })], [], 1700);
    expect(s2.state.moveOrder).toBeNull(); expect(s2.state.ordersFailed).toBe(1); expect(s2.state.lostItems.has("supply1")).toBe(true);
  });
  it("reaching pays and missing costs rations", () => {
    expect(adjust(RATION_EMPTY, MOVE_REWARD).score).toBe(MOVE_REWARD);
    expect(adjust(RATION_EMPTY, -MOVE_PENALTY).score).toBe(-MOVE_PENALTY);
    expect(adjust(RATION_EMPTY, 0)).toBe(RATION_EMPTY);
  });
});

describe("coast events in the store and ration", () => {
  const ev = (e: Partial<SimEvent> & { type: SimEvent["type"] }): SimEvent => e as SimEvent;
  it("rebuilds the last coast warning and the number of groundings from the log", () => {
    const s = new Store();
    rebuildStore(s, [ev({ type: "COAST_WARNING", tSec: 4000, distKm: 9.8 }), ev({ type: "BOAT_GROUNDED", tSec: 4300 }), ev({ type: "BOAT_GROUNDED", tSec: 9000 })], [], 9100);
    expect(s.state.coastWarnAt).toBe(4000); expect(s.state.groundings).toBe(2);
  });
  it("running aground costs rations", () => {
    expect(adjust(RATION_EMPTY, -GROUND_PENALTY).score).toBe(-GROUND_PENALTY);
  });
});

describe("seabed events in the store and ration", () => {
  const ev = (e: Partial<SimEvent> & { type: SimEvent["type"] }): SimEvent => e as SimEvent;
  it("rebuilds the last shoal warning and the number of times the keel touched bottom", () => {
    const s = new Store();
    rebuildStore(s, [ev({ type: "SHOAL_WARNING", tSec: 3000, underKeelM: 18 }), ev({ type: "BOAT_BOTTOMED", tSec: 3100 })], [], 3200);
    expect(s.state.shoalWarnAt).toBe(3000); expect(s.state.bottomings).toBe(1);
  });
});
