import { describe, expect, it } from "vitest";
import type { SimEvent } from "@uboat/sim-core";
import { Session } from "../src/sim/session";
import { rebuildStore, Store, formatClock, formatDtg, COPY_MAX } from "../src/store";

const fist = { wpm: 18, dahRatio: 3, gapStretch: 1, jitter: 0.05 };
const rxEv = (rxId: number, attempt = 0, tSec = 60): SimEvent =>
  ({ type: "MSG_RX", tSec, rxId, attempt, from: "ABC", net: "HQ", sentAtMin: 1300, indicator: "ABCD", tokens: ".-_-...", snrDb: 30, txFist: fist, dfBearingDeg: 10 });

describe("store reducer", () => {
  it("MSG_RX creates a view, activates the first message and logs attempts", () => {
    const s = new Store();
    s.apply(rxEv(1));
    s.apply(rxEv(2, 0, 100));
    s.apply(rxEv(1, 1, 150));
    expect(s.state.activeRx).toBe(1);
    expect(s.state.activeAttempt).toBe(1); // a repeat of the active message jumps to the new attempt
    expect(s.state.rx.get(2)?.unread).toBe(true);
    expect(s.state.rx.get(1)?.attempts.map((a) => a.attempt)).toEqual([0, 1]);
  });

  it("keeps copy per rxId and per attempt", () => {
    const s = new Store();
    s.apply(rxEv(1));
    s.typeChar("A"); s.typeChar("B");
    s.apply(rxEv(1, 1, 120));
    s.typeChar("C");
    expect(s.copyText(1, 0)).toBe("AB");
    expect(s.copyText(1, 1)).toBe("C");
    s.cycleAttempt(-1);
    expect(s.state.activeAttempt).toBe(0);
  });

  it("space never leads or doubles; backspace removes; length is bounded", () => {
    const s = new Store();
    s.apply(rxEv(1));
    s.typeChar(" ");
    s.typeChar("A"); s.typeChar(" "); s.typeChar(" "); s.typeChar("?");
    expect(s.copyText(1, 0)).toBe("A ?");
    s.backspace();
    expect(s.copyText(1, 0)).toBe("A ");
    for (let i = 0; i < COPY_MAX + 20; i++) s.typeChar("Q");
    expect(s.copyText(1, 0).length).toBe(COPY_MAX);
  });

  it("handles sonar, tx, hfdf, escort and bridge alert events", () => {
    const s = new Store();
    s.apply({ type: "SONAR_CONTACT", tSec: 5, contactId: 1, bearingDeg: 45, snrDb: 4, bladeRateHz: 10, guess: "escort" });
    s.apply({ type: "TX", tSec: 10, seconds: 8, purpose: "repeat" });
    s.apply({ type: "HFDF_FIX", tSec: 20, freqKhz: 7000, cumulativeTxSec: 99 });
    s.apply({ type: "ESCORT_DISPATCHED", tSec: 21, etaSec: 300 });
    s.apply({ type: "BRIDGE_ALERT", tSec: 30, reason: "asdic" });
    expect(s.state.sonar.get(1)?.guess).toBe("escort");
    expect(s.state.tx.keyedUntilSec).toBe(18);
    expect(s.state.tx.locatedAtSec).toBe(20);
    expect(s.state.tx.escortAtSec).toBe(21);
    expect(s.state.emergency.reason).toBe("asdic");
    s.setClock(60, 8);
    expect(s.state.emergency.reason).toBeNull(); // emergency layout expires
  });

  it("never stores hazard / Intel / range numbers", () => {
    const s = new Store();
    s.apply({ type: "INTEL_LEVEL", tSec: 1, level: 3 });
    s.apply({ type: "ASDIC_PING", tSec: 2, contactId: 1, bearingDeg: 12.34, rangeM: 1234.5 });
    s.apply({ type: "HFDF_FIX", tSec: 3, freqKhz: 7000, cumulativeTxSec: 777 });
    const dump = JSON.stringify([...s.state.log]) + JSON.stringify(s.state.tx);
    expect(dump).not.toMatch(/1234|12\.34|777|Intel|intel/);
  });

  it("MSG_RESOLVED keeps only correctness, WATCH_END is recorded", () => {
    const s = new Store();
    s.apply(rxEv(1));
    s.apply({ type: "MSG_RESOLVED", tSec: 90, rxId: 1, decision: "reject", forged: true, correct: true });
    s.apply({ type: "WATCH_END", tSec: 1800, reason: "time" });
    expect(s.state.rx.get(1)?.resolved).toEqual({ decision: "reject", correct: true });
    expect(JSON.stringify(s.state.decisions)).not.toContain("forged");
    expect(s.state.ended).toBe("time");
  });

  it("flush notifies only subscribers of changed topics", () => {
    const s = new Store();
    let rx = 0, sonar = 0;
    s.on(["rx"], () => rx++);
    s.on(["sonar"], () => sonar++);
    s.apply(rxEv(1));
    s.flush(); s.flush();
    expect([rx, sonar]).toEqual([1, 0]);
  });

  it("formats clock and DTG", () => {
    expect(formatClock(125)).toBe("02:05");
    expect(formatDtg(1320)).toBe("2200");
    expect(formatDtg(1500)).toBe("0100");
  });
});

describe("rebuildStore (restore path)", () => {
  it("restored store equals the live-built store, including AUTH_RESULT attribution", () => {
    const s = Session.fresh(99, null);
    const live = new Store();
    s.watch.bus.subscribe((e) => live.apply(e));
    const run = (t: number): void => { while (s.watch.tSec < t && s.watch.endReason === null) s.step(); };
    run(70);
    s.dispatch({ kind: "challenge", rxId: 1 });
    run(130);
    live.noteCheck(1);
    expect(s.dispatch({ kind: "check", rxId: 1 })).toBe(true);
    run(200);
    const restored = new Store();
    rebuildStore(restored, s.watch.bus.getLog(), s.watch.commandLog());
    const norm = (st: Store): string => JSON.stringify({ rx: [...st.state.rx.values()].map((r) => ({ ...r, copy: [], analysis: [] })), log: st.state.log });
    expect(norm(restored)).toBe(norm(live));
    expect(restored.state.rx.get(1)?.challenge?.result).not.toBeNull();
  });
});
