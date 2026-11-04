import { describe, it, expect } from "vitest";
import { Boat } from "../src/boat";
import { EventBus, type SimEvent } from "../src/events";
import {
  bearingSigmaDeg, bladeRateHz, classifyBladeRate, noiseLevelDb, selfNoiseDb, SonarField, snrDb,
  transmissionLossDb, type Track,
} from "../src/sonar";
import { derive } from "../src/rng";
import { BALANCE } from "../src/balance";

const L = { x: 0, y: 0, speedKn: 3 };
const track = (over: Partial<Track> = {}): Track => ({
  id: 1, kind: "merchant", x: 0, y: 5000, courseDeg: 90, speedMs: 5, shaftRps: 1.5, blades: 4, srcLevelDb: 150, ...over,
});

describe("sonar math", () => {
  it("TL = 20log10(r) + alpha*r/1000", () => {
    expect(transmissionLossDb(1000)).toBeCloseTo(60 + 0.05, 6);
    expect(transmissionLossDb(10000)).toBeCloseTo(80 + 0.5, 6);
  });
  it("noise powers add; cavitation steps self noise up", () => {
    expect(selfNoiseDb(BALANCE.sonar.cavitationSpeedKn + 0.1) - selfNoiseDb(BALANCE.sonar.cavitationSpeedKn))
      .toBeGreaterThan(BALANCE.sonar.cavitationDb);
    expect(noiseLevelDb(3, 3)).toBeGreaterThan(Math.max(55 + 12, 45 + 4.5));
  });
  it("SNR falls with range and with own speed", () => {
    const near = snrDb(track({ y: 2000 }), L, 3), far = snrDb(track({ y: 12000 }), L, 3);
    expect(near).toBeGreaterThan(far);
    expect(snrDb(track(), { ...L, speedKn: 3 }, 3)).toBeGreaterThan(snrDb(track(), { ...L, speedKn: 9 }, 3));
  });
  it("bearing error is inversely proportional to SNR (within clamps)", () => {
    expect(bearingSigmaDeg(10)).toBeCloseTo(3, 10);
    expect(bearingSigmaDeg(20)).toBeCloseTo(1.5, 10);
    expect(bearingSigmaDeg(0.1)).toBe(BALANCE.sonar.bearingErrorMaxDeg);
    expect(bearingSigmaDeg(1e6)).toBe(BALANCE.sonar.bearingErrorMinDeg);
  });
  it("bladeRate = shaft * blades; escorts separate from slow traffic", () => {
    expect(bladeRateHz({ shaftRps: 1.5, blades: 4 })).toBe(6);
    const k = BALANCE.sonar.kinds;
    expect(k.merchant.shaftRps.max * k.merchant.blades).toBeLessThan(BALANCE.sonar.classBands.escortMinHz);
    expect(k.escort.shaftRps.min * k.escort.blades).toBeGreaterThanOrEqual(BALANCE.sonar.classBands.escortMinHz);
    expect(classifyBladeRate(12)).toBe("escort");
    expect(classifyBladeRate(5)).toBe("slow");
  });
});

describe("SonarField", () => {
  it("observation: audible when close, silent when far; bearing error shrinks with SNR; deterministic", () => {
    const f = new SonarField();
    f.add(track({ y: 1500 }));
    const spread = (y: number): number => {
      const g = new SonarField(); g.add(track({ y }));
      const rng = derive(1, "obs"); let s = 0, n = 0;
      for (let i = 0; i < 400; i++) { const o = g.observe(L, 3, rng)[0]; if (o) { const d = ((o.bearingDeg + 180) % 360) - 180; s += d * d; n++; } }
      return n === 0 ? Infinity : Math.sqrt(s / n);
    };
    expect(spread(1500)).toBeLessThan(spread(6000));
    expect(f.observe(L, 3, derive(2, "o"))).toEqual(f.observe(L, 3, derive(2, "o")));
    const far = new SonarField(); far.add(track({ y: 2_000_000 }));
    expect(far.observe(L, 3, derive(2, "o"))).toEqual([]);
  });
  it("tracks move; contacts expose truth (bearing, range, kind)", () => {
    const f = new SonarField(); f.add(track({ courseDeg: 90, speedMs: 10 }));
    f.tick(10, 10, L, derive(1, "t"));
    const c = f.contacts(L)[0]!;
    expect(f.getTracks()[0]!.x).toBeCloseTo(100, 6);
    expect(c.kind).toBe("merchant");
    expect(c.rangeM).toBeCloseTo(Math.hypot(100, 5000), 6);
  });
  it("ASDIC: escort in range pings; far escort and merchants never do; pings are deterministic", () => {
    const run = (kind: Track["kind"], y: number): SimEvent[] => {
      const f = new SonarField(); f.add(track({ kind, y, speedMs: 0 }));
      const rng = derive(5, "asdic"); const out: SimEvent[] = [];
      for (let t = 1; t <= 120; t++) out.push(...f.tick(1, t, L, rng));
      return out;
    };
    const near = run("escort", 1500);
    expect(near.length).toBeGreaterThan(0);
    expect(near[0]!.type).toBe("ASDIC_PING");
    expect(run("escort", 1500)).toEqual(near);
    expect(run("escort", 6000)).toEqual([]);
    expect(run("merchant", 1500)).toEqual([]);
  });
});

function setup(): { bus: EventBus; boat: Boat; log: SimEvent[] } {
  const bus = new EventBus(); const log: SimEvent[] = [];
  bus.subscribe((e) => log.push(e));
  return { bus, boat: new Boat(bus, { x: 0, y: 0, headingDeg: 0 }), log };
}
const run = (b: Boat, sec: number): void => { for (let i = 0; i < sec; i++) b.tick(1); };

describe("boat FSM", () => {
  it("surface -> periscope -> dive -> periscope -> surface, emitting BOAT_MODE in order", () => {
    const { boat, log } = setup();
    boat.command("dive"); run(boat, 40);
    expect(boat.state().mode).toBe("dive");
    boat.command("surface"); run(boat, 70);
    expect(boat.state().mode).toBe("surface");
    const modes = log.filter((e) => e.type === "BOAT_MODE").map((e) => (e as { mode: string }).mode);
    expect(modes).toEqual(["periscope", "dive", "periscope", "surface"]);
  });
  it("rates are limited: depth, speed, turning", () => {
    const { boat } = setup();
    boat.command("dive"); boat.tick(1);
    expect(boat.state().depthM).toBeCloseTo(BALANCE.boat.descentMps, 6);
    boat.setSpeed(15); boat.tick(1);
    expect(boat.state().speedKn).toBeLessThanOrEqual(BALANCE.boat.accelKnPerSec * 2 + 1e-9);
    boat.setHeading(350); boat.tick(1);
    const h = boat.state().headingDeg; // shortest turn is anticlockwise
    expect(h).toBeGreaterThan(300);
  });
  it("dived speed is capped by battery limit", () => {
    const { boat } = setup();
    boat.command("dive"); boat.setSpeed(17); run(boat, 120);
    expect(boat.state().speedKn).toBeLessThanOrEqual(BALANCE.boat.maxSpeedDivedKn + 1e-9);
  });
  it("position integrates along heading", () => {
    const { boat } = setup();
    boat.setSpeed(10); boat.setHeading(0); run(boat, 120);
    expect(boat.state().y).toBeGreaterThan(0);
    expect(Math.abs(boat.state().x)).toBeLessThan(1e-6);
  });
  it("captain actions feed the radio channel", () => {
    const { boat } = setup();
    expect(boat.radio()).toMatchObject({ canTransmit: true, exposure: 1 });
    boat.setSpeed(12); run(boat, 60);
    expect(boat.radio().snrPenaltyDb).toBeGreaterThan(0);
    boat.command("periscope"); run(boat, 30);
    expect(boat.radio().exposure).toBeLessThan(1);
    expect(boat.radio().canTransmit).toBe(true);
    boat.command("dive"); run(boat, 40);
    expect(boat.radio()).toMatchObject({ canTransmit: false, exposure: 0 });
    boat.command("surface"); run(boat, 80);
    boat.setRadioSilence(true);
    expect(boat.radio().canTransmit).toBe(false);
    expect(boat.state().radioSilence).toBe(true);
  });
  it("ASDIC ping on the bus escalates to the Bridge immediately", () => {
    const { bus, log } = setup();
    bus.emit({ type: "ASDIC_PING", tSec: 7, contactId: 1, bearingDeg: 10, rangeM: 1000 });
    expect(log.map((e) => e.type)).toEqual(["ASDIC_PING", "BRIDGE_ALERT"]);
    expect(log[1]).toMatchObject({ reason: "asdic", tSec: 7 });
  });
  it("depth charge only hurts near the pattern depth; repeated hits sink the boat", () => {
    const safe = setup();
    safe.bus.emit({ type: "DEPTH_CHARGE", tSec: 1 });
    expect(safe.boat.state().hull).toBe(BALANCE.boat.hull); // surfaced, far from pattern depth
    const hit = setup();
    hit.boat.diveTo(BALANCE.boat.depthChargeDropDepthM); run(hit.boat, 120);
    hit.bus.emit({ type: "DEPTH_CHARGE", tSec: 200 });
    expect(hit.boat.state().hull).toBe(BALANCE.boat.hull - BALANCE.boat.depthChargeDamage);
    hit.bus.emit({ type: "DEPTH_CHARGE", tSec: 201 });
    expect(hit.boat.state().sunk).toBe(true);
    expect(hit.log.some((e) => e.type === "BOAT_SUNK")).toBe(true);
    // sunk boat: commands ignored, radio dead, no further events
    const n = hit.log.length;
    hit.boat.setSpeed(10); hit.boat.command("surface"); hit.boat.tick(1);
    hit.bus.emit({ type: "DEPTH_CHARGE", tSec: 300 });
    expect(hit.boat.radio().canTransmit).toBe(false);
    expect(hit.log.length).toBe(n + 1); // only the injected DEPTH_CHARGE itself
  });
  it("torpedoes are finite", () => {
    const { boat } = setup();
    for (let i = 0; i < BALANCE.boat.torpedoes; i++) expect(boat.fireTorpedo()).toBe(true);
    expect(boat.fireTorpedo()).toBe(false);
    expect(boat.state().torpedoes).toBe(0);
  });
});
