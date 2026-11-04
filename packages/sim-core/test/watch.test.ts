import { describe, it, expect } from "vitest";
import { replay, Watch, type Command } from "../src/watch";
import { lookup } from "../src/auth";
import { BALANCE } from "../src/balance";
import type { SimEvent } from "../src/events";

type Rx = Extract<SimEvent, { type: "MSG_RX" }>;

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);

/** Run until the n-th MSG_RX for `rxId` exists (bounded). */
function untilRx(w: Watch, rxId: number, nth: number, limitSec: number): Rx {
  while (w.tSec < limitSec) {
    const got = ev(w, "MSG_RX").filter((e) => e.rxId === rxId);
    if (got.length >= nth) return got[nth - 1] as Rx;
    w.step();
  }
  throw new Error(`no MSG_RX ${rxId}#${nth} by ${limitSec}s`);
}

/** The operator's routine: copy -> decipher -> check letter. Returns what a human at the key would know. */
function read(w: Watch, rx: Rx) {
  const d = w.decipher(rx.indicator, w.copy(rx.tokens));
  return { d, checkOk: w.checkMatches(rx.from, d), tells: w.assess(rx, d.plain) };
}

/** Request repeats until the check letter matches (bounded); returns the clean reading. */
function copyCleanly(w: Watch, rxId: number, maxAttempts: number) {
  for (let n = 1; n <= maxAttempts; n++) {
    const rx = untilRx(w, rxId, n, 1700);
    const r = read(w, rx);
    if (r.checkOk) return { rx, ...r, attempts: n };
    w.dispatch({ kind: "repeat", rxId });
  }
  throw new Error("never copied cleanly");
}

describe("vertical slice: one night watch", () => {
  it("1 noisy Morse message: noise corrupts the copy, repeat requests cost transmit time, a clean copy deciphers", () => {
    // Seeds differ in how noisy the first copy is; find one where attempt 1 is damaged (the interesting case).
    let seen = false;
    for (let seed = 1; seed <= 40 && !seen; seed++) {
      const w = new Watch(seed);
      const first = untilRx(w, 1, 1, 200);
      const r1 = read(w, first);
      if (r1.checkOk) continue;
      seen = true;
      const before = w.summary().txTotalSec;
      const clean = copyCleanly(w, 1, 8);
      expect(clean.attempts).toBeGreaterThan(1);
      expect(w.summary().txTotalSec).toBeGreaterThanOrEqual(before); // repeats key the transmitter
      expect(ev(w, "TX").some((e) => e.purpose === "repeat")).toBe(true);
      expect(clean.d.plain.startsWith("ANGRIFFSBEFEHLXKONVOIX")).toBe(true);
      expect(clean.tells).toEqual([]); // genuine traffic never trips the verifier
      expect(w.dispatch({ kind: "resolve", rxId: 1, decision: "accept" })).toBe(true);
      expect(ev(w, "MSG_RESOLVED")[0]).toMatchObject({ rxId: 1, forged: false, correct: true });
    }
    expect(seen).toBe(true);
  });

  it("1 Intel-2 forgery: >=1 tell, check letter / challenge fail, rejecting is correct, no ambush", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const w = new Watch(seed);
      const rx = untilRx(w, 2, 1, 700);
      const truth = w.truthOf(2)!;
      expect(truth.forged).toBe(true);
      expect(truth.intelLevel).toBe(2); // scenario starts at Allied Intel level 2
      expect(truth.tells.length).toBeGreaterThanOrEqual(1);

      // Repeat until the deciphering is clean enough to judge the content (attempts cost tx time).
      let tells: string[] = [];
      let judged = false;
      let cur = rx;
      for (let n = 1; n <= 6 && !judged; n++) {
        const r = read(w, cur);
        if (r.d.damagedGroups === 0) { tells = r.tells; judged = true; break; }
        w.dispatch({ kind: "repeat", rxId: 2 });
        cur = untilRx(w, 2, n + 1, 1700);
      }
      if (!judged) continue; // too noisy this seed; other seeds cover the invariant
      // The invariant: every forgery has a verifiable tell, even when we only use observables.
      expect(tells.length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      expect(truth.tells.some((t) => tells.includes(t)), `seed ${seed}`).toBe(true);

      // Challenge-reply session on the forged sender.
      expect(w.dispatch({ kind: "challenge", rxId: 2 })).toBe(true);
      const sent = ev(w, "CHALLENGE_SENT")[0]!;
      while (ev(w, "CHALLENGE_REPLY").length === 0 && w.tSec < 1700) w.step();
      const reply = ev(w, "CHALLENGE_REPLY")[0]!;
      expect(reply.rxId).toBe(2);
      const expected = lookup(w.dayTable(), sent.row, sent.col);
      w.dispatch({ kind: "check", rxId: 2 });
      const auth = ev(w, "AUTH_RESULT")[0]!;
      expect(auth.ok).toBe(reply.reply === expected);
      expect(w.dispatch({ kind: "check", rxId: 2 })).toBe(false); // a cell is single-use

      w.dispatch({ kind: "resolve", rxId: 2, decision: "reject" });
      expect(ev(w, "MSG_RESOLVED")[0]).toMatchObject({ forged: true, correct: true });
      w.runUntil(1100);
      expect(ev(w, "ASDIC_PING")).toEqual([]);
      return;
    }
    throw new Error("no seed produced a judgeable forgery");
  });

  it("accepting the forgery lures an escort: ASDIC ping reaches the Bridge", () => {
    const w = new Watch(7);
    untilRx(w, 2, 1, 700);
    expect(w.dispatch({ kind: "resolve", rxId: 2, decision: "accept" })).toBe(true);
    w.runUntil(1500);
    const types = w.bus.getLog().map((e) => e.type);
    expect(types).toContain("ASDIC_PING");
    expect(types[types.indexOf("ASDIC_PING") + 1]).toBe("BRIDGE_ALERT"); // escalated to the Bridge immediately
    expect(ev(w, "SONAR_CONTACT").some((e) => e.contactId >= 100 && e.guess === "escort")).toBe(true);
  });

  it("1 sonar contact: the merchant becomes audible and is reported once, as slow traffic", () => {
    const w = new Watch(3);
    w.runUntil(600);
    const contacts = ev(w, "SONAR_CONTACT").filter((e) => e.contactId === 1);
    expect(contacts.length).toBeGreaterThanOrEqual(1);
    expect(contacts[0]!.guess).toBe("slow");
    expect(w.listen().every((o) => o.id === 1)).toBe(true);
  });

  it("HF/DF: long transmissions are detected, the chain FIX -> ESCORT_DISPATCHED -> DEPTH_CHARGE follows, Intel rises", () => {
    const longWatch = { ...BALANCE, watch: { ...BALANCE.watch, durationSec: 4 * 3600 } };
    const w = new Watch(11, longWatch);
    for (let i = 0; i < 6; i++) w.dispatch({ kind: "transmit", seconds: 120 });
    w.runUntil(4 * 3600);
    const types = w.bus.getLog().map((e) => e.type);
    expect(types).toContain("HFDF_FIX");
    expect(types.indexOf("ESCORT_DISPATCHED")).toBeGreaterThan(types.indexOf("HFDF_FIX"));
    expect(types.indexOf("DEPTH_CHARGE")).toBeGreaterThan(types.indexOf("ESCORT_DISPATCHED"));
    expect(ev(w, "INTEL_LEVEL").length).toBeGreaterThan(0);
    expect(w.summary().intelLevel).toBeGreaterThan(2);
  });

  it("a dived boat cannot transmit, is unheard, and misses traffic until it is back at the antenna", () => {
    const w = new Watch(5);
    w.dispatch({ kind: "mode", mode: "dive" });
    w.runUntil(90); // deep enough: exposure 0
    expect(w.boat.radio().canTransmit).toBe(false);
    expect(w.dispatch({ kind: "transmit", seconds: 30 })).toBe(false);
    expect(ev(w, "MSG_RX")).toEqual([]); // order scheduled at 60 s is held back
    w.dispatch({ kind: "mode", mode: "surface" });
    w.runUntil(300);
    expect(ev(w, "MSG_RX").length).toBeGreaterThan(0);
    expect(w.summary().txTotalSec).toBe(0);
  });

  it("BOAT_SUNK loses the keybook, jumps Intel to >= 2 and ends the watch", () => {
    const w = new Watch(9);
    w.dispatch({ kind: "mode", mode: "dive" });
    w.boat.diveTo(BALANCE.boat.depthChargeDropDepthM);
    w.runUntil(80);
    w.bus.emit({ type: "DEPTH_CHARGE", tSec: w.tSec });
    w.bus.emit({ type: "DEPTH_CHARGE", tSec: w.tSec });
    const types = w.bus.getLog().map((e) => e.type);
    expect(types).toContain("BOAT_SUNK");
    expect(ev(w, "KEYBOOK_LOST")[0]).toMatchObject({ net: "HQ", day: 1 });
    expect(ev(w, "WATCH_END")[0]).toMatchObject({ reason: "sunk" });
    expect(w.summary().endReason).toBe("sunk");
    expect(w.dispatch({ kind: "speed", kn: 5 })).toBe(false);
    const n = w.bus.getLog().length;
    w.step();
    expect(w.bus.getLog().length).toBe(n); // ended: nothing else happens
  });

  it("the watch ends on time", () => {
    const w = new Watch(2);
    w.runUntil(BALANCE.watch.durationSec + 10);
    expect(w.summary().endReason).toBe("time");
    expect(ev(w, "WATCH_END")).toHaveLength(1);
  });
});

describe("determinism and save/load", () => {
  const script: [number, Command][] = [
    [30, { kind: "speed", kn: 6 }], [40, { kind: "heading", deg: 90 }],
    [200, { kind: "repeat", rxId: 1 }], [320, { kind: "transmit", seconds: 40 }],
    [650, { kind: "challenge", rxId: 2 }], [760, { kind: "check", rxId: 2 }], [800, { kind: "resolve", rxId: 2, decision: "accept" }],
  ];
  const play = (seed: number): Watch => {
    const w = new Watch(seed);
    let i = 0;
    while (w.tSec < 1700) {
      while (i < script.length && (script[i] as [number, Command])[0] === w.tSec) w.dispatch((script[i++] as [number, Command])[1]);
      w.step();
    }
    return w;
  };

  it("same seed + same commands => byte-identical event log; different seed differs", () => {
    expect(JSON.stringify(play(21).bus.getLog())).toBe(JSON.stringify(play(21).bus.getLog()));
    expect(JSON.stringify(play(21).bus.getLog())).not.toBe(JSON.stringify(play(22).bus.getLog()));
  });

  it("save = seed + command log: replay reproduces the exact event log", () => {
    const a = play(33);
    const b = replay(33, a.commandLog(), a.tickCount);
    expect(JSON.stringify(b.bus.getLog())).toBe(JSON.stringify(a.bus.getLog()));
    expect(b.summary()).toEqual(a.summary());
  });

  it("observing never perturbs the simulation (listen/decipher/assess are side-effect free)", () => {
    const quiet = new Watch(44);
    const nosy = new Watch(44);
    for (let i = 0; i < 900; i++) {
      quiet.step();
      nosy.listen(); nosy.worldCtx();
      nosy.step();
    }
    expect(JSON.stringify(nosy.bus.getLog())).toBe(JSON.stringify(quiet.bus.getLog()));
  });
});
