import { describe, expect, it } from "vitest";
import type { SimEvent } from "@uboat/sim-core";
import { explainRefusal, observedFacts } from "../src/refusal";
import { Store } from "../src/store";

const fist = { wpm: 18, dahRatio: 3, gapStretch: 1, jitter: 0.05 };
const rx = (id: number): SimEvent => ({ type: "MSG_RX", tSec: 60, rxId: id, attempt: 0, from: "ABC", net: "HQ", sentAtMin: 1300, indicator: "ABCD", tokens: ".-", snrDb: 30, txFist: fist, dfBearingDeg: 0 });

describe("refusal feedback (facts only, never a cause)", () => {
  it("lists observable silence/antenna state for transmit-type commands", () => {
    const s = new Store();
    s.state.boat = { ...s.state.boat, silence: true, antennaUp: false, mode: "dive", canTransmit: false };
    const text = explainRefusal({ kind: "transmit", seconds: 10 }, s.state);
    expect(text).toContain("Order not accepted. Observed:");
    expect(text).toContain("radio silence is on");
    expect(text).toContain("antenna is down (boat mode: dive)");
    expect(text).not.toMatch(/because|due to|since|refused because/i);
  });

  it("reports message-state facts for check without inventing a reason", () => {
    const s = new Store();
    s.apply(rx(1));
    expect(observedFacts({ kind: "check", rxId: 1 }, s.state)).toEqual(["no challenge has been sent for #1"]);
    s.apply({ type: "CHALLENGE_SENT", tSec: 70, rxId: 1, row: "A", col: "B" });
    expect(observedFacts({ kind: "check", rxId: 1 }, s.state)).toEqual(["no reply has arrived yet"]);
    s.apply({ type: "CHALLENGE_REPLY", tSec: 90, rxId: 1, reply: "C" });
    expect(observedFacts({ kind: "check", rxId: 1 }, s.state)).toEqual([]);
    expect(explainRefusal({ kind: "check", rxId: 1 }, s.state)).toBe("Order not accepted. Nothing observable explains it.");
  });

  it("handles resolved, unknown and ended states", () => {
    const s = new Store();
    s.apply(rx(1));
    s.apply({ type: "MSG_RESOLVED", tSec: 100, rxId: 1, decision: "accept", forged: false, correct: true });
    expect(observedFacts({ kind: "resolve", rxId: 1, decision: "accept" }, s.state)).toEqual(["message #1 is already accepted"]);
    expect(observedFacts({ kind: "repeat", rxId: 9 }, s.state)).toEqual(["no message #9 on record"]);
    s.apply({ type: "WATCH_END", tSec: 1800, reason: "time" });
    expect(observedFacts({ kind: "transmit", seconds: 5 }, s.state)).toEqual(["the watch has ended"]);
  });
});
