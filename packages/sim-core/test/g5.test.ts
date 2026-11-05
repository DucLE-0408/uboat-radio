import { describe, expect, it } from "vitest";
import { replay, Watch } from "../src/watch";
import { defaultOptions, parseOptions, ALL_MODULES, type WatchOptions } from "../src/options";
import { generateForgery, generateGenuine, gridToPos, isLandGrid, moveBrief, posToGrid, verifyTells, type Vec } from "../src/messages";
import { derive } from "../src/rng";
import { BALANCE } from "../src/balance";
import type { SimEvent } from "../src/events";

const ev = <T extends SimEvent["type"]>(w: Watch, type: T): Extract<SimEvent, { type: T }>[] =>
  w.bus.getLog().filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
const endless = (over: Partial<WatchOptions> = {}): WatchOptions => ({ ...defaultOptions("endless"), ...over });
const headingTo = (from: Vec, to: Vec): number => ((Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI + 360) % 360;

/** First movement order the watch has delivered, running at most `limit` seconds. */
function untilMove(w: Watch, limit: number): Extract<SimEvent, { type: "MSG_RX" }> {
  while (w.tSec < limit) {
    const rx = ev(w, "MSG_RX").find((e) => e.attempt === 0 && w.replyRequest(e.rxId) !== null && (w.truthOf(e.rxId) !== undefined) && w.copy(e.tokens).length >= 0 && isMove(w, e.rxId));
    if (rx) return rx;
    w.step();
  }
  throw new Error("no movement order");
}
const isMove = (w: Watch, id: number): boolean => (w as unknown as { rx: Map<number, { move: unknown }> }).rx.get(id)?.move != null;

describe("grid arithmetic and briefs", () => {
  it("posToGrid inverts gridToPos at sub-cell resolution and refuses positions off the map", () => {
    for (const g of ["AA11", "BC57", "MN99", "ZZ19", "KL35"]) { const p = gridToPos(g) as Vec; expect(posToGrid(p)).toBe(g); }
    expect(posToGrid({ x: -1, y: 5 })).toBeNull(); expect(posToGrid({ x: 26 * 90 + 1, y: 5 })).toBeNull();
  });
  it("moveBrief picks an ocean cell in range and a deadline from the assumed speed", () => {
    const own = { x: 1000, y: 1100 };
    for (let s = 0; s < 40; s++) {
      const b = moveBrief(derive(s, "t"), own) as NonNullable<ReturnType<typeof moveBrief>>;
      expect(b).not.toBeNull(); expect(isLandGrid(b.grid)).toBe(false);
      expect(b.distKm).toBeGreaterThan(BALANCE.move.minKm - 8); expect(b.distKm).toBeLessThan(BALANCE.move.maxKm + 8); // cell centres shift the distance a little
      expect(b.minutes).toBe(Math.max(5, Math.ceil((b.distKm / (BALANCE.move.assumedKn * 1.852)) * 60 * BALANCE.move.marginFactor)));
    }
    expect(moveBrief(derive(1, "t"), { x: 5000, y: 5000 })).toBeNull(); // far off the map: no cell
  });
});

describe("movement orders as messages (D8)", () => {
  it("genuine orders show no tell and forged ones keep at least one, on 300 seeds and every Intel level", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const w = new Watch(seed), ctx = w.worldCtx();
      const g = generateGenuine(seed, 5, "MOVE", ctx);
      expect(g.msg.kind).toBe("MOVE"); expect(g.msg.plain.startsWith("NAVIGATIONSBEFEHL")).toBe(true); expect(g.move).toBeDefined();
      expect(verifyTells(g.msg, ctx)).toEqual([]);
      for (let lv = 0; lv <= 4; lv++) {
        const f = generateForgery(seed, 6, "MOVE", lv, ctx);
        expect(f.truth.tells.length).toBeGreaterThanOrEqual(1);
        expect(f.truth.tells.every((t) => t === "fist" || t === "timestamp")).toBe(true);
        for (const t of verifyTells(f.msg, ctx)) expect(f.truth.tells).toContain(t);
      }
    }
  });
  it("assessTells treats a movement order's grid as a destination (no false grid or bearing tell)", () => {
    const w = new Watch(11, BALANCE, endless({ modules: { ...ALL_MODULES, timer: false } })); w.runUntil(2500);
    const rxs = ev(w, "MSG_RX").filter((e) => e.attempt === 0 && isMove(w, e.rxId) && !w.truthOf(e.rxId)?.forged);
    expect(rxs.length).toBeGreaterThan(0);
    for (const e of rxs) {
      const d = w.decipher(e.indicator, w.copy(e.tokens));
      const tells = w.assess(e, d.plain);
      if (d.damagedGroups === 0) expect(tells.filter((t) => t === "grid" || t === "bearing")).toEqual([]);
    }
  });
  it("only Endless with the map module issues them", () => {
    const on = new Watch(7, BALANCE, endless()); on.runUntil(3000);
    expect(ev(on, "MSG_RX").some((e) => isMove(on, e.rxId))).toBe(true);
    const off = new Watch(7, BALANCE, endless({ modules: { ...ALL_MODULES, map: false } })); off.runUntil(3000);
    expect(ev(off, "MSG_RX").some((e) => isMove(off, e.rxId))).toBe(false);
    const night = new Watch(7); night.runUntil(2000);
    expect(ev(night, "MSG_RX").some((e) => isMove(night, e.rxId))).toBe(false);
  });
  it("saves from before the map module (six modules) still parse with the map on", () => {
    const old = { ...defaultOptions("endless"), modules: { timer: true, rotors: true, stamps: true, signatures: true, cables: true, teletyper: true } };
    expect(parseOptions(old)?.modules.map).toBe(true);
    expect(parseOptions({ ...old, modules: { ...old.modules, map: "yes" } })).toBeNull();
  });
});

describe("orders in force", () => {
  const prep = (seed: number): { w: Watch; id: number; target: Vec } => {
    const w = new Watch(seed, BALANCE, endless({ modules: { ...ALL_MODULES, timer: false, stamps: false } }));
    const m = untilMove(w, 6000);
    w.dispatch({ kind: "resolve", rxId: m.rxId, decision: "accept" });
    const acc = ev(w, "ORDER_ACCEPTED").at(-1) as Extract<SimEvent, { type: "ORDER_ACCEPTED" }>;
    return { w, id: m.rxId, target: gridToPos(acc.grid) as Vec };
  };
  it("accepting announces the ordered cell and deadline; sailing there in time reaches it", () => {
    const { w, id, target } = prep(7);
    const acc = ev(w, "ORDER_ACCEPTED").at(-1) as Extract<SimEvent, { type: "ORDER_ACCEPTED" }>;
    expect(acc).toMatchObject({ rxId: id }); expect(acc.deadlineSec).toBeGreaterThan(0);
    w.dispatch({ kind: "heading", deg: headingTo(w.worldCtx().ownPos, target) }); w.dispatch({ kind: "speed", kn: 14 });
    // steer by the navigator's fix as a player would, re-aiming every minute
    const until = w.tSec + acc.deadlineSec;
    while (w.tSec < until && ev(w, "ORDER_REACHED").length === 0 && w.endReason === null) {
      w.runUntil(w.tSec + 60); const f = w.navFix(); w.dispatch({ kind: "heading", deg: headingTo({ x: f.xKm, y: f.yKm }, target) });
    }
    expect(ev(w, "ORDER_REACHED")).toMatchObject([{ rxId: id }]);
    expect(ev(w, "ORDER_FAILED")).toHaveLength(0);
  });
  it("missing the deadline costs a resupply point first and sends a note; it is not a citation", () => {
    const { w, id } = prep(7);
    const acc = ev(w, "ORDER_ACCEPTED").at(-1) as Extract<SimEvent, { type: "ORDER_ACCEPTED" }>;
    w.runUntil(w.tSec + acc.deadlineSec + 5);
    const f = ev(w, "ORDER_FAILED");
    expect(f).toHaveLength(1); expect(f[0]).toMatchObject({ rxId: id }); expect(f[0]?.lostItem?.startsWith("supply")).toBe(true);
    expect(w.orderItems().filter((i) => i.lost).map((i) => i.kind)).toEqual(["resupply"]);
    expect(w.citationCount).toBe(0);
    expect(ev(w, "PRIVATE_MSG").some((m) => m.topic === "orderFailed" && m.fromRole === "captain")).toBe(true);
  });
  it("rejecting a movement order starts nothing", () => {
    const w = new Watch(7, BALANCE, endless({ modules: { ...ALL_MODULES, timer: false } }));
    const m = untilMove(w, 6000); w.dispatch({ kind: "resolve", rxId: m.rxId, decision: "reject" });
    w.runUntil(w.tSec + 4000);
    expect(ev(w, "ORDER_ACCEPTED").filter((e) => e.rxId === m.rxId)).toHaveLength(0);
  });
});

describe("dead-reckoning", () => {
  it("the estimate starts exact, drifts with distance sailed, stays within its error circle, and is the same on replay", () => {
    const w = new Watch(3); const t0 = w.navFix();
    expect(t0.errKm).toBeCloseTo(BALANCE.nav.baseErrKm, 5);
    w.dispatch({ kind: "speed", kn: 12 }); w.dispatch({ kind: "heading", deg: 90 }); w.runUntil(1500);
    const f = w.navFix(), t = w.worldCtx().ownPos;
    const miss = Math.hypot(f.xKm - t.x, f.yKm - t.y);
    expect(f.errKm).toBeGreaterThan(t0.errKm); expect(miss).toBeGreaterThan(0); expect(miss).toBeLessThanOrEqual(f.errKm * 1.5);
    const r = replay(3, w.commandLog(), w.tickCount);
    expect(r.navFix()).toEqual(f);
  });
  it("does not change the night watch event log (D10)", () => {
    const a = new Watch(9), b = new Watch(9);
    a.dispatch({ kind: "speed", kn: 10 }); b.dispatch({ kind: "speed", kn: 10 });
    a.runUntil(1800); for (let t = 0; t < 1800; t += 100) { b.runUntil(t); b.navFix(); } b.runUntil(1800);
    expect(JSON.stringify(a.bus.getLog())).toBe(JSON.stringify(b.bus.getLog()));
  });
});
