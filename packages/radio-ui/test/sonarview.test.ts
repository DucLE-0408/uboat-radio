import { describe, expect, it } from "vitest";
import { BALANCE, type SimEvent } from "@uboat/sim-core";
import { conditions, HIST_MAX, HIST_SEC, strengthLevel } from "../src/scene/sonarview";
import { Store } from "../src/store";

describe("signal bands", () => {
  it("are coarse and monotone", () => {
    expect([-5, 5.9, 6, 13.9, 14, 40].map(strengthLevel)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

describe("listening conditions", () => {
  it("fall with own speed, flag cavitation, and say when our own noise is the limit", () => {
    const still = conditions(0, null), slow = conditions(5, null), fast = conditions(9, null);
    expect(still.rangeKm).toBeGreaterThanOrEqual(slow.rangeKm); expect(slow.rangeKm).toBeGreaterThan(fast.rangeKm);
    expect(still.verdict).toBe("good"); expect(still.cavitating).toBe(false);
    expect(fast.cavitating).toBe(true); expect(fast.verdict).not.toBe("good"); expect(fast.selfLimited).toBe(true);
    expect(still.seaState).toBe(BALANCE.watch.seaState); expect(conditions(0, 7).seaState).toBe(7);
  });
  it("a rough sea shortens the range for everyone", () => {
    expect(conditions(0, 7).bestKm).toBeLessThan(conditions(0, 2).bestKm);
  });
});

describe("sonar history and ASDIC in the store", () => {
  const obs = (id: number, b: number): { id: number; bearingDeg: number; bladeRateHz: number; snrDb: number; guess: "slow" } => ({ id, bearingDeg: b, bladeRateHz: 5, snrDb: 10, guess: "slow" });
  it("keeps ten minutes of points, bounded, and drops the old ones", () => {
    const s = new Store();
    for (let t = 0; t < HIST_SEC + 50; t++) { s.state.tSec = t; s.setListen([obs(1, t % 360)]); }
    expect(s.state.sonarHist.length).toBeLessThanOrEqual(HIST_SEC + 1);
    expect((s.state.sonarHist[0] as { t: number }).t).toBeGreaterThanOrEqual(49);
    for (let t = 700; t < 700 + 5; t++) { s.state.tSec = t; s.setListen(Array.from({ length: 400 }, (_, i) => obs(i, i))); }
    expect(s.state.sonarHist.length).toBeLessThanOrEqual(HIST_MAX);
  });
  it("remembers when we were last pinged", () => {
    const s = new Store();
    expect(s.state.asdicAt).toBe(-1e9);
    s.apply({ type: "ASDIC_PING", tSec: 321, contactId: 100, bearingDeg: 12, rangeM: 1800 } as SimEvent);
    expect(s.state.asdicAt).toBe(321);
  });
});
