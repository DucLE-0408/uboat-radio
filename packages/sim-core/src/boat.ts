// Boat state machine: surface / periscope / dive. Talks to the rest of the sim ONLY through the Event Bus
// (consumes ASDIC_PING / DEPTH_CHARGE, emits BOAT_* / BRIDGE_ALERT); it imports no other sim module.
import { BALANCE, type Balance } from "./balance";
import type { EventBus, SimEvent } from "./events";

export type BoatMode = "surface" | "periscope" | "dive";

export interface BoatInit {
  readonly x: number; // m
  readonly y: number; // m
  readonly headingDeg: number;
}

/** Plain-data snapshot (serialization-friendly). */
export interface BoatState {
  readonly mode: BoatMode;
  readonly x: number;
  readonly y: number;
  readonly headingDeg: number;
  readonly speedKn: number;
  readonly depthM: number;
  readonly torpedoes: number;
  readonly radioSilence: boolean;
  readonly hull: number;
  readonly sunk: boolean;
}

/** What the captain's actions do to the radio channel. */
export interface RadioLink {
  readonly canTransmit: boolean;
  /** Antenna exposure 0..1: feeds HF/DF hazard (surfacing exposes the boat). */
  readonly exposure: number;
  /** dB subtracted from received SNR: own-ship speed raises self-noise. */
  readonly snrPenaltyDb: number;
}

const KN_TO_MS = 0.514444;

const wrap360 = (d: number): number => ((d % 360) + 360) % 360;

export class Boat {
  private x: number;
  private y: number;
  private heading: number;
  private speed = 0;
  private depth = 0;
  private mode: BoatMode = "surface";
  private torpedoes: number;
  private silence = false;
  private hull: number;
  private sunk = false;
  private targetHeading: number;
  private targetSpeed = 0;
  private targetDepth = 0;
  private tSec = 0;
  /** Set by the Watch from the sea state: 1 = calm; below 1 slows a surfaced boat fully and one at periscope depth by half (G6 storms). */
  private seaFactor = 1;
  /** Set by the Watch when there is a seabed: where charges burst and how hard the bottom reflects them (the plain night watch leaves it null). */
  private chargeModel: ((depthM: number) => { dropM: number; mult: number; shallow: boolean }) | null = null;

  constructor(private readonly bus: EventBus, init: BoatInit, private readonly b: Balance = BALANCE) {
    this.x = init.x;
    this.y = init.y;
    this.heading = wrap360(init.headingDeg);
    this.targetHeading = this.heading;
    this.torpedoes = b.boat.torpedoes;
    this.hull = b.boat.hull;
    bus.subscribe((e) => this.onEvent(e));
  }

  state(): BoatState {
    return {
      mode: this.mode, x: this.x, y: this.y, headingDeg: this.heading, speedKn: this.speed, depthM: this.depth,
      torpedoes: this.torpedoes, radioSilence: this.silence, hull: this.hull, sunk: this.sunk,
    };
  }

  // ---- commands (ignored once sunk) ----
  setHeading(deg: number): void { if (!this.sunk) this.targetHeading = wrap360(deg); }
  setSeaFactor(f: number): void { this.seaFactor = Math.max(0, Math.min(1, f)); }
  setSpeed(kn: number): void { if (!this.sunk) this.targetSpeed = Math.max(0, kn); }
  setRadioSilence(on: boolean): void { if (!this.sunk) this.silence = on; }

  /** Ordered depth in metres (G5 bottoming: forced up to a safe depth). */
  setTargetDepth(m: number): void { if (!this.sunk) this.targetDepth = Math.min(this.b.boat.maxDepthM, Math.max(0, m)); }

  command(mode: BoatMode): void {
    if (this.sunk) return;
    const d = this.b.boat;
    this.targetDepth = mode === "surface" ? 0 : mode === "periscope" ? d.periscopeDepthM : d.diveDepthM;
  }

  /** Dive to an arbitrary depth (evading depth charges). */
  diveTo(depthM: number): void {
    if (this.sunk) return;
    this.targetDepth = Math.min(this.b.boat.maxDepthM, Math.max(0, depthM));
  }

  fireTorpedo(): boolean {
    if (this.sunk || this.torpedoes <= 0) return false;
    this.torpedoes--;
    return true;
  }

  /** Radio consequences of the current captain state. */
  radio(): RadioLink {
    const d = this.b.boat;
    const exposure = this.sunk ? 0 : d.antennaExposure[this.mode];
    return {
      canTransmit: !this.sunk && !this.silence && exposure > 0,
      exposure,
      snrPenaltyDb: this.speed * d.radioSelfNoisePerKnotDb,
    };
  }

  private modeForDepth(): BoatMode {
    if (this.depth < 0.5) return "surface";
    return this.depth <= this.b.boat.periscopeDepthM + 1 ? "periscope" : "dive";
  }

  /** Fixed-step update. */
  tick(dtSec: number): void {
    this.tSec += dtSec;
    if (this.sunk) return;
    const d = this.b.boat;

    // depth: descend/ascend at limited rates
    if (this.depth < this.targetDepth) this.depth = Math.min(this.targetDepth, this.depth + d.descentMps * dtSec);
    else if (this.depth > this.targetDepth) this.depth = Math.max(this.targetDepth, this.depth - d.ascentMps * dtSec);

    const next = this.modeForDepth();
    if (next !== this.mode) {
      this.mode = next;
      this.bus.emit({ type: "BOAT_MODE", tSec: this.tSec, mode: next });
    }

    // speed is capped by mode (batteries when dived) and by acceleration
    const cap = this.mode === "surface" ? d.maxSpeedSurfaceKn * this.seaFactor : this.mode === "periscope" ? d.maxSpeedDivedKn * (1 - (1 - this.seaFactor) / 2) : d.maxSpeedDivedKn;
    const goal = Math.min(this.targetSpeed, cap);
    const dv = d.accelKnPerSec * dtSec;
    this.speed = this.speed < goal ? Math.min(goal, this.speed + dv) : Math.max(goal, this.speed - dv);

    // heading: shortest-way turn at a limited rate
    const diff = ((this.targetHeading - this.heading + 540) % 360) - 180;
    const maxTurn = d.turnRateDegPerSec * dtSec;
    this.heading = wrap360(this.heading + Math.max(-maxTurn, Math.min(maxTurn, diff)));

    const a = (this.heading * Math.PI) / 180;
    this.x += Math.sin(a) * this.speed * KN_TO_MS * dtSec;
    this.y += Math.cos(a) * this.speed * KN_TO_MS * dtSec;
  }

  private onEvent(e: SimEvent): void {
    if (this.sunk) return;
    if (e.type === "ASDIC_PING") {
      // Vietnamese: ASDIC ping = đã bị khóa, báo lên Bridge ngay lập tức, không chờ tick kế tiếp.
      this.bus.emit({ type: "BRIDGE_ALERT", tSec: e.tSec, reason: "asdic" });
    } else if (e.type === "DEPTH_CHARGE") {
      this.bus.emit({ type: "BRIDGE_ALERT", tSec: e.tSec, reason: "depth_charge" });
      this.takeDepthCharge(e.tSec);
    }
  }

  setChargeModel(m: (depthM: number) => { dropM: number; mult: number; shallow: boolean }): void { this.chargeModel = m; }

  /** Held at the coast (G5): the boat cannot go east of `xM` and loses all way; the player must turn away and give speed again. */
  hold(xM: number): void {
    if (this.sunk) return;
    if (this.x > xM) this.x = xM;
    this.speed = 0; // the ordered speed stays: the boat is free again as soon as the heading points away from the land
  }

  /** Hull damage from something other than a depth charge (running aground). */
  takeDamage(amount: number, tSec: number): void {
    if (this.sunk) return;
    this.hull = Math.max(0, this.hull - amount);
    this.bus.emit({ type: "BOAT_DAMAGED", tSec, hull: this.hull });
    if (this.hull <= 0) {
      this.sunk = true;
      this.bus.emit({ type: "BOAT_SUNK", tSec });
    }
  }

  // Damage falls off linearly with the depth gap to the pattern; outside the lethal radius it misses.
  private takeDepthCharge(tSec: number): void {
    const d = this.b.boat;
    const m = this.chargeModel?.(this.depth) ?? { dropM: d.depthChargeDropDepthM, mult: 1, shallow: false };
    const gap = Math.abs(this.depth - m.dropM);
    const hit = gap <= d.depthChargeLethalRadiusM;
    if (this.chargeModel !== null) this.bus.emit({ type: "CHARGE_EFFECT", tSec, dropM: Math.round(m.dropM), shallow: m.shallow, reflected: m.mult > 1, hit });
    if (!hit) return;
    const dmg = d.depthChargeDamage * (1 - 0.5 * (gap / d.depthChargeLethalRadiusM)) * m.mult;
    this.hull = Math.max(0, this.hull - dmg);
    this.bus.emit({ type: "BOAT_DAMAGED", tSec, hull: this.hull });
    if (this.hull <= 0) {
      this.sunk = true;
      this.bus.emit({ type: "BOAT_SUNK", tSec });
    }
  }
}
