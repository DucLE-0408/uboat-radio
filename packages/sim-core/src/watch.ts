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
import { judge, lossOrder, orderItems, validAction, type OrderItem, type PaperAction, type PaperFault } from "./paper";
import {
  generateForgery, generateGenuine, makeCallsigns, makeKnownFists, type Generated, type Truth, type WorldCtx,
} from "./messages";
import { applyNoise } from "./morse";
import { derive, type Rng } from "./rng";
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
  | { readonly kind: "timer"; readonly on: boolean };

export type EndReason = "time" | "sunk" | "executed";

export interface LoggedCommand { readonly tick: number; readonly cmd: Command }

export interface WatchSummary {
  readonly tSec: number;
  readonly endReason: EndReason | null;
  readonly citations: number;
  readonly hull: number;
  readonly sunk: boolean;
  readonly intelLevel: number;
  readonly txTotalSec: number;
  readonly resolved: readonly { readonly rxId: number; readonly decision: "accept" | "reject"; readonly correct: boolean }[];
}

interface RxState {
  readonly gen: Generated;
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
  private timerOn = false;
  private citations = 0;
  private readonly cited = new Set<string>();
  private readonly items: readonly OrderItem[];
  private readonly lossQueue: string[];
  private readonly lost = new Set<string>();
  private ambushes = 0;

  constructor(private readonly seed: number | string, private readonly b: Balance = BALANCE) {
    this.boat = new Boat(this.bus, { x: 0, y: 0, headingDeg: 0 }, b);
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
    this.items = orderItems(seed, b);
    this.lossQueue = lossOrder(seed, this.items);

    this.bus.subscribe((e) => { if (e.type === "BOAT_SUNK") this.onSunk(e.tSec); });

    const m = derive(seed, "merchant");
    const kind = b.sonar.kinds.merchant;
    const bearing = m.next() * 2 * Math.PI;
    this.sonar.add({
      id: 1, kind: "merchant",
      x: Math.sin(bearing) * b.watch.merchant.rangeM, y: Math.cos(bearing) * b.watch.merchant.rangeM,
      courseDeg: ((bearing * 180) / Math.PI + 90) % 360, speedMs: b.watch.merchant.speedMs,
      shaftRps: lerp(kind.shaftRps, m.next()), blades: kind.blades, srcLevelDb: lerp(kind.srcLevelDb, m.next()),
    });

    b.watch.messages.forEach((msg, i) => this.at(msg.atSec, () => this.inject(i + 1, msg.forged)));
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
      ownPos: { x: this.b.watch.originKm.x + s.x / 1000, y: this.b.watch.originKm.y + s.y / 1000 },
      nowMin: this.b.watch.startMin + this.tSec / 60,
      knownFists: this.knownFists,
      callsigns: this.callsigns,
    };
  }

  /** The operator's Enigma machine: day key + the message indicator sent in the clear. */
  decipher(indicator: string, copy: string): Deciphered { return decipherCopy(this.seed, DAY, indicator, copy); }
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
      tSec: this.tSec, endReason: this.ended, citations: this.citations, hull: s.hull, sunk: s.sunk, intelLevel: this.intel.level,
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

    this.boat.tick(DT);

    const radio = this.boat.radio();
    if (!radio.canTransmit) this.txRemaining = 0; // diving or sunk cuts the key
    const transmitting = this.txRemaining > 0;
    if (transmitting) {
      this.txRemaining = Math.max(0, this.txRemaining - DT);
      this.txTotal += DT;
      this.intel.transmit(DT);
    }
    const hf = this.det.tick(DT, transmitting ? { freqKhz: this.b.watch.freqKhz } : null, { exposure: radio.exposure, intelLevel: this.intel.level });
    for (const e of hf) this.bus.emit(e);

    const s = this.boat.state();
    const listener = { x: s.x, y: s.y, speedKn: s.speedKn };
    for (const e of this.sonar.tick(DT, t, listener, this.asdicRng, this.b)) this.bus.emit(e);
    if (this.tick % this.b.watch.sonarPeriodSec === 0) this.scanSonar(t, listener);

    this.intel.tickMinutes(DT / 60);
    this.syncIntel(t);

    if (!this.ended && this.tSec >= this.b.watch.durationSec) {
      this.ended = "time";
      this.bus.emit({ type: "WATCH_END", tSec: t, reason: "time" });
    }
  }

  // ---------------------------------------------------------------- internals

  private at(sec: number, fn: () => void): void {
    this.timers.push({ atTick: Math.max(this.tick + 1, Math.ceil(sec / DT)), fn });
  }

  private emit(e: SimEvent): void { this.bus.emit(e); }

  private startTx(seconds: number, purpose: "report" | "repeat" | "challenge" | "ack"): boolean {
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

  private inject(id: number, forged: boolean): void {
    const ctx = this.worldCtx();
    const gen = forged
      ? generateForgery(this.seed, id, "ORDER", this.intel.level, ctx, this.b)
      : generateGenuine(this.seed, id, "ORDER", ctx, this.b);
    const real = trueCheckLetter(this.table, gen.msg.from, gen.msg.plain);
    let letter = real;
    if (forged) {
      // A forger without the table guesses the check letter; Intel decides how often the guess is right.
      const r = derive(this.seed, "forgeauth", id);
      if (!r.chance(this.intel.forgeryPassProbability())) letter = L((idx(real) + 1 + r.int(25)) % 26);
    }
    this.rx.set(id, { gen, checkLetter: letter, attempts: 0, deadlineAt: null, handed: false, challenge: undefined, reply: undefined, replyChecked: false, resolved: false });
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
    });
    if (rx.attempts === 0) { // the clock for this message starts when it first reaches the desk
      rx.deadlineAt = this.tSec + this.b.paper.deadlineSec;
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
    for (const f of judge(action)) this.cite(rxId, f);
    return true;
  }

  private setTimer(on: boolean): boolean {
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
    if (count >= p.executeAt) {
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
export function replay(seed: number | string, commands: readonly LoggedCommand[], untilTick: number, b: Balance = BALANCE): Watch {
  const w = new Watch(seed, b);
  let i = 0;
  for (;;) {
    while (i < commands.length && (commands[i] as LoggedCommand).tick === w.tickCount) w.dispatch((commands[i++] as LoggedCommand).cmd);
    if (w.endReason !== null || w.tickCount >= untilTick) break;
    w.step();
  }
  return w;
}
