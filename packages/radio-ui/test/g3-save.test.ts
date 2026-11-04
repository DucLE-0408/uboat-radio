import { describe, expect, it } from "vitest";
import { Session, parseCommand, parseSave, SAVE_KEY } from "../src/sim/session";
import { rebuildStore, Store } from "../src/store";
import { harness, runTo } from "./harness";

const handover = { act: "handover", echo: true, signed: true, inputStamps: 0, outputs: 1, outputRed: 1, outputOther: 0, messages: 1 };

describe("G3 commands in the save", () => {
  it("parseCommand validates paperwork and timer from untrusted storage", () => {
    expect(parseCommand({ kind: "timer", on: true })).toEqual({ kind: "timer", on: true });
    expect(parseCommand({ kind: "timer", on: "yes" })).toBeNull();
    expect(parseCommand({ kind: "paperwork", rxId: 1, action: handover })).toMatchObject({ kind: "paperwork", rxId: 1 });
    expect(parseCommand({ kind: "paperwork", rxId: null, action: { act: "bin", sheet: "orders" } })).toMatchObject({ rxId: null });
    expect(parseCommand({ kind: "paperwork", rxId: -1, action: handover })).toBeNull();
    expect(parseCommand({ kind: "paperwork", rxId: 1, action: { ...handover, messages: 1.5 } })).toBeNull();
    expect(parseCommand({ kind: "paperwork", rxId: 1, action: { act: "bin", sheet: "evil" } })).toBeNull();
    expect(parseCommand({ kind: "paperwork", rxId: 1, action: { act: "stamp", sheet: "output", color: "green", stampsBefore: 0 } })).toBeNull();
    expect(parseCommand({ kind: "paperwork", rxId: 1 })).toBeNull();
    expect(parseCommand({ kind: "dispose", rxId: 2, sheet: "input", how: "burn" })).toEqual({ kind: "dispose", rxId: 2, sheet: "input", how: "burn" });
    expect(parseCommand({ kind: "dispose", rxId: 2, sheet: "mission", how: "burn" })).toBeNull();
    expect(parseCommand({ kind: "dispose", rxId: 2, sheet: "input", how: "eat" })).toBeNull();
  });
  it("a watch with citations saves as v2, reloads by replay with the same events, and old saves still parse", () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
    const s = Session.fresh(11, storage);
    s.dispatch({ kind: "timer", on: true });
    for (let i = 0; i < 700; i++) s.step();
    s.dispatch({ kind: "paperwork", rxId: 1, action: { act: "bin", sheet: "orders" } });
    s.dispatch({ kind: "paperwork", rxId: 2, action: { act: "stamp", sheet: "input", color: "blue", stampsBefore: 0 } });
    s.save();
    const raw = mem.get(SAVE_KEY) as string;
    expect(JSON.parse(raw).v).toBe(2);
    const back = Session.restore(storage, 11);
    expect(back).not.toBeNull();
    const cites = (x: Session) => x.watch.bus.getLog().filter((e) => e.type === "CITATION" || e.type === "CONSEQUENCE");
    expect(JSON.stringify(cites(back as Session))).toBe(JSON.stringify(cites(s)));
    expect(cites(s).length).toBeGreaterThan(0);
    // a save made before G3 (no new command kinds) is unchanged
    expect(parseSave(JSON.stringify({ v: 2, seed: 5, untilTick: 10, commands: [{ tick: 3, cmd: { kind: "speed", kn: 4 } }] }))).not.toBeNull();
  });
  it("the store rebuilds citations and lost items from the event log", () => {
    const h = harness(11); runTo(h, 700);
    h.session.dispatch({ kind: "paperwork", rxId: 1, action: { act: "bin", sheet: "orders" } });
    const store = new Store();
    rebuildStore(store, h.session.watch.bus.getLog(), h.session.watch.commandLog(), h.session.watch.tSec);
    expect(store.state.citations).toBe(1);
    expect(store.state.lostItems.size).toBe(1);
  });
});
