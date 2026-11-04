import { describe, expect, it } from "vitest";
import { Session } from "../src/sim/session";
import { harness, runTo } from "./harness";

describe("controller (real Watch, inert audio)", () => {
  it("queues audio for a live MSG_RX but never for history after a restore", () => {
    const live = harness(42);
    runTo(live, 70);
    live.ctl.frame();
    expect(live.played.length).toBe(1);

    const saved = Session.fresh(42, null);
    const h0 = harness(42, saved);
    runTo(h0, 70);                      // history now exists in the bus log
    const restored = Session.fresh(42, null);
    restored.watch.runUntil(70);        // equivalent history, built before any controller exists
    const h1 = harness(42, restored);
    h1.ctl.frame(); h1.ctl.frame();
    expect(h1.played).toEqual([]);      // nothing from the past is replayed to the ear
    expect(h1.store.state.rx.size).toBe(1); // ...but the UI state is rebuilt
  });

  it("a refused check clears the pending correlation and reports facts only", () => {
    const h = harness(42);
    runTo(h, 70);
    h.ctl.check(); // no challenge sent yet => refused
    expect(h.store.state.pendingCheck).toBeNull();
    expect(h.store.state.notice?.text).toBe("Order not accepted. Observed: no challenge has been sent for #1.");
  });

  it("an accepted check attributes AUTH_RESULT to the checked message", () => {
    const h = harness(42);
    runTo(h, 70);
    h.ctl.challenge();
    runTo(h, 140);
    h.ctl.check();
    expect(h.store.state.rx.get(1)?.challenge?.result).not.toBeNull();
  });

  it("copy stays isolated per message attempt when a repeat arrives", () => {
    const h = harness(42);
    runTo(h, 70);
    h.store.typeChar("A"); h.store.typeChar("B");
    h.ctl.repeat();
    runTo(h, 200);
    expect(h.store.state.rx.get(1)?.attempts.length).toBeGreaterThanOrEqual(2);
    expect(h.store.copyText(1, 0)).toBe("AB");
    h.store.typeChar("Z");
    expect(h.store.copyText(1, 0)).toBe("AB");
    expect(h.store.copyText(1, h.store.state.activeAttempt)).toBe("Z");
  });
});
