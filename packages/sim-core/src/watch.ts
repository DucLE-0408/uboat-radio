// Campaign loop for ONE night watch (vertical slice). The only module that knows every other module:
// it wires Boat.radio() -> HF/DF + Intel + Morse noise, and BOAT_SUNK -> keybook/Intel.
// Headless and deterministic: fixed 1 s step, one independent seeded stream per subsystem, no wall clock.
// Save/load = seed + the player's command log (see `replay`); the event log is derived, never stored.
import { authTable, ChallengeLedger, lookup, type AuthTable, type Challenge } from "./auth";
import { BALANCE, type Balance } from "./balance";
import { Boat, type BoatMode } from "./boat";
import { HfdfDetector } from "./detection";
import { EventBus, type SimEvent } from "./events";
import { Intel } from "./intel";
import {
  dayOrder, encipherSenderId, judge, judgeDispose, lossOrder, makeProfile, orderItems, paperOrders, validAction, validPlugboard, verifyPaper,
  type DayOrder, type DisposeHow, type OrderItem, type PaperAction, type PaperFault, type PaperObservable, type PaperOrders, type PaperTell, type PaperTruth,
} from "./paper";
import {
  coastKm, generateForgery, generateGenuine, gridToPos, makeCallsigns, makeKnownFists, type Generated, type Truth, type WorldCtx,
} from "./messages";
import { applyNoise } from "./morse";
import { deadlineSec, forgedProbability, gapSec } from "./endless";
import type { WatchOptions } from "./options";
import { pmAllowed, resolveSender, toneFor, type PmTopic } from "./pm";
import { chargeEffect, makeSeabed, type Seabed, type Shoal } from "./seabed";
import { absentRole, makeRoster, type CrewMember, type Role } from "./roster";
import { airtimeSec, expectedReply, replyKind, validSend, type ReplyKind } from "./send";
import { derive, type Rng } from "./rng";
import { clearness, makeWeather, seaSpeedFactor, type Weather } from "./weather";
import { SonarField, type Track } from "./sonar";
import {
  assessTells, buildTransmission, checkLetterMatches, copyFromTokens, decipherCopy, messageIndicator,
  trueCheckLetter, type Deciphered, type RxHeader,
} from "./traffic";
import type { Tell } from "./messages";

const DT = 1; // s, fixed timestep
const DAY = 1;
const NET = "HQ" as const;
const L = (i: number): string => String.fromCharCode(65 + i);
const idx = (c: string): number => c.charCodeAt(0) - 65;
const lerp = (r: { min: number; max: number }, u: number): number => r.min + u * (r.max - r.min);

/** Everything the player can do. The command log is the save file. */
export type Command =
  | { readonly kind: "heading"; readonly deg: number }
  | { readonly kind: "speed"; readonly kn: number }
  | { readonly kind: "mode"; readonly mode: BoatMode }
  | { readonly kind: "silence"; readonly on: boolean }
  | { readonly kind: "transmit"; readonly seconds: number }
  | { readonly kind: "repeat"; readonly rxId: number }
  | { readonly kind: "challenge"; readonly rxId: number }
  | { readonly kind: "check"; readonly rxId: number }
  | { readonly kind: "resolve"; readonly rxId: number; readonly decision: "accept" | "reject" }
  /** G3 (desk UI): what the player did with a sheet; the sim judges it (see paper.ts) and may issue a citation. */
  | { readonly kind: "paperwork"; readonly rxId: number | null; readonly action: PaperAction }
  /** G3: the optional per-message deadline (Settings). Off unless the UI sends it, so P5/classic never get timeout citations. */
  | { readonly kind: "timer"; readonly on: boolean }
  /** G3: archive or burn a sheet after the hand-over; judged against the day's standing order. */
  | { readonly kind: "dispose"; readonly rxId: number; readonly sheet: "input" | "output"; readonly how: DisposeHow }
  /** G4: send an enciphered reply (groups of 4 letters) for message `rxId`; the sim reads it with the day key. */
  | { readonly kind: "send"; readonly rxId: number; readonly indicator: string; readonly groups: string }
  /** G4: the player ends an Endless watch on purpose. */
  | { readonly kind: "leave" };

export type EndReason = "time" | "sunk" | "executed" | "left";

export interface LoggedCommand { readonly tick: number; readonly cmd: Command }

export interface WatchSummary {
  readonly tSec: number;
  readonly endReason: EndReason | null;
  readonly citations: number;
  readonly mode: "night" | "endless";
  readonly hull: number;
  readonly sunk: boolean;
  readonly intelLevel: number;
  readonly txTotalSec: number;
  readonly resolved: readonly { readonly rxId: number; readonly decision: "accept" | "reject"; readonly correct: boolean }[];
}

interface RxState {
  readonly gen: Generated;
  readonly paper: PaperTruth;
  readonly move: { readonly grid: string; readonly minutes: number } | null; // G5: set for a movement order
  readonly checkLetter: string; // what goes on the air (true letter, or a forger's guess)
  attempts: number;
  deadlineAt: number | null; // sim-time second by which the Input must be handed over (G3 timer)
  handed: boolean;
  challenge: Challenge | undefined;
  reply: string | undefined;
  replyChecked: boolean;
  resolved: boolean;
}

interface Timer { readonly atTick: number; readonly fn: () => void }

export class Watch {
  readonly bus = new EventBus();
  readonly boat: Boat;
  private readonly sonar = new SonarField();
  private readonly det: HfdfDetector;
  private readonly intel: Intel;
  private readonly table: AuthTable;
  private readonly ledger: ChallengeLedger;
  private readonly callsigns: readonly string[];
  private readonly knownFists: ReturnType<typeof makeKnownFists>;
  private readonly asdicRng: Rng;
  private readonly challengeRng: Rng;
  private readonly rx = new Map<number, RxState>();
  private readonly cmdLog: LoggedCommand[] = [];
  private readonly resolved: { rxId: number; decision: "accept" | "reject"; correct: boolean }[] = [];
  private timers: Timer[] = [];
  private readonly audible = new Set<number>();
  private tick = 0;
  private txRemaining = 0;
  private txTotal = 0;
  private lastIntelLevel: number;
  private ended: EndReason | null = null;
  private timerOn: boolean;
  private citations = 0;
  private readonly cited = new Set<string>();
  private readonly items: readonly OrderItem[];
  private readonly orders: PaperOrders;
  private readonly lossQueue: string[];
  private readonly lost = new Set<string>();
  private ambushes = 0;

  private readonly opts: WatchOptions | undefined;
  private readonly g4: boolean; // G4 features (sending, Private Messages, roster) exist only when options were given: no options = the night watch as before
  private readonly endless: boolean;
  private readonly weather: Weather | null; // G6: only with options and the weather module
  private readonly sightRng: Rng;
  private readonly reportRng: Rng;
  private nextReportSec = 0;
  private readonly roster0: readonly CrewMember[];
  private absent: Role | null = null;
  private readonly pmSent: number[] = [];
  private longTxSeen = 0;
  private pendingSends = 0;
  private readonly origin: { readonly x: number; readonly y: number }; // world km of the boat's start (Endless starts near the coast)
  private aground = false;
  private readonly seabed: Seabed | null;
  private bottomed = false;
  private shoalWarned = false;
  private coastWarned = false;
  // G5: the active movement order and dead-reckoning (the sim knows the true position; players only get `navFix()`)
  private order: { readonly rxId: number; readonly target: { readonly x: number; readonly y: number }; readonly deadlineAt: number } | null = null;
  private readonly driftRng: Rng;
  private driftXm = 0;
  private driftYm = 0;
  private travelM = 0;
  private lastBx = 0;
  private lastBy = 0;

  constructor(private readonly seed: number | string, private readonly b: Balance = BALANCE, opts?: WatchOptions) {
    this.opts = opts;
    this.origin = opts !== undefined ? { x: coastKm(b) - b.coast.endlessStartKm, y: b.watch.originKm.y } : b.watch.originKm; // the plain night watch keeps its start
    this.seabed = opts !== undefined ? makeSeabed(seed, b, this.origin) : null; // the sea floor exists only for watches with options
    this.g4 = opts !== undefined;
    this.weather = opts !== undefined && opts.modules.weather ? makeWeather(seed, b) : null;
    this.sightRng = derive(seed, "sight");
    this.reportRng = derive(seed, "wxreport");
    this.endless = opts?.mode === "endless";
    this.timerOn = this.endless && opts?.modules.timer === true;
    this.roster0 = makeRoster(seed, b);
    this.driftRng = derive(seed, "drift");
    this.boat = new Boat(this.bus, { x: 0, y: 0, headingDeg: 0 }, b);
    const sea = this.seabed;
    if (sea !== null) this.boat.setChargeModel((depth) => { const p = this.trueKm(); return chargeEffect(b, sea.depthAt(p.x, p.y), depth); }); // charges burst relative to the real floor
    this.det = new HfdfDetector(derive(seed, "hfdf"), b);
    this.intel = new Intel(b);
    this.intel.transmit(b.watch.startIntelScore / b.intel.perTxSecond); // earlier nights: start at Allied Intel level 2
    this.lastIntelLevel = this.intel.level;
    this.table = authTable(seed, NET, DAY);
    this.ledger = new ChallengeLedger(this.table);
    this.callsigns = makeCallsigns(seed, 4);
    this.knownFists = makeKnownFists(seed, this.callsigns, b);
    this.asdicRng = derive(seed, "asdic");
    this.challengeRng = derive(seed, "challenge");
    this.orders = paperOrders(seed, this.callsigns);
    this.items = orderItems(seed, b, opts !== undefined ? { originX: this.origin.x, maxX: coastKm(b) - b.coast.itemMarginKm } : undefined);
    this.lossQueue = lossOrder(seed, this.items);

    this.bus.subscribe((e) => {
      if (e.type === "BOAT_SUNK") this.onSunk(e.tSec);
      else if (e.type === "BOAT_DAMAGED" && this.g4 && this.absent === null && e.hull <= this.b.roster.absentHullAt) { // a badly hit boat loses a crew member for the rest of the watch
        this.absent = absentRole(this.seed);
        this.emit({ type: "ROSTER_CHANGE", tSec: e.tSec, role: this.absent, present: false });
      }
    });

    const m = derive(seed, "merchant");
    const kind = b.sonar.kinds.merchant;
    const bearing = m.next() * 2 * Math.PI;
    this.sonar.add({
      id: 1, kind: "merchant",
      x: Math.sin(bearing) * b.watch.merchant.rangeM, y: Math.cos(bearing) * b.watch.merchant.rangeM,
      courseDeg: ((bearing * 180) / Math.PI + 90) % 360, speedMs: b.watch.merchant.speedMs,
      shaftRps: lerp(kind.shaftRps, m.next()), blades: kind.blades, srcLevelDb: lerp(kind.srcLevelDb, m.next()),
    });

    if (this.endless) this.at(b.watch.messages[0]?.atSec ?? 60, () => this.endlessNext(0));
    else b.watch.messages.forEach((msg, i) => this.at(msg.atSec, () => this.inject(i + 1, msg.forged)));
  }

  // ---------------------------------------------------------------- observables for the radio room

  get tSec(): number { return this.tick * DT; }
  get tickCount(): number { return this.tick; }
  get endReason(): EndReason | null { return this.ended; }
  get citationCount(): number { return this.citations; }

  /** G3: the safe coordinates and resupply points printed on the Daily Orders, and which ones citations have taken away. */
  orderItems(): readonly (OrderItem & { readonly lost: boolean })[] { return this.items.map((i) => ({ ...i, lost: this.lost.has(i.id) })); }

  /** Own position and clock, plus the fists of friendly stations the operator knows by ear. */
  worldCtx(): WorldCtx {
    const s = this.boat.state();
    return {
      ownPos: { x: this.origin.x + s.x / 1000, y: this.origin.y + s.y / 1000 },
      nowMin: this.b.watch.startMin + this.tSec / 60,
      knownFists: this.knownFists,
      callsigns: this.callsigns,
    };
  }

  /** The operator's Enigma machine: day key + the message indicator sent in the clear. */
  decipher(indicator: string, copy: string, plugboard?: readonly string[]): Deciphered {
    return decipherCopy(this.seed, DAY, indicator, copy, plugboard !== undefined && validPlugboard(plugboard) ? plugboard : undefined);
  }
  /** G3: specimen signatures and approved senders printed on the Daily Orders. */
  paperOrders(): PaperOrders { return this.orders; }
  /** G3: the day this watch plays (for the desk's own machine maths; the sim has one day). */
  get day(): number { return DAY; }
  /** G3: what a careful operator finds on the sheet, given the sender id they deciphered (null = not read yet). */
  assessPaper(from: string, paper: PaperObservable, senderId: string | null): PaperTell[] { return verifyPaper(paper, senderId, from, this.orders); }
  copy(tokens: string): string { return copyFromTokens(tokens); }
  /** Check letter vs. the day's auth table. False means garble OR forgery; it never says which. */
  checkMatches(from: string, d: Deciphered): boolean { return checkLetterMatches(this.table, from, d); }
  assess(h: RxHeader, plain: string): Tell[] { return assessTells(h, plain, this.worldCtx()); }
  /** The player's own day table, used to look up challenge cells. */
  dayTable(): AuthTable { return this.table; }

  /** What the operator hears right now (hydrophone). Stateless RNG: calling it never perturbs the sim. */
  listen(): ReturnType<SonarField["observe"]> {
    const s = this.boat.state();
    return this.sonar.observe({ x: s.x, y: s.y, speedKn: s.speedKn }, this.b.watch.seaState, derive(this.seed, "listen", this.tick), this.b);
  }

  /** TEST/DEBUG ONLY. Ground truth must never reach the presentation layer. */
  truthOf(rxId: number): Truth | undefined { return this.rx.get(rxId)?.gen.truth; }

  summary(): WatchSummary {
    const s = this.boat.state();
    return {
      tSec: this.tSec, endReason: this.ended, citations: this.citations, mode: this.opts?.mode ?? "night", hull: s.hull, sunk: s.sunk, intelLevel: this.intel.level,
      txTotalSec: this.txTotal, resolved: this.resolved.slice(),
    };
  }

  commandLog(): readonly LoggedCommand[] { return this.cmdLog.slice(); }

  // ---------------------------------------------------------------- commands

  /** Apply a player command now. Returns false when it is refused (no antenna, unknown message, ...). */
  dispatch(cmd: Command): boolean {
    if (this.ended) return false;
    this.cmdLog.push({ tick: this.tick, cmd });
    switch (cmd.kind) {
      case "heading": this.boat.setHeading(cmd.deg); return true;
      case "speed": this.boat.setSpeed(cmd.kn); return true;
      case "mode": this.boat.command(cmd.mode); return true;
      case "silence": this.boat.setRadioSilence(cmd.on); return true;
      case "transmit": return cmd.seconds > 0 && this.startTx(cmd.seconds, "report");
      case "repeat": return this.requestRepeat(cmd.rxId);
      case "challenge": return this.sendChallenge(cmd.rxId);
      case "check": return this.checkReply(cmd.rxId);
      case "resolve": return this.resolve(cmd.rxId, cmd.decision);
      case "paperwork": return this.paperwork(cmd.rxId, cmd.action);
      case "timer": return this.setTimer(cmd.on);
      case "dispose": return this.dispose(cmd.rxId, cmd.sheet, cmd.how);
      case "send": return this.send(cmd.rxId, cmd.indicator, cmd.groups);
      case "leave": return this.leave();
    }
  }

  runUntil(tSec: number): void {
    while (!this.ended && this.tSec < tSec) this.step();
  }

  // ---------------------------------------------------------------- simulation step

  step(): void {
    if (this.ended) return;
    this.tick++;
    const t = this.tSec;

    // Vietnamese: thứ tự cố định mỗi tick => replay giống hệt: timer -> thuyền -> phát sóng/HFDF -> sonar -> Intel.
    const due = this.timers.filter((x) => x.atTick <= this.tick);
    this.timers = this.timers.filter((x) => x.atTick > this.tick);
    for (const x of due) x.fn();

    if (this.weather !== null) this.boat.setSeaFactor(seaSpeedFactor(this.b, this.weather.at(t).sea)); // storms slow the boat
    this.boat.tick(DT);
    this.deadReckon();
    this.checkCoast(t);
    this.checkSeabed(t);
    this.checkWeather(t);
    this.checkOrder(t);

    const radio = this.boat.radio();
    if (!radio.canTransmit) this.txRemaining = 0; // diving or sunk cuts the key
    const transmitting = this.txRemaining > 0;
    if (transmitting) {
      this.txRemaining = Math.max(0, this.txRemaining - DT);
      this.txTotal += DT;
      this.intel.transmit(DT);
      if (this.g4 && Math.floor(this.txTotal / this.b.pm.longTxStepSec) > this.longTxSeen) { this.longTxSeen = Math.floor(this.txTotal / this.b.pm.longTxStepSec); this.pm("longTx", null); }
    }
    const hf = this.det.tick(DT, transmitting ? { freqKhz: this.b.watch.freqKhz } : null, { exposure: radio.exposure, intelLevel: this.intel.level });
    for (const e of hf) this.bus.emit(e);

    const s = this.boat.state();
    const listener = { x: s.x, y: s.y, speedKn: s.speedKn };
    for (const e of this.sonar.tick(DT, t, listener, this.asdicRng, this.b)) this.bus.emit(e);
    if (this.tick % this.b.watch.sonarPeriodSec === 0) this.scanSonar(t, listener);

    this.intel.tickMinutes(DT / 60);
    this.syncIntel(t);

    if (!this.ended && !this.endless && this.tSec >= this.b.watch.durationSec) {
      this.ended = "time";
      this.bus.emit({ type: "WATCH_END", tSec: t, reason: "time" });
    }
  }

  // ---------------------------------------------------------------- internals

  private at(sec: number, fn: () => void): void {
    this.timers.push({ atTick: Math.max(this.tick + 1, Math.ceil(sec / DT)), fn });
  }

  private emit(e: SimEvent): void { this.bus.emit(e); }

  private startTx(seconds: number, purpose: "report" | "repeat" | "challenge" | "ack" | "send"): boolean {
    if (!this.boat.radio().canTransmit) return false;
    this.txRemaining += seconds;
    this.emit({ type: "TX", tSec: this.tSec, seconds, purpose });
    return true;
  }

  private syncIntel(t: number): void {
    const lv = this.intel.level;
    if (lv !== this.lastIntelLevel) {
      this.lastIntelLevel = lv;
      this.emit({ type: "INTEL_LEVEL", tSec: t, level: lv });
    }
  }

  private scanSonar(t: number, l: { x: number; y: number; speedKn: number }): void {
    const seen = new Set<number>();
    for (const o of this.sonar.observe(l, this.b.watch.seaState, derive(this.seed, "sonar", this.tick), this.b)) {
      seen.add(o.id);
      if (!this.audible.has(o.id)) {
        this.audible.add(o.id);
        this.emit({ type: "SONAR_CONTACT", tSec: t, contactId: o.id, bearingDeg: o.bearingDeg, snrDb: o.snrDb, bladeRateHz: o.bladeRateHz, guess: o.guess });
      }
    }
    for (const id of [...this.audible]) if (!seen.has(id)) this.audible.delete(id);
  }

  private onSunk(t: number): void {
    if (this.ended) return;
    // Vietnamese: tàu chìm => sổ mã rơi vào tay địch: Intel nhảy lên ít nhất mức 2 + phạt, rồi kết thúc ca trực.
    this.emit({ type: "KEYBOOK_LOST", tSec: t, net: NET, day: DAY });
    this.intel.codebookLost();
    this.syncIntel(t);
    this.ended = "sunk";
    this.emit({ type: "WATCH_END", tSec: t, reason: "sunk" });
  }

  private inject(id: number, forged: boolean, kind: "ORDER" | "MOVE" = "ORDER"): void {
    const ctx = this.worldCtx();
    const gen0 = forged
      ? generateForgery(this.seed, id, kind, this.intel.level, ctx, this.b)
      : generateGenuine(this.seed, id, kind, ctx, this.b);
    const paperOn = !this.g4 || this.opts?.modules.signatures === true; // module off: no paper tells, nothing printed (classic tells still guarantee one)
    const paper = paperOn ? makeProfile(this.seed, id, gen0.msg.from, forged, forged ? this.intel.level : 0, this.orders)
      : { authMark: "stamped" as const, markForged: false, signatureVariant: 0, senderId: this.orders.approvedSenders[0] as string, tells: [] as PaperTell[] };
    const gen: Generated = { msg: gen0.msg, truth: { ...gen0.truth, paperTells: paper.tells }, ...(gen0.move ? { move: gen0.move } : {}) };
    const real = trueCheckLetter(this.table, gen.msg.from, gen.msg.plain);
    let letter = real;
    if (forged) {
      // A forger without the table guesses the check letter; Intel decides how often the guess is right.
      const r = derive(this.seed, "forgeauth", id);
      if (!r.chance(this.intel.forgeryPassProbability())) letter = L((idx(real) + 1 + r.int(25)) % 26);
    }
    this.rx.set(id, { gen, paper, move: gen0.move ? { grid: gen0.move.grid, minutes: gen0.move.minutes } : null, checkLetter: letter, attempts: 0, deadlineAt: null, handed: false, challenge: undefined, reply: undefined, replyChecked: false, resolved: false });
    this.deliver(id);
  }

  /** Put (a fresh copy of) message `rxId` on the air; submerged boats miss it and it is retried. */
  private deliver(rxId: number): void {
    const rx = this.rx.get(rxId);
    if (!rx || this.ended) return;
    const radio = this.boat.radio();
    if (radio.exposure <= 0) { this.at(this.tSec + 10, () => this.deliver(rxId)); return; }
    const msg = rx.gen.msg;
    const indicator = messageIndicator(this.seed, rxId, rx.attempts);
    const tx = buildTransmission(this.seed, DAY, msg, indicator, rx.checkLetter);
    const snr = this.b.watch.rxSnrDb - radio.snrPenaltyDb;
    const tokens = applyNoise(tx.tokens, snr, this.b.watch.jam, derive(this.seed, "noise", rxId, rx.attempts), this.b);
    this.emit({
      type: "MSG_RX", tSec: this.tSec, rxId, attempt: rx.attempts, from: msg.from, net: msg.net, sentAtMin: msg.sentAtMin,
      indicator, tokens, snrDb: snr, txFist: msg.txFist, dfBearingDeg: msg.dfBearingDeg,
      ...(!this.g4 || this.opts?.modules.signatures === true
        ? { paper: { authMark: rx.paper.authMark, signatureVariant: rx.paper.signatureVariant, senderIdCipher: encipherSenderId(this.seed, DAY, indicator, rx.paper.senderId) } } : {}),
      ...(this.g4 ? { reply: replyKind(this.seed, rxId) } : {}),
    });
    if (rx.attempts === 0) { // the clock for this message starts when it first reaches the desk
      rx.deadlineAt = this.tSec + (this.endless && this.opts ? deadlineSec(this.b, this.opts.difficulty, rxId - 1) : this.b.paper.deadlineSec);
      this.at(rx.deadlineAt, () => this.timeoutCheck(rxId));
    }
    rx.attempts++;
  }

  // ---------------------------------------------------------------- G3: paperwork, citations, consequences

  private paperwork(rxId: number | null, action: PaperAction): boolean {
    if (!validAction(action)) return false;
    const rx = rxId === null ? undefined : this.rx.get(rxId);
    if (rxId !== null && !rx) return false;
    if (action.act === "handover") {
      if (rx === undefined) return false; // a bundle always belongs to a message
      rx.handed = true;
    }
    for (const f of judge(action)) if (this.faultOn(f)) this.cite(rxId, f);
    return true;
  }

  private dispose(rxId: number, sheet: "input" | "output", how: DisposeHow): boolean {
    const rx = this.rx.get(rxId);
    if (!rx || !rx.handed || (sheet !== "input" && sheet !== "output") || (how !== "archive" && how !== "burn")) return false; // only handed-over sheets are disposed of
    for (const f of judgeDispose(dayOrder(this.seed, DAY), sheet, how)) if (this.faultOn(f)) this.cite(rxId, f);
    return true;
  }

  /** G3: today's standing order on records (printed on the Daily Orders). */
  standingOrder(): DayOrder { return dayOrder(this.seed, DAY); }

  /** With the Stamps module off the sim does not judge sheets, stamps or records (timeouts and bad sends still count). */
  private faultOn(f: PaperFault): boolean { return !this.g4 || this.opts?.modules.stamps === true || f === "timeout" || f === "badSend"; }

  // ---------------------------------------------------------------- G4: endless stream, sending, leaving, private messages

  // ---------------------------------------------------------------- G5: movement orders and dead-reckoning

  /** Where the boat is (world km) and where the player's navigation estimates it to be; the true position stays here. */
  private trueKm(): { x: number; y: number } { const s = this.boat.state(); return { x: this.origin.x + s.x / 1000, y: this.origin.y + s.y / 1000 }; }

  /** Drift grows with distance sailed: a small seeded random walk added to the true position (no stream is touched while the boat stands still). */
  private deadReckon(): void {
    const s = this.boat.state(), d = Math.hypot(s.x - this.lastBx, s.y - this.lastBy);
    this.lastBx = s.x; this.lastBy = s.y;
    if (d <= 0) return;
    this.travelM += d;
    const sigma = this.b.nav.driftPerKm * d;
    this.driftXm += (this.driftRng.next() * 2 - 1) * sigma;
    this.driftYm += (this.driftRng.next() * 2 - 1) * sigma;
  }

  /** The navigator's fix: estimated position in world km, its error radius, and the heading the compass shows. Observation only. */
  navFix(): { readonly xKm: number; readonly yKm: number; readonly errKm: number; readonly headingDeg: number } {
    const t = this.trueKm(), s = this.boat.state();
    return { xKm: t.x + this.driftXm / 1000, yKm: t.y + this.driftYm / 1000, errKm: this.b.nav.baseErrKm + this.b.nav.driftPerKm * (this.travelM / 1000), headingDeg: s.headingDeg };
  }

  /** World km of the boat's start: the chart and the Orders items are offsets from here. */
  originKm(): { readonly x: number; readonly y: number } { return this.origin; }

  /** Surveyed depth at a world position (km), as the chart shows it; null in the plain night watch. Observation only. */
  chartDepth(xKm: number, yKm: number): number | null { return this.seabed === null ? null : Math.round(this.seabed.depthAt(xKm, yKm)); }
  /** The shoals marked on the chart (empty in the night watch). */
  chartShoals(): readonly Shoal[] { return this.seabed?.shoals ?? []; }

  /** Seabed rule: a warning as the water under the keel thins, then bottoming (hull damage, way lost, forced up to a safe depth). */
  /** G6: the bridge reports the weather as it looks from the deck (noisy), and escorts may sight a surfaced boat in good visibility. */
  private checkWeather(t: number): void {
    const wx = this.weather;
    if (wx === null) return;
    const w = this.b.weather, s = wx.at(t), depth = this.boat.state().depthM;
    const seen = depth <= this.b.boat.periscopeDepthM + 1; // below that nobody on the bridge sees the sea
    if (seen && t >= this.nextReportSec) {
      this.nextReportSec = t + w.reportEverySec;
      const k = 1 + (this.reportRng.next() * 2 - 1) * w.reportNoise;
      this.bus.emit({ type: "WEATHER_REPORT", tSec: t, visKm: Math.max(1, Math.round(s.visKm * k)), windDeg: Math.round(s.windDeg / 10) * 10 % 360, force: Math.round(s.force), seaState: s.seaState });
    }
    const expo = depth < 0.5 ? 1 : seen ? w.periscopeFactor : 0;
    if (expo <= 0) return;
    const h = w.sightHazardPerSecClear * clearness(this.b, s.visKm) * expo * (1 + this.b.detection.intelHazardStep * this.intel.level);
    if (this.sightRng.chance(1 - Math.exp(-h * DT)) && this.det.visualContact(w.reactSec, w.etaSec)) this.bus.emit({ type: "SIGHTED", tSec: t, visKm: Math.round(s.visKm) });
  }

  private checkSeabed(t: number): void {
    if (this.seabed === null || this.ended) return;
    const p = this.trueKm(), s = this.b.seabed, surfaced = this.boat.state().depthM < 0.5;
    // a surfaced boat still draws `draftM`; near the coast (the last 3 km) only the coast rule applies, so the two never charge twice
    const keel = surfaced ? (coastKm(this.b) - p.x > 3 ? s.draftM : 0) : this.boat.state().depthM;
    if (keel <= 0) { this.shoalWarned = false; this.bottomed = false; return; }
    const floor = this.seabed.depthAt(p.x, p.y), under = floor - keel;
    if (under <= 0) {
      if (!this.bottomed) {
        this.bottomed = true;
        this.emit({ type: "BOAT_BOTTOMED", tSec: t });
        this.boat.takeDamage(s.bottomHull, t);
        this.pm("bottomed", null);
      }
      this.boat.hold(Number.POSITIVE_INFINITY); // lose way
      this.boat.setTargetDepth(Math.max(0, floor - s.clearanceM));
      return;
    }
    if (this.bottomed && under > s.clearanceM) this.bottomed = false;
    if (under <= s.warnUnderKeelM) { if (!this.shoalWarned) { this.shoalWarned = true; this.emit({ type: "SHOAL_WARNING", tSec: t, underKeelM: Math.round(under) }); } }
    else if (under > s.rearmUnderKeelM) this.shoalWarned = false;
  }

  /** The coast rule (Endless only): a warning near the land, then running aground (held at the shore, hull damage, Intel up, a note from the chief). */
  private checkCoast(t: number): void {
    if (!this.g4 || this.ended) return;
    const edge = coastKm(this.b), dist = edge - this.trueKm().x;
    if (dist <= 0) {
      this.boat.hold((edge - this.origin.x) * 1000 - 1);
      if (!this.aground) {
        this.aground = true;
        this.emit({ type: "BOAT_GROUNDED", tSec: t });
        this.boat.takeDamage(this.b.coast.groundHull, t);
        this.intel.mark(); this.syncIntel(t); // grinding on the rocks is heard far and wide
        this.pm("grounded", null);
      }
      return;
    }
    if (this.aground && dist > this.b.coast.clearKm) this.aground = false;
    if (dist <= this.b.coast.warnKm) { if (!this.coastWarned) { this.coastWarned = true; this.emit({ type: "COAST_WARNING", tSec: t, distKm: Math.round(dist * 10) / 10 }); } }
    else if (dist > this.b.coast.warnKm + 5) this.coastWarned = false; // hysteresis: warn again on the next approach
  }

  private takeOrder(rxId: number, mv: { readonly grid: string; readonly minutes: number }): void {
    const c = gridToPos(mv.grid, this.b);
    if (c === null) return;
    this.order = { rxId, target: c, deadlineAt: this.tSec + mv.minutes * 60 };
    this.emit({ type: "ORDER_ACCEPTED", tSec: this.tSec, rxId, grid: mv.grid, deadlineSec: mv.minutes * 60 });
  }

  private checkOrder(t: number): void {
    const o = this.order;
    if (o === null || this.ended) return;
    const p = this.trueKm();
    if (Math.hypot(p.x - o.target.x, p.y - o.target.y) <= this.b.move.arriveKm) {
      this.order = null;
      this.emit({ type: "ORDER_REACHED", tSec: t, rxId: o.rxId });
    } else if (t >= o.deadlineAt) {
      this.order = null;
      // a missed order costs a resupply point (any item once those are gone); the desk takes the rations
      const i = this.lossQueue.findIndex((id) => id.startsWith("supply")), lost = (i >= 0 ? this.lossQueue.splice(i, 1)[0] : this.lossQueue.shift()) ?? null;
      if (lost !== null) this.lost.add(lost);
      this.emit({ type: "ORDER_FAILED", tSec: t, rxId: o.rxId, lostItem: lost });
      this.pm("orderFailed", o.rxId);
    }
  }

  private endlessNext(n: number): void {
    if (this.ended || !this.opts) return;
    const d = this.opts.difficulty, r = derive(this.seed, "endless", n);
    const forged = r.chance(forgedProbability(this.b, d, n));
    const waiting = [...this.rx.entries()].filter(([, x]) => !x.resolved).map(([id]) => id).sort((a, b) => a - b);
    while (waiting.length >= this.b.endless.maxPending) { // an overloaded desk loses its oldest message
      const id = waiting.shift() as number;
      (this.rx.get(id) as RxState).resolved = true;
      this.emit({ type: "MSG_LOST", tSec: this.tSec, rxId: id });
    }
    const move = this.opts.modules.map && r.chance(this.b.move.chance); // movement orders need the map module
    this.inject(n + 1, forged, move ? "MOVE" : "ORDER");
    this.at(this.tSec + gapSec(this.b, d, n) * (0.8 + 0.4 * r.next()), () => this.endlessNext(n + 1));
  }

  private leave(): boolean {
    if (!this.g4) return false;
    this.ended = "left";
    this.emit({ type: "WATCH_END", tSec: this.tSec, reason: "left" });
    return true;
  }

  private send(rxId: number, indicator: string, groups: string): boolean {
    const rx = this.rx.get(rxId);
    if (!this.g4 || !rx || !validSend(indicator, groups, this.b.send.maxChars) || this.pendingSends >= this.b.send.maxPending) return false;
    const secs = airtimeSec(groups, this.b.send.wpm);
    if (!this.startTx(secs, "send")) return false; // diving, silence or no antenna: nothing is keyed
    this.pendingSends++;
    this.intel.indicator(indicator); // reusing a key is a classic break-in
    const expected = expectedReply(replyKind(this.seed, rxId), rx.gen.msg.from, this.worldCtx().ownPos, this.b);
    this.at(this.tSec + secs, () => {
      this.pendingSends--;
      if (this.ended) return;
      const ok = decipherCopy(this.seed, DAY, indicator, groups).plain === expected;
      this.emit({ type: "SEND_RESULT", tSec: this.tSec, rxId, ok });
      if (!ok) this.cite(rxId, "badSend");
    });
    return true;
  }

  /** What HQ asks for in reply to message `rxId`, and the plain text it expects now (the position changes as the boat moves). */
  replyRequest(rxId: number): { readonly kind: ReplyKind; readonly plain: string } | null {
    const rx = this.rx.get(rxId);
    if (!this.g4 || !rx) return null;
    const kind = replyKind(this.seed, rxId);
    return { kind, plain: expectedReply(kind, rx.gen.msg.from, this.worldCtx().ownPos, this.b) };
  }

  options(): WatchOptions | undefined { return this.opts; }
  /** The crew and who is absent (G4). Empty without options. */
  crew(): { readonly members: readonly CrewMember[]; readonly absent: Role | null } { return { members: this.g4 ? this.roster0 : [], absent: this.absent }; }

  private pm(topic: PmTopic, rxId: number | null): void {
    if (!this.g4) return;
    const t = this.tSec;
    if (!pmAllowed(this.b, t, this.pmSent)) return;
    const tone = toneFor(this.citations);
    this.pmSent.push(t);
    this.emit({ type: "PRIVATE_MSG", tSec: t, fromRole: resolveSender(topic, tone, this.absent), tone, topic, rxId });
  }

  private setTimer(on: boolean): boolean {
    if (this.endless) return true; // in Endless the timer module decides, not a command
    this.timerOn = on;
    if (on) for (const id of [...this.rx.keys()]) this.timeoutCheck(id); // overdue messages count the moment the clock is switched on
    return true;
  }

  private timeoutCheck(rxId: number): void {
    const rx = this.rx.get(rxId);
    if (!this.timerOn || !rx || rx.handed || rx.deadlineAt === null || this.tSec < rx.deadlineAt) return;
    this.cite(rxId, "timeout");
  }

  /** One citation per (message, fault); the consequence depends only on the running count (approved G3 spec, R1). */
  private cite(rxId: number | null, reason: PaperFault): void {
    const key = `${rxId ?? "-"}:${reason}`;
    if (this.ended || this.cited.has(key)) return;
    this.cited.add(key);
    const t = this.tSec, p = this.b.paper, count = ++this.citations;
    const lostItem = p.lostAt.includes(count) ? this.lossQueue.shift() ?? null : null;
    if (lostItem !== null) this.lost.add(lostItem);
    this.emit({ type: "CITATION", tSec: t, rxId, reason, count, lostItem });
    if (count >= p.executeAt && !this.endless) { // Endless ends only by sinking or leaving: from the fifth citation on it stays at "severe"
      this.emit({ type: "CONSEQUENCE", tSec: t, level: "executed", count, positionKnown: null });
      this.ended = "executed";
      this.emit({ type: "WATCH_END", tSec: t, reason: "executed" });
      return;
    }
    const tier = count >= p.severeAt ? p.severe : count >= p.locatedAt ? p.located : null;
    const level = count >= p.severeAt ? "severe" : count >= p.locatedAt ? "located" : "warning";
    this.emit({ type: "CONSEQUENCE", tSec: t, level, count, positionKnown: tier?.positionKnown ?? null });
    this.intel.mark(); // "marked by the enemy": Intel up one level, which also raises the HF/DF hazard
    this.syncIntel(t);
    if (tier !== null) for (const e of this.det.forceFix(this.b.watch.freqKhz, tier.reactSec, tier.etaSec)) this.emit(e);
    this.pm(tier !== null ? "located" : reason === "timeout" ? "late" : reason === "badSend" ? "badSend" : "citation", rxId);
  }

  private requestRepeat(rxId: number): boolean {
    const rx = this.rx.get(rxId);
    if (!rx || rx.resolved || !this.startTx(this.b.watch.repeatTxSec, "repeat")) return false;
    this.intel.pattern("RPT"); // the identical request header is a traffic-analysis pattern from the 2nd use on
    const u = derive(this.seed, "repeat", rxId, rx.attempts).next();
    this.at(this.tSec + lerp(this.b.watch.repeatDelaySec, u), () => this.deliver(rxId));
    return true;
  }

  private sendChallenge(rxId: number): boolean {
    const rx = this.rx.get(rxId);
    if (!rx || rx.resolved || rx.challenge !== undefined || !this.startTx(this.b.watch.challengeTxSec, "challenge")) return false;
    const ch = this.ledger.issue(this.challengeRng);
    rx.challenge = ch;
    this.emit({ type: "CHALLENGE_SENT", tSec: this.tSec, rxId, row: ch.row, col: ch.col });
    const u = derive(this.seed, "replydelay", rxId).next();
    this.at(this.tSec + lerp(this.b.watch.challengeReplySec, u), () => this.reply(rxId, ch));
    return true;
  }

  private reply(rxId: number, ch: Challenge): void {
    const rx = this.rx.get(rxId);
    if (!rx || this.ended) return;
    const right = lookup(this.table, ch.row, ch.col);
    let answer = right;
    if (rx.gen.truth.forged) {
      const r = derive(this.seed, "replyauth", rxId);
      if (!r.chance(this.intel.forgeryPassProbability())) answer = L((idx(right) + 1 + r.int(25)) % 26);
    }
    rx.reply = answer;
    this.emit({ type: "CHALLENGE_REPLY", tSec: this.tSec, rxId, reply: answer });
  }

  /** The player compares the reply with their own table; the ledger burns the cell either way. */
  private checkReply(rxId: number): boolean {
    const rx = this.rx.get(rxId);
    if (!rx || rx.challenge === undefined || rx.reply === undefined || rx.replyChecked) return false;
    rx.replyChecked = true;
    const res = this.ledger.verify(rx.challenge, rx.reply);
    this.emit({ type: "AUTH_RESULT", tSec: this.tSec, ok: res === "ok", reason: res });
    return true;
  }

  private resolve(rxId: number, decision: "accept" | "reject"): boolean {
    const rx = this.rx.get(rxId);
    if (!rx || rx.resolved) return false;
    rx.resolved = true;
    const forged = rx.gen.truth.forged;
    const correct = (decision === "accept") !== forged;
    this.resolved.push({ rxId, decision, correct });
    this.emit({ type: "MSG_RESOLVED", tSec: this.tSec, rxId, decision, forged, correct });
    if (decision === "accept") {
      this.startTx(this.b.watch.ackTxSec, "ack"); // acknowledging an order keys the transmitter
      if (forged) this.spawnAmbush();
      if (rx.move !== null) this.takeOrder(rxId, rx.move);
    }
    return true;
  }

  /** A forged order lured the boat onto an escort: a fast escort closes from a random bearing. */
  private spawnAmbush(): void {
    const r = derive(this.seed, "ambush", this.ambushes);
    const k = this.b.sonar.kinds.escort;
    const s = this.boat.state();
    const bearing = r.next() * 2 * Math.PI;
    const track: Track = {
      id: 100 + this.ambushes++, kind: "escort",
      x: s.x + Math.sin(bearing) * this.b.watch.ambush.rangeM, y: s.y + Math.cos(bearing) * this.b.watch.ambush.rangeM,
      courseDeg: (((bearing * 180) / Math.PI) + 180) % 360, speedMs: this.b.watch.ambush.speedMs,
      shaftRps: lerp(k.shaftRps, r.next()), blades: k.blades, srcLevelDb: lerp(k.srcLevelDb, r.next()),
    };
    this.sonar.add(track);
  }
}

/** Rebuild a watch from the save file (seed + command log). Same inputs => identical event log. */
export function replay(seed: number | string, commands: readonly LoggedCommand[], untilTick: number, b: Balance = BALANCE, opts?: WatchOptions): Watch {
  const w = new Watch(seed, b, opts);
  let i = 0;
  for (;;) {
    while (i < commands.length && (commands[i] as LoggedCommand).tick === w.tickCount) w.dispatch((commands[i++] as LoggedCommand).cmd);
    if (w.endReason !== null || w.tickCount >= untilTick) break;
    w.step();
  }
  return w;
}
