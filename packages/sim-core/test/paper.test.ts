import { describe, expect, it } from "vitest";
import { replay, Watch, type Command } from "../src/watch";
import { judge, orderItems, lossOrder, validAction, type PaperAction } from "../src/paper";
import { BALANCE } from "../src/balance";
import type { SimEvent } from "../src/events";
import { Intel } from "../src/intel";

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);

const goodHandover: PaperAction = { act: "handover", echo: true, signed: true, inputStamps: 0, outputs: 1, outputRed: 1, outputOther: 0, messages: 1 };
const badBin: PaperAction = { act: "bin", sheet: "orders" };

describe("paper rules", () => {
  it("judge: correct work is clean; each mistake maps to a fault", () => {
    expect(judge(goodHandover)).toEqual([]);
    expect(judge({ act: "stamp", sheet: "output", color: "red", stampsBefore: 0 })).toEqual([]);
    expect(judge({ act: "stamp", sheet: "output", color: "blue", stampsBefore: 0 })).toEqual(["wrongStamp"]);
    expect(judge({ act: "stamp", sheet: "output", color: "red", stampsBefore: 1 })).toEqual(["wrongStamp"]);
    expect(judge({ act: "stamp", sheet: "input", color: "red", stampsBefore: 0 })).toEqual(["wrongStamp"]);
    expect(judge(badBin)).toEqual(["wrongBin"]);
    expect(judge({ ...goodHandover, signed: false } as PaperAction)).toEqual(["badHandover"]);
    expect(judge({ ...goodHandover, echo: false } as PaperAction)).toEqual(["badHandover"]);
    expect(judge({ ...goodHandover, outputs: 0, outputRed: 0 } as PaperAction)).toEqual(["badHandover"]);
    expect(judge({ ...goodHandover, inputStamps: 1 } as PaperAction)).toEqual(["wrongStamp"]);
    expect(judge({ ...goodHandover, outputRed: 0, outputOther: 1 } as PaperAction).sort()).toEqual(["wrongStamp"]);
  });
  it("validAction refuses malformed facts", () => {
    expect(validAction(goodHandover)).toBe(true);
    expect(validAction({ ...goodHandover, messages: -1 } as PaperAction)).toBe(false);
    expect(validAction({ ...goodHandover, messages: 1.5 } as PaperAction)).toBe(false);
    expect(validAction({ act: "bin", sheet: "nope" } as unknown as PaperAction)).toBe(false);
    expect(validAction({ act: "stamp", sheet: "output", color: "green", stampsBefore: 0 } as unknown as PaperAction)).toBe(false);
    expect(validAction({ act: "x" } as unknown as PaperAction)).toBe(false);
  });
  it("order items are seed-derived and the loss order is a permutation of them", () => {
    const a = orderItems(7, BALANCE), b = orderItems(7, BALANCE), c = orderItems(8, BALANCE);
    expect(a).toEqual(b); expect(a).not.toEqual(c);
    expect(a.filter((i) => i.kind === "safeCoords")).toHaveLength(2); expect(a.filter((i) => i.kind === "resupply")).toHaveLength(2);
    expect(lossOrder(7, a).sort()).toEqual(a.map((i) => i.id).sort());
    expect(lossOrder(7, a)).toEqual(lossOrder(7, a));
  });
  it("Intel.mark raises exactly one level and never past 4", () => {
    const i = new Intel(); for (let k = 0; k < 6; k++) { const before = i.level; i.mark(); expect(i.level).toBe(Math.min(4, before + 1)); }
  });
});

/** Distinct (message, fault) pairs the tests can use: message 1 and 2 both exist in the vertical slice. */
function citeN(w: Watch, n: number): void {
  const faults: [number | null, PaperAction][] = [
    [1, { act: "stamp", sheet: "input", color: "blue", stampsBefore: 0 }],
    [1, badBin], [2, { act: "stamp", sheet: "input", color: "blue", stampsBefore: 0 }], [2, badBin],
    [1, { act: "handover", echo: false, signed: true, inputStamps: 0, outputs: 1, outputRed: 1, outputOther: 0, messages: 1 }],
  ];
  for (let k = 0; k < n; k++) { const [rxId, action] = faults[k] as [number | null, PaperAction]; w.dispatch({ kind: "paperwork", rxId, action }); }
}
const withRx = (): Watch => { const w = new Watch(11); w.runUntil(700); return w; }; // both slice messages (t=60, 600) have arrived

describe("citations and consequences", () => {
  it("never cites without paperwork (P5 and classic behave as before)", () => {
    const w = new Watch(11); w.runUntil(1800);
    expect(ev(w, "CITATION")).toHaveLength(0); expect(ev(w, "CONSEQUENCE")).toHaveLength(0);
  });
  it("is idempotent per (message, fault)", () => {
    const w = withRx();
    for (let k = 0; k < 3; k++) w.dispatch({ kind: "paperwork", rxId: 1, action: { act: "stamp", sheet: "input", color: "blue", stampsBefore: 0 } });
    expect(ev(w, "CITATION")).toHaveLength(1);
    expect(w.citationCount).toBe(1);
  });
  it("refuses unknown messages and bad facts", () => {
    const w = withRx();
    expect(w.dispatch({ kind: "paperwork", rxId: 99, action: badBin })).toBe(false);
    expect(w.dispatch({ kind: "paperwork", rxId: 1, action: { ...goodHandover, messages: 7.5 } as PaperAction })).toBe(false);
    expect(w.dispatch({ kind: "paperwork", rxId: null, action: goodHandover })).toBe(false);
    expect(w.citationCount).toBe(0);
  });
  it("tiers: 1-2 warning + lost item + Intel mark; 3 located + attack; 4 severe; 5 executed", () => {
    const w = withRx(); const lv0 = w.summary().intelLevel;
    citeN(w, 1);
    expect(ev(w, "CONSEQUENCE").at(-1)).toMatchObject({ level: "warning", count: 1 });
    expect(ev(w, "CITATION")[0]?.lostItem).not.toBeNull();
    expect(w.summary().intelLevel).toBeGreaterThanOrEqual(Math.min(4, lv0 + 1));
    citeN(w, 2);
    expect(ev(w, "CONSEQUENCE").map((e) => e.level)).toEqual(["warning", "warning"]);
    expect(ev(w, "CITATION").map((e) => e.lostItem !== null)).toEqual([true, true]);
    const fixesBefore = ev(w, "HFDF_FIX").length;
    citeN(w, 3);
    expect(ev(w, "CONSEQUENCE").at(-1)).toMatchObject({ level: "located", count: 3, positionKnown: 0.8 });
    expect(ev(w, "CITATION")[2]?.lostItem).toBeNull();
    expect(ev(w, "HFDF_FIX").length).toBe(fixesBefore + 1);
    w.runUntil(w.tSec + 600); // the escort and its depth charge arrive on the usual schedule
    expect(ev(w, "ESCORT_DISPATCHED").length).toBeGreaterThanOrEqual(1);
    expect(ev(w, "DEPTH_CHARGE").length).toBeGreaterThanOrEqual(1);
    citeN(w, 4);
    expect(ev(w, "CONSEQUENCE").at(-1)).toMatchObject({ level: "severe", count: 4, positionKnown: 0.9 });
    expect(ev(w, "CITATION")[3]?.lostItem).not.toBeNull();
    const lost = ev(w, "CITATION").map((e) => e.lostItem).filter((x) => x !== null);
    expect(new Set(lost).size).toBe(3); // three different items taken, in the seed's order
    expect(w.orderItems().filter((i) => i.lost)).toHaveLength(3);
    if (w.endReason === null) {
      citeN(w, 5);
      expect(ev(w, "CONSEQUENCE").at(-1)).toMatchObject({ level: "executed", count: 5 });
      expect(w.endReason).toBe("executed");
      expect(ev(w, "WATCH_END").at(-1)).toMatchObject({ reason: "executed" });
      expect(w.dispatch({ kind: "speed", kn: 3 })).toBe(false);
    }
  });
  it("the fifth citation ends the watch even before any attack lands", () => {
    const w = withRx(); citeN(w, 5);
    expect(w.endReason).toBe("executed"); expect(w.summary().citations).toBe(5);
  });
});

describe("sim-time deadline (timer)", () => {
  it("cites 'timeout' once per message only when the timer is on and the message is not handed over", () => {
    const off = new Watch(11); off.runUntil(1000);
    expect(ev(off, "CITATION")).toHaveLength(0);
    const w = new Watch(11); w.dispatch({ kind: "timer", on: true });
    w.runUntil(60 + BALANCE.paper.deadlineSec - 1); expect(ev(w, "CITATION")).toHaveLength(0);
    w.runUntil(60 + BALANCE.paper.deadlineSec + 5);
    expect(ev(w, "CITATION")).toMatchObject([{ rxId: 1, reason: "timeout", count: 1 }]);
    w.runUntil(900); // message 2 (t=600) expires too, message 1 is not cited twice
    expect(ev(w, "CITATION").map((e) => `${e.rxId}:${e.reason}`)).toEqual(["1:timeout", "2:timeout"]);
  });
  it("handing a message over stops its clock", () => {
    const w = new Watch(11); w.dispatch({ kind: "timer", on: true }); w.runUntil(70);
    w.dispatch({ kind: "paperwork", rxId: 1, action: goodHandover });
    w.runUntil(200);
    expect(ev(w, "CITATION")).toHaveLength(0);
  });
  it("switching the timer on late counts overdue messages at once", () => {
    const w = new Watch(11); w.runUntil(400); w.dispatch({ kind: "timer", on: true });
    expect(ev(w, "CITATION")).toMatchObject([{ rxId: 1, reason: "timeout" }]);
  });
});

describe("determinism and save", () => {
  it("same seed + command log => identical event log (replay)", () => {
    const w = new Watch(23); const cmds: Command[] = [{ kind: "timer", on: true }];
    cmds.forEach((c) => w.dispatch(c)); w.runUntil(100);
    citeN(w, 3); w.runUntil(900);
    const r = replay(23, w.commandLog(), w.tickCount);
    expect(JSON.stringify(r.bus.getLog())).toBe(JSON.stringify(w.bus.getLog()));
    expect(r.summary()).toEqual(w.summary());
  });
  it("a different seed gives a different loss order (not hard-coded)", () => {
    const lost = (seed: number): (string | null)[] => { const w = new Watch(seed); w.runUntil(700); citeN(w, 2); return ev(w, "CITATION").map((e) => e.lostItem); };
    const orders = new Set([1, 2, 3, 4, 5, 6].map((s) => lost(s).join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });
});

import { dayOrder, judgeDispose, DAY_ORDERS } from "../src/paper";
describe("standing order and dispose", () => {
  it("judgeDispose follows the day's order", () => {
    expect(judgeDispose("burnInput", "input", "burn")).toEqual([]);
    expect(judgeDispose("burnInput", "input", "archive")).toEqual(["orderBreach"]);
    expect(judgeDispose("burnInput", "output", "archive")).toEqual([]);
    expect(judgeDispose("archiveOutput", "output", "burn")).toEqual(["orderBreach"]);
    expect(judgeDispose("archiveOutput", "output", "archive")).toEqual([]);
    expect(judgeDispose("keepNothing", "input", "burn")).toEqual(["orderBreach"]);
  });
  it("the day order is seed-derived from the three orders", () => {
    const seen = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => dayOrder(s, 1)));
    expect(seen.size).toBeGreaterThan(1); for (const o of seen) expect(DAY_ORDERS).toContain(o);
  });
  it("dispose works only after the hand-over and cites a breach once", () => {
    let seed = 1; while (dayOrder(seed, 1) !== "keepNothing") seed++;
    const w = new Watch(seed); w.runUntil(100);
    expect(w.dispatch({ kind: "dispose", rxId: 1, sheet: "input", how: "burn" })).toBe(false); // not handed over yet
    w.dispatch({ kind: "paperwork", rxId: 1, action: goodHandover });
    expect(w.dispatch({ kind: "dispose", rxId: 1, sheet: "input", how: "burn" })).toBe(true);
    w.dispatch({ kind: "dispose", rxId: 1, sheet: "input", how: "burn" });
    expect(ev(w, "CITATION")).toMatchObject([{ rxId: 1, reason: "orderBreach", count: 1 }]);
    expect(w.standingOrder()).toBe("keepNothing");
  });
});
