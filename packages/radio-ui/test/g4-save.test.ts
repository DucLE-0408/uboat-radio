import { describe, expect, it } from "vitest";
import { defaultOptions, encipherGroups } from "@uboat/sim-core";
import { Session, parseCommand, parseSave, SAVE_KEY } from "../src/sim/session";
import { rebuildStore, Store } from "../src/store";

const mem = (): { storage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }; map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, storage: { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } } };
};

describe("G4 save", () => {
  it("an Endless watch saves as v3 with its options and reloads by replay with the same events; a night watch stays v2", () => {
    const { storage, map } = mem();
    const opts = { ...defaultOptions("endless"), difficulty: "hard" as const };
    const s = Session.fresh(21, storage, undefined, opts);
    for (let i = 0; i < 400; i++) s.step();
    s.dispatch({ kind: "paperwork", rxId: 1, action: { act: "bin", sheet: "orders" } });
    const groups = encipherGroups(21, 1, "ABCD", (s.watch.replyRequest(1) as NonNullable<ReturnType<typeof s.watch.replyRequest>>).plain);
    expect(s.dispatch({ kind: "send", rxId: 1, indicator: "ABCD", groups })).toBe(true);
    for (let i = 0; i < 100; i++) s.step();
    s.save();
    const saved = JSON.parse(map.get(SAVE_KEY) as string);
    expect(saved.v).toBe(3); expect(saved.opts).toEqual(opts);
    const back = Session.restore(storage, 21) as Session;
    expect(back.opts).toEqual(opts);
    expect(JSON.stringify(back.watch.bus.getLog())).toBe(JSON.stringify(s.watch.bus.getLog()));
    expect(s.watch.bus.getLog().some((e) => e.type === "SEND_RESULT")).toBe(true);
    const night = mem(); Session.fresh(21, night.storage);
    expect(JSON.parse(night.map.get(SAVE_KEY) as string).v).toBe(2);
  });
  it("parseSave: v2 loads as before; v3 needs valid options", () => {
    const base = { seed: 5, untilTick: 10, commands: [{ tick: 3, cmd: { kind: "speed", kn: 4 } }] };
    expect(parseSave(JSON.stringify({ v: 2, ...base }))?.opts).toBeUndefined();
    expect(parseSave(JSON.stringify({ v: 3, opts: defaultOptions("endless"), ...base }))?.v).toBe(3);
    expect(parseSave(JSON.stringify({ v: 3, ...base }))).toBeNull();
    expect(parseSave(JSON.stringify({ v: 3, opts: { ...defaultOptions(), difficulty: "x" }, ...base }))).toBeNull();
    expect(parseSave(JSON.stringify({ v: 3, opts: { mode: "endless" }, ...base }))).toBeNull();
  });
  it("parseCommand validates send and leave", () => {
    expect(parseCommand({ kind: "leave" })).toEqual({ kind: "leave" });
    expect(parseCommand({ kind: "send", rxId: 1, indicator: "ABCD", groups: "WXYZ QRST" })).toMatchObject({ kind: "send", rxId: 1 });
    expect(parseCommand({ kind: "send", rxId: 1, indicator: "abcd", groups: "WXYZ" })).toBeNull();
    expect(parseCommand({ kind: "send", rxId: 1, indicator: "ABCD", groups: "WXY" })).toBeNull();
    expect(parseCommand({ kind: "send", rxId: 1, indicator: "ABCD", groups: "WXYZ".repeat(100) })).toBeNull();
    expect(parseCommand({ kind: "send", rxId: -2, indicator: "ABCD", groups: "WXYZ" })).toBeNull();
  });
  it("the store rebuilds send results, private notes, crew absence and lost messages from the log", () => {
    const s = Session.fresh(21, null, undefined, { ...defaultOptions("endless"), difficulty: "hard" });
    for (let i = 0; i < 1500; i++) s.step();
    s.dispatch({ kind: "paperwork", rxId: 1, action: { act: "bin", sheet: "orders" } });
    s.watch.bus.emit({ type: "BOAT_DAMAGED", tSec: s.watch.tSec, hull: 30 });
    const store = new Store();
    rebuildStore(store, s.watch.bus.getLog(), s.watch.commandLog(), s.watch.tSec);
    expect(store.state.privateNotes.length).toBeGreaterThan(0);
    expect(store.state.absentRole).not.toBeNull();
    expect(store.state.lost.size).toBeGreaterThan(0);
  });
});
