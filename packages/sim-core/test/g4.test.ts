import { describe, expect, it } from "vitest";
import { replay, Watch, type Command } from "../src/watch";
import { ALL_MODULES, DIFFICULTIES, defaultOptions, parseOptions, type ModuleSet, type WatchOptions } from "../src/options";
import { deadlineSec, forgedProbability, gapSec } from "../src/endless";
import { absentRole, makeRoster, ROLES, successorOf } from "../src/roster";
import { encipherGroups, decipherCopy, dayEnigma } from "../src/traffic";
import { BALANCE } from "../src/balance";
import { pmAllowed } from "../src/pm";
import { airtimeSec, validSend } from "../src/send";
import type { SimEvent } from "../src/events";
import type { PaperAction } from "../src/paper";

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
const endless = (over: Partial<WatchOptions> = {}): WatchOptions => ({ ...defaultOptions("endless"), ...over });
const bin: PaperAction = { act: "bin", sheet: "orders" };
const cite = (w: Watch, rx: number, a: PaperAction = bin): boolean => w.dispatch({ kind: "paperwork", rxId: rx, action: a });
const stampBlue = (n: number): PaperAction => ({ act: "stamp", sheet: n % 2 ? "input" : "output", color: "blue", stampsBefore: 0 });

describe("options", () => {
  it("modules are independent of difficulty; parseOptions rejects anything unknown", () => {
    for (const d of DIFFICULTIES) expect(defaultOptions("endless").modules).toEqual(ALL_MODULES);
    expect(parseOptions(defaultOptions("endless"))).toEqual(defaultOptions("endless"));
    expect(parseOptions({ ...defaultOptions(), difficulty: "insane" })).toBeNull();
    expect(parseOptions({ ...defaultOptions(), mode: "x" })).toBeNull();
    expect(parseOptions({ ...defaultOptions(), modules: { ...ALL_MODULES, timer: "yes" } })).toBeNull();
    expect(parseOptions({ mode: "endless", difficulty: "easy", modules: { timer: true } })).toBeNull();
    expect(parseOptions(null)).toBeNull(); expect(parseOptions([])).toBeNull();
  });
  it("pacing: gaps shrink, forgeries rise, deadlines shrink, all clamped, and harder means faster", () => {
    for (const d of DIFFICULTIES) {
      expect(gapSec(BALANCE, d, 0)).toBeGreaterThan(gapSec(BALANCE, d, 30)); expect(gapSec(BALANCE, d, 500)).toBe(BALANCE.endless.difficulties[d].gapMin);
      expect(forgedProbability(BALANCE, d, 500)).toBe(BALANCE.endless.difficulties[d].pForgedMax);
      expect(deadlineSec(BALANCE, d, 500)).toBe(BALANCE.endless.difficulties[d].deadlineMin);
    }
    expect(gapSec(BALANCE, "hard", 0)).toBeLessThan(gapSec(BALANCE, "easy", 0));
    expect([gapSec(BALANCE, "easy", 0), gapSec(BALANCE, "normal", 0), gapSec(BALANCE, "hard", 0)]).toEqual([150, 100, 60]);
  });
});

describe("endless", () => {
  it("never ends by time, keeps producing messages, and drops the oldest when too many wait", () => {
    const w = new Watch(5, BALANCE, endless({ difficulty: "hard" })); w.runUntil(4000);
    expect(w.endReason).toBeNull();
    expect(ev(w, "MSG_RX").filter((e) => e.attempt === 0).length).toBeGreaterThan(30);
    expect(ev(w, "MSG_LOST").length).toBeGreaterThan(0); // nobody answered anything
    expect(ev(w, "WATCH_END")).toHaveLength(0);
  });
  it("the night watch without options is unchanged: no reply, no private messages, ends at dawn", () => {
    const w = new Watch(5); w.runUntil(2000);
    expect(w.endReason).toBe("time");
    expect(ev(w, "MSG_RX").every((e) => e.reply === undefined)).toBe(true);
    expect(w.dispatch({ kind: "leave" })).toBe(false);
    expect(w.crew().members).toEqual([]);
  });
  it("a fifth citation does not execute in Endless (only sinking or leaving ends it) but keeps attacking", () => {
    const w = new Watch(11, BALANCE, endless()); w.runUntil(400);
    const ids = ev(w, "MSG_RX").map((e) => e.rxId);
    for (let i = 0; i < 6; i++) cite(w, ids[i % ids.length] as number, stampBlue(i));
    // distinct (rx, fault) keys are limited, so also use other faults
    for (const id of ids) { cite(w, id); cite(w, id, { act: "handover", echo: false, signed: false, inputStamps: 0, outputs: 0, outputRed: 0, outputOther: 0, messages: 1 }); }
    expect(w.citationCount).toBeGreaterThanOrEqual(5);
    expect(w.endReason).toBeNull();
    expect(ev(w, "CONSEQUENCE").some((c) => c.level === "executed")).toBe(false);
    expect(ev(w, "CONSEQUENCE").filter((c) => c.level === "severe").length).toBeGreaterThanOrEqual(2);
  });
  it("leave ends the watch with 'left' and nothing more is accepted", () => {
    const w = new Watch(5, BALANCE, endless()); w.runUntil(100);
    expect(w.dispatch({ kind: "leave" })).toBe(true);
    expect(w.endReason).toBe("left"); expect(ev(w, "WATCH_END").at(-1)).toMatchObject({ reason: "left" });
    expect(w.dispatch({ kind: "speed", kn: 2 })).toBe(false);
    expect(w.summary()).toMatchObject({ endReason: "left", mode: "endless" });
  });
  it("same seed + options + command log => identical event log", () => {
    const o = endless({ difficulty: "normal" });
    const w = new Watch(31, BALANCE, o); w.runUntil(300);
    cite(w, 1); w.dispatch({ kind: "speed", kn: 3 }); w.runUntil(1200); w.dispatch({ kind: "leave" });
    const r = replay(31, w.commandLog(), w.tickCount, BALANCE, o);
    expect(JSON.stringify(r.bus.getLog())).toBe(JSON.stringify(w.bus.getLog()));
  });
});

describe("modules", () => {
  it("signatures off: nothing printed on the paper, and forged messages still carry a tell (D8) for every module set, difficulty and seed", () => {
    const sets: ModuleSet[] = [ALL_MODULES, { ...ALL_MODULES, signatures: false }, { ...ALL_MODULES, stamps: false, signatures: false }, { timer: false, rotors: false, stamps: false, signatures: false, cables: false, teletyper: false, map: false, weather: false, radar: false }];
    for (const modules of sets) for (const difficulty of DIFFICULTIES) for (let seed = 1; seed <= 25; seed++) {
      const w = new Watch(seed, BALANCE, { mode: "endless", modules, difficulty }); w.runUntil(1500);
      const rxs = ev(w, "MSG_RX").filter((e) => e.attempt === 0);
      expect(rxs.length).toBeGreaterThan(3);
      if (!modules.signatures) expect(rxs.every((e) => e.paper === undefined)).toBe(true); else expect(rxs.every((e) => e.paper !== undefined)).toBe(true);
      for (const e of rxs) { const t = w.truthOf(e.rxId); if (t?.forged) expect(t.tells.length + (t.paperTells?.length ?? 0)).toBeGreaterThanOrEqual(1); }
    }
  });
  it("stamps off: sheet faults are not judged; timeouts still count when the timer module is on", () => {
    const w = new Watch(11, BALANCE, endless({ modules: { ...ALL_MODULES, stamps: false } })); w.runUntil(100);
    expect(cite(w, 1)).toBe(true); expect(cite(w, 1, stampBlue(1))).toBe(true);
    expect(w.citationCount).toBe(0);
    w.runUntil(60 + BALANCE.endless.difficulties.normal.deadline0 + 10);
    expect(ev(w, "CITATION")).toMatchObject([{ rxId: 1, reason: "timeout" }]);
  });
  it("timer off in Endless: no timeouts", () => {
    const w = new Watch(11, BALANCE, endless({ modules: { ...ALL_MODULES, timer: false } })); w.runUntil(1500);
    expect(ev(w, "CITATION")).toHaveLength(0);
  });
});

describe("encipher and send", () => {
  it("encipherGroups is the inverse of decipherCopy, for any plugboard", () => {
    const base = dayEnigma(9, 1);
    for (const plug of [undefined, base.plugboard, [], ["AB", "CD"]]) {
      const c = encipherGroups(9, 1, "QWER", "attack at dawn please", plug);
      expect(c.split(" ").every((g) => g.length === 4)).toBe(true);
      expect(decipherCopy(9, 1, "QWER", c, plug).plain).toBe("ATTACKATDAWNPLEASEXX");
    }
  });
  it("send: a correct reply is read, a wrong one is not and is cited once per message; refused when it cannot be keyed", () => {
    const w = new Watch(11, BALANCE, endless({ modules: { ...ALL_MODULES, timer: false } })); w.runUntil(100);
    const req = w.replyRequest(1); expect(req).not.toBeNull();
    const groups = encipherGroups(11, 1, "ABCD", (req as NonNullable<typeof req>).plain);
    expect(w.dispatch({ kind: "send", rxId: 1, indicator: "ABCD", groups })).toBe(true);
    w.runUntil(w.tSec + 60);
    expect(ev(w, "SEND_RESULT")).toMatchObject([{ rxId: 1, ok: true }]);
    expect(ev(w, "TX").some((t) => t.purpose === "send")).toBe(true);
    expect(ev(w, "CITATION")).toHaveLength(0);
    const bad = encipherGroups(11, 1, "WXYZ", "NOPE", []);
    expect(w.dispatch({ kind: "send", rxId: 1, indicator: "WXYZ", groups: bad })).toBe(true);
    w.runUntil(w.tSec + 60);
    expect(ev(w, "SEND_RESULT").map((r) => r.ok)).toEqual([true, false]);
    expect(ev(w, "CITATION")).toMatchObject([{ rxId: 1, reason: "badSend", count: 1 }]);
    w.dispatch({ kind: "send", rxId: 1, indicator: "WXYZ", groups: bad }); w.runUntil(w.tSec + 60);
    expect(ev(w, "CITATION")).toHaveLength(1); // idempotent per message
    // boundary: bad letters, partial group, too long, unknown message
    expect(w.dispatch({ kind: "send", rxId: 1, indicator: "abcd", groups })).toBe(false);
    expect(w.dispatch({ kind: "send", rxId: 1, indicator: "ABCD", groups: "ABC" })).toBe(false);
    expect(w.dispatch({ kind: "send", rxId: 99, indicator: "ABCD", groups })).toBe(false);
    expect(validSend("ABCD", Array.from({ length: 60 }, () => "ABCD").join(" "), 200)).toBe(false);
    expect(airtimeSec("ABCD", 18)).toBeGreaterThan(0);
  });
  it("send is refused when the boat is silent or submerged, and without options", () => {
    const w = new Watch(11, BALANCE, endless({ modules: { ...ALL_MODULES, timer: false } })); w.runUntil(100);
    const groups = encipherGroups(11, 1, "ABCD", (w.replyRequest(1) as NonNullable<ReturnType<Watch["replyRequest"]>>).plain);
    w.dispatch({ kind: "silence", on: true });
    expect(w.dispatch({ kind: "send", rxId: 1, indicator: "ABCD", groups })).toBe(false);
    const n = new Watch(11); n.runUntil(100);
    expect(n.dispatch({ kind: "send", rxId: 1, indicator: "ABCD", groups })).toBe(false);
  });
});

describe("roster and private messages", () => {
  it("roster: distinct names, seed-derived, successor skips the absent role", () => {
    const a = makeRoster(7, BALANCE), b = makeRoster(7, BALANCE), c = makeRoster(8, BALANCE);
    expect(a).toEqual(b); expect(a).not.toEqual(c);
    expect(new Set(a.map((m) => m.name)).size).toBe(5); expect(a.map((m) => m.role)).toEqual([...ROLES]);
    expect(BALANCE.roster.names.length).toBe(40); expect(new Set(BALANCE.roster.names).size).toBe(40);
    expect(["xo", "chief", "sound"]).toContain(absentRole(3));
    expect(successorOf("xo", "xo")).not.toBe("xo"); expect(successorOf("captain", "xo")).toBe("captain");
  });
  it("a badly damaged hull makes one member absent, once", () => {
    const w = new Watch(5, BALANCE, endless()); w.runUntil(10);
    w.bus.emit({ type: "BOAT_DAMAGED", tSec: 10, hull: 70 }); expect(ev(w, "ROSTER_CHANGE")).toHaveLength(0);
    w.bus.emit({ type: "BOAT_DAMAGED", tSec: 11, hull: 40 }); w.bus.emit({ type: "BOAT_DAMAGED", tSec: 12, hull: 20 });
    expect(ev(w, "ROSTER_CHANGE")).toMatchObject([{ present: false }]);
    expect(w.crew().absent).toBe(ev(w, "ROSTER_CHANGE")[0]?.role);
  });
  it("private messages: only behaviour topics, spaced and capped, tone follows the citation count, none without options", () => {
    const w = new Watch(11, BALANCE, endless({ modules: { ...ALL_MODULES, timer: false } })); w.runUntil(300);
    cite(w, 1); expect(ev(w, "PRIVATE_MSG")).toMatchObject([{ tone: "remind", topic: "citation" }]);
    cite(w, 2); expect(ev(w, "PRIVATE_MSG")).toHaveLength(1);       // inside the spacing window
    w.runUntil(w.tSec + BALANCE.pm.gapSec + 1);
    cite(w, 1, stampBlue(1)); expect(ev(w, "PRIVATE_MSG")).toHaveLength(2);
    expect(ev(w, "PRIVATE_MSG")[1]?.tone).toBe("threat");
    for (const m of ev(w, "PRIVATE_MSG")) expect(["citation", "late", "longTx", "located", "badSend"]).toContain(m.topic);
    expect(pmAllowed(BALANCE, 100, [])).toBe(true);
    expect(pmAllowed(BALANCE, 1000, [0, 100, 200, 300, 400, 500])).toBe(false); // cap in the window
    const n = new Watch(11); n.runUntil(300); cite(n, 1); expect(ev(n, "PRIVATE_MSG")).toHaveLength(0);
  });
  it("long transmissions draw a reminder from the liaison", () => {
    const w = new Watch(5, BALANCE, endless({ modules: { ...ALL_MODULES, timer: false } })); w.runUntil(5);
    w.dispatch({ kind: "transmit", seconds: 200 }); w.runUntil(w.tSec + 210);
    expect(ev(w, "PRIVATE_MSG")).toMatchObject([{ topic: "longTx", fromRole: "liaison" }]);
  });
});
