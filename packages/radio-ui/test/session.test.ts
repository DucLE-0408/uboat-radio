import { describe, expect, it } from "vitest";
import { SIM_VERSION } from "@uboat/sim-core";
import { Session, parseSave, SAVE_KEY, LEGACY_SAVE_KEY, type StorageLike } from "../src/sim/session";

class MemStore implements StorageLike {
  readonly m = new Map<string, string>();
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
}

function play(s: Session): void {
  const run = (t: number): void => { while (s.watch.tSec < t && s.watch.endReason === null) s.step(); };
  run(70);
  s.dispatch({ kind: "repeat", rxId: 1 });
  run(130);
  s.dispatch({ kind: "challenge", rxId: 1 });
  run(200);
  s.dispatch({ kind: "check", rxId: 1 });
  s.dispatch({ kind: "heading", deg: 90 });
  s.dispatch({ kind: "speed", kn: 6 });
  run(640);
  s.dispatch({ kind: "resolve", rxId: 1, decision: "accept" });
  s.dispatch({ kind: "transmit", seconds: 12 });
  run(700);
}

describe("Session save/load = seed + commandLog", () => {
  it("restore reproduces the identical event log and summary", () => {
    const store = new MemStore();
    const a = Session.fresh(1234, store);
    play(a);
    a.save();
    const b = Session.restore(store, null);
    expect(b).not.toBeNull();
    expect(JSON.stringify(b!.watch.bus.getLog())).toBe(JSON.stringify(a.watch.bus.getLog()));
    expect(b!.watch.summary()).toEqual(a.watch.summary());
    expect(b!.watch.tickCount).toBe(a.watch.tickCount);
  });

  it("the save file holds only seed, sim version, tick and commands", () => {
    const store = new MemStore();
    const a = Session.fresh(7, store);
    play(a);
    const j = JSON.parse(store.getItem(SAVE_KEY)!) as Record<string, unknown>;
    expect(Object.keys(j).sort()).toEqual(["commands", "seed", "sim", "untilTick", "v"]);
    expect(j["v"]).toBe(2);
  });

  it("ignores a save for a different wanted seed", () => {
    const store = new MemStore();
    Session.fresh(1, store).save();
    expect(Session.restore(store, 2)).toBeNull();
    expect(Session.restore(store, 1)).not.toBeNull();
  });

  it("rejects corrupt or hostile save data", () => {
    const bad = [
      "{", "null", "[]", '{"v":2}', '{"v":1,"seed":-1,"tick":0,"commands":[]}',
      '{"v":1,"seed":1,"tick":5,"commands":[{"tick":9,"cmd":{"kind":"silence","on":true}}]}',
      '{"v":1,"seed":1,"tick":50,"commands":[{"tick":9,"cmd":{"kind":"silence","on":1}}]}',
      '{"v":1,"seed":1,"tick":50,"commands":[{"tick":9,"cmd":{"kind":"rm -rf"}}]}',
      '{"v":1,"seed":1,"tick":50,"commands":[{"tick":9,"cmd":{"kind":"silence","on":true}},{"tick":3,"cmd":{"kind":"silence","on":false}}]}',
    ];
    for (const raw of bad) expect(parseSave(raw)).toBeNull();
    expect(parseSave(null)).toBeNull();
  });

  it("survives a throwing storage and reports once", () => {
    const errors: unknown[] = [];
    const broken: StorageLike = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("x"); } };
    const s = Session.fresh(3, broken, (e) => errors.push(e));
    s.dispatch({ kind: "silence", on: true });
    s.dispatch({ kind: "silence", on: false });
    expect(errors).toHaveLength(1);
    expect(Session.restore(broken, null, (e) => errors.push(e))).toBeNull();
  });

  it("migrates a legacy v1 (P4) save to v2 and drops the old key", () => {
    const store = new MemStore();
    const a = Session.fresh(5, store);
    play(a);
    const v2 = JSON.parse(store.getItem(SAVE_KEY)!) as { seed: number; untilTick: number; commands: unknown[] };
    store.removeItem(SAVE_KEY);
    store.setItem(LEGACY_SAVE_KEY, JSON.stringify({ v: 1, seed: v2.seed, tick: v2.untilTick, commands: v2.commands }));
    const b = Session.restore(store, null);
    expect(b).not.toBeNull();
    expect(JSON.stringify(b!.watch.bus.getLog())).toBe(JSON.stringify(a.watch.bus.getLog()));
    expect(store.getItem(LEGACY_SAVE_KEY)).toBeNull();
    expect((JSON.parse(store.getItem(SAVE_KEY)!) as { v: number }).v).toBe(2);
  });

  it("bounds replay work: an absurd untilTick or command count is rejected", () => {
    expect(parseSave(JSON.stringify({ v: 2, seed: 1, untilTick: 20_001, commands: [] }))).toBeNull();
    const many = Array.from({ length: 5001 }, () => ({ tick: 1, cmd: { kind: "silence", on: true } }));
    expect(parseSave(JSON.stringify({ v: 2, seed: 1, untilTick: 5, commands: many }))).toBeNull();
    expect(parseSave("x".repeat(2_000_001))).toBeNull();
  });

  it("accepts every u32 seed (random seeds are drawn from Uint32) and rejects out-of-range ones", () => {
    for (const seed of [0, 1_000_001, 3_000_000_000, 4_294_967_295]) expect(parseSave(JSON.stringify({ v: 2, seed, untilTick: 5, commands: [] })), String(seed)).not.toBeNull();
    for (const seed of [-1, 4_294_967_296, 1.5, "7"]) expect(parseSave(JSON.stringify({ v: 2, seed, untilTick: 5, commands: [] })), String(seed)).toBeNull();
  });
  it("a save from another sim version is not replayed or rewritten; a save without the field is read and stamped", () => {
    const raw = (sim?: number): string => JSON.stringify({ v: 2, ...(sim === undefined ? {} : { sim }), seed: 9, untilTick: 30, commands: [] });
    const other = new MemStore(); other.setItem(SAVE_KEY, raw(SIM_VERSION + 1));
    expect(Session.restore(other, null)).toBeNull();
    expect(other.getItem(SAVE_KEY)).toBe(raw(SIM_VERSION + 1)); // untouched, so nothing is lost
    const old = new MemStore(); old.setItem(SAVE_KEY, raw());
    expect(Session.restore(old, null)?.watch.tickCount).toBe(30);
    expect((JSON.parse(old.getItem(SAVE_KEY)!) as { sim: number }).sim).toBe(SIM_VERSION);
    expect(parseSave(JSON.stringify({ v: 2, sim: "x", seed: 9, untilTick: 30, commands: [] }))).toBeNull();
  });
});
