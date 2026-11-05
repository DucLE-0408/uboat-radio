import { describe, expect, it } from "vitest";
import { replay, Watch } from "../src/watch";
import { defaultOptions, ALL_MODULES, type WatchOptions } from "../src/options";
import { chargeEffect, makeSeabed } from "../src/seabed";
import { BALANCE } from "../src/balance";
import type { SimEvent } from "../src/events";

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
const opts: WatchOptions = { ...defaultOptions("endless"), modules: { ...ALL_MODULES, timer: false, weather: false } };

describe("chargeEffect", () => {
  it("deep water keeps the legacy pattern depth; shallow water caps it above the floor", () => {
    expect(chargeEffect(BALANCE, 200, 60)).toEqual({ dropM: 100, mult: 1, shallow: false });
    expect(chargeEffect(BALANCE, 30, 0)).toMatchObject({ dropM: 25, shallow: true });
    expect(chargeEffect(BALANCE, 4, 0).dropM).toBe(BALANCE.seabed.minDropM);
  });
  it("a boat close to the floor takes the reflected blast", () => {
    expect(chargeEffect(BALANCE, 50, 40).mult).toBe(BALANCE.seabed.reflectMult);
    expect(chargeEffect(BALANCE, 50, 10).mult).toBe(1);
  });
});

function sailToShallow(seed: number): Watch {
  const w = new Watch(seed, BALANCE, opts);
  const sb = makeSeabed(seed, BALANCE, w.originKm());
  w.dispatch({ kind: "heading", deg: 90 }); w.dispatch({ kind: "speed", kn: 12 });
  for (let i = 0; i < 1500; i++) {
    const p = w.worldCtx().ownPos;
    if (sb.depthAt(p.x, p.y) < 30) break;
    w.runUntil(w.tSec + 10);
  }
  return w;
}

describe("charges in shallow water", () => {
  it("a charge on a surfaced boat over a shallow floor hits, and is marked shallow", () => {
    const w = sailToShallow(5);
    expect(w.endReason).toBeNull();
    w.bus.emit({ type: "DEPTH_CHARGE", tSec: w.tSec });
    const [c] = ev(w, "CHARGE_EFFECT");
    expect(c).toMatchObject({ shallow: true, hit: true });
    expect(ev(w, "BOAT_DAMAGED").length).toBeGreaterThan(0);
  });
  it("in deep water the same charge misses a surfaced boat", () => {
    const w = new Watch(5, BALANCE, opts);
    w.bus.emit({ type: "DEPTH_CHARGE", tSec: w.tSec });
    expect(ev(w, "CHARGE_EFFECT")[0]).toMatchObject({ shallow: false, hit: false, dropM: 100 });
  });
  it("replays bit-exactly (an injected charge bursts identically on the replayed watch)", () => {
    const w = sailToShallow(5);
    const r = replay(5, w.commandLog(), w.tickCount, BALANCE, opts);
    w.bus.emit({ type: "DEPTH_CHARGE", tSec: w.tSec }); r.bus.emit({ type: "DEPTH_CHARGE", tSec: r.tSec });
    expect(ev(w, "CHARGE_EFFECT")).toHaveLength(1);
    expect(ev(r, "CHARGE_EFFECT")).toEqual(ev(w, "CHARGE_EFFECT"));
    expect(r.bus.getLog()).toEqual(w.bus.getLog());
  });
  it("the plain night watch never emits CHARGE_EFFECT (D10)", () => {
    const w = new Watch(5);
    w.bus.emit({ type: "DEPTH_CHARGE", tSec: 1 });
    expect(ev(w, "CHARGE_EFFECT")).toHaveLength(0);
  });
});
