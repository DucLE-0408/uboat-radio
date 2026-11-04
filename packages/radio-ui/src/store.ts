// UI state derived ONLY from SimEvents plus the player's own input and the public observation helpers.
// Vietnamese: không trường nào ở đây đến từ ground truth của sim; hazard/Intel không bao giờ được lưu hay hiển thị.
import type { Fist, LoggedCommand, SimEvent, Tell } from "@uboat/sim-core";

export type Topic = "drawer" | "view" | "rx" | "copy" | "analysis" | "challenge" | "sonar" | "tx" | "boat" | "alert" | "log" | "ended" | "ui" | "clock";

export interface AttemptView { readonly attempt: number; readonly indicator: string; readonly tokens: string; readonly snrDb: number; readonly tSec: number }
export interface WordView { readonly copy: string; readonly plain: string; readonly ok: boolean }
export interface Analysis {
  readonly plain: string;
  readonly words: readonly WordView[];
  readonly checkLetter: string | null;
  readonly matches: boolean;
  readonly damagedGroups: number;
  readonly tells: readonly Tell[];
}
export type AuthReason = "ok" | "wrong" | "replay";
export interface ChallengeView { readonly row: string; readonly col: string; reply: string | null; result: AuthReason | null }
export interface RxView {
  readonly rxId: number;
  readonly from: string;
  readonly net: string;
  readonly sentAtMin: number;
  readonly txFist: Fist;
  readonly dfBearingDeg: number;
  readonly attempts: AttemptView[];
  readonly copy: Map<number, string>;
  readonly analysis: Map<number, Analysis>;
  challenge: ChallengeView | null;
  resolved: { readonly decision: "accept" | "reject"; readonly correct: boolean } | null;
  unread: boolean;
}
export interface SonarView { readonly id: number; bearingDeg: number; bladeRateHz: number; snrDb: number; guess: "escort" | "slow"; audible: boolean }
export interface BoatView {
  mode: "surface" | "periscope" | "dive";
  speedKn: number; headingDeg: number; depthM: number; hull: number;
  silence: boolean; antennaUp: boolean; canTransmit: boolean;
}
export type LogLevel = "info" | "warn" | "alert";
export interface LogLine { readonly tSec: number; readonly level: LogLevel; readonly text: string }
export interface Decision { readonly rxId: number; readonly decision: "accept" | "reject"; readonly correct: boolean }

export interface UiState {
  tSec: number;
  rx: Map<number, RxView>;
  order: number[];
  activeRx: number | null;
  activeAttempt: number;
  sonar: Map<number, SonarView>;
  tx: { totalSec: number; keyedUntilSec: number; locatedAtSec: number | null; escortAtSec: number | null; depthChargeAtSec: number | null };
  /** Which text the SECRET paper shows: the player's own copy or the deciphered plain text. */
  view: "copy" | "plain";
  drawer: Drawer | null;
  /** Increments on every decode (drives the lamp reveal animation) and on every live alert (drives the flash). Never advanced by a silent rebuild. */
  decodeSeq: number;
  alertSeq: number;
  boat: BoatView;
  emergency: { untilSec: number; reason: "asdic" | "depth_charge" | null };
  log: LogLine[];
  decisions: Decision[];
  ended: "time" | "sunk" | null;
  notice: { text: string; seq: number } | null;
  pendingCheck: number | null;
  /** True while a restored event log is being re-applied (silent: no alarms survive unless still in force). */
  replaying: boolean;
  lookup: { row: string | null; col: string | null; active: boolean };
  hydrophone: number | null; // contactId being listened to
  paused: boolean;
}

export type Drawer = "auth" | "sonar" | "log";

export const EMERGENCY_SEC = 25; // UI-only duration of the "all hands" layout after a BRIDGE_ALERT
export const COPY_MAX = 400;
const LOG_MAX = 300;

export function emptyState(): UiState {
  return {
    tSec: 0, rx: new Map(), order: [], activeRx: null, activeAttempt: 0, sonar: new Map(),
    tx: { totalSec: 0, keyedUntilSec: 0, locatedAtSec: null, escortAtSec: null, depthChargeAtSec: null }, view: "copy", drawer: null, decodeSeq: 0, alertSeq: 0,
    boat: { mode: "surface", speedKn: 0, headingDeg: 0, depthM: 0, hull: 100, silence: false, antennaUp: true, canTransmit: true },
    emergency: { untilSec: 0, reason: null }, log: [], decisions: [], ended: null, notice: null, pendingCheck: null, replaying: false,
    lookup: { row: null, col: null, active: false }, hydrophone: null, paused: false,
  };
}

export const copyKey = (rxId: number, attempt: number): string => `${rxId}:${attempt}`;

export function formatClock(tSec: number): string {
  const s = Math.max(0, Math.floor(tSec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Minutes since midnight -> "HHMM" (day wrap). */
export function formatDtg(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
}

type Listener = () => void;

export class Store {
  readonly state: UiState = emptyState();
  private readonly dirty = new Set<Topic>();
  private readonly subs: { topics: readonly Topic[]; fn: Listener }[] = [];
  private noticeSeq = 0;

  /** Subscribe a panel updater to topics; it is called from flush() only when one of them changed. */
  on(topics: readonly Topic[], fn: Listener): () => void {
    const s = { topics, fn };
    this.subs.push(s);
    return () => { const i = this.subs.indexOf(s); if (i >= 0) this.subs.splice(i, 1); };
  }

  mark(...t: Topic[]): void { for (const x of t) this.dirty.add(x); }

  flush(): void {
    if (this.dirty.size === 0) return;
    const d = [...this.dirty];
    this.dirty.clear();
    for (const s of this.subs) if (s.topics.some((t) => d.includes(t))) s.fn();
  }

  // ------------------------------------------------------------------ Event Bus reducer

  apply(e: SimEvent): void {
    const st = this.state;
    switch (e.type) {
      case "MSG_RX": this.onRx(e); break;
      case "SONAR_CONTACT":
        st.sonar.set(e.contactId, { id: e.contactId, bearingDeg: e.bearingDeg, bladeRateHz: e.bladeRateHz, snrDb: e.snrDb, guess: e.guess, audible: true });
        this.log(e.tSec, "warn", `Hydrophone contact: ${e.guess === "escort" ? "fast screws (escort?)" : "slow screws"}`);
        this.mark("sonar");
        break;
      case "TX":
        st.tx.keyedUntilSec = Math.max(st.tx.keyedUntilSec, e.tSec) + e.seconds;
        this.log(e.tSec, "info", `Keyed ${e.seconds}s (${e.purpose})`);
        this.mark("tx");
        break;
      case "HFDF_FIX":
        st.tx.locatedAtSec = e.tSec;
        if (!st.replaying) st.alertSeq++;
        this.log(e.tSec, "alert", "!! HF/DF FIX — the enemy has a bearing on us");
        this.mark("tx", "alert");
        break;
      case "ESCORT_DISPATCHED":
        st.tx.escortAtSec = e.tSec;
        if (!st.replaying) st.alertSeq++;
        this.log(e.tSec, "alert", "!! Escort dispatched toward our position");
        this.mark("tx", "alert");
        break;
      case "DEPTH_CHARGE":
        st.tx.depthChargeAtSec = e.tSec;
        if (!st.replaying) st.alertSeq++;
        this.log(e.tSec, "alert", "!! DEPTH CHARGES");
        this.mark("alert", "tx");
        break;
      case "ASDIC_PING":
        this.log(e.tSec, "alert", "!! ASDIC lock — we are being pinged"); // deliberately no range/bearing
        break;
      case "BRIDGE_ALERT":
        st.emergency = { untilSec: e.tSec + EMERGENCY_SEC, reason: e.reason };
        this.log(e.tSec, "alert", `!! BRIDGE ALERT (${e.reason === "asdic" ? "ASDIC" : "depth charge"}) — all hands`);
        this.mark("alert", "ui");
        break;
      case "BOAT_MODE": this.log(e.tSec, "info", `Boat is now ${e.mode}`); st.boat.mode = e.mode; this.mark("boat"); break;
      case "BOAT_DAMAGED": st.boat.hull = e.hull; this.log(e.tSec, "warn", "Hull damaged"); this.mark("boat"); break;
      case "BOAT_SUNK": this.log(e.tSec, "alert", "Boat lost"); this.mark("boat"); break;
      case "KEYBOOK_LOST": this.log(e.tSec, "alert", "Keybook lost with the boat"); break;
      case "INTEL_LEVEL": break; // Allied Intel stays hidden from the player by design
      case "CHALLENGE_SENT": {
        const rx = st.rx.get(e.rxId);
        if (rx) rx.challenge = { row: e.row, col: e.col, reply: null, result: null };
        this.log(e.tSec, "info", `Challenge sent for #${e.rxId}: ${e.row}${e.col}`);
        this.mark("challenge");
        break;
      }
      case "CHALLENGE_REPLY": {
        const rx = st.rx.get(e.rxId);
        if (rx?.challenge) rx.challenge.reply = e.reply;
        this.log(e.tSec, "info", `Challenge reply for #${e.rxId}: ${e.reply}`);
        this.mark("challenge");
        break;
      }
      case "AUTH_RESULT": {
        const id = st.pendingCheck;
        st.pendingCheck = null;
        const rx = id === null ? undefined : st.rx.get(id);
        if (rx?.challenge) rx.challenge.result = e.reason;
        this.log(e.tSec, e.ok ? "info" : "warn", `Authentication ${e.ok ? "PASSED" : e.reason === "replay" ? "REJECTED (cell already used)" : "FAILED"}${id === null ? "" : ` for #${id}`}`);
        this.mark("challenge");
        break;
      }
      case "MSG_RESOLVED": {
        const rx = st.rx.get(e.rxId);
        if (rx) rx.resolved = { decision: e.decision, correct: e.correct }; // 'forged' is intentionally dropped
        st.decisions.push({ rxId: e.rxId, decision: e.decision, correct: e.correct });
        this.log(e.tSec, "info", `#${e.rxId} ${e.decision === "accept" ? "accepted" : "rejected"}`);
        this.mark("rx", "challenge", "ended");
        break;
      }
      case "WATCH_END":
        st.ended = e.reason;
        this.log(e.tSec, "alert", e.reason === "sunk" ? "Watch ended: boat lost" : "Watch ended: dawn");
        this.mark("ended", "ui");
        break;
    }
  }

  private onRx(e: Extract<SimEvent, { type: "MSG_RX" }>): void {
    const st = this.state;
    let rx = st.rx.get(e.rxId);
    if (!rx) {
      rx = {
        rxId: e.rxId, from: e.from, net: e.net, sentAtMin: e.sentAtMin, txFist: e.txFist, dfBearingDeg: e.dfBearingDeg,
        attempts: [], copy: new Map(), analysis: new Map(), challenge: null, resolved: null, unread: true,
      };
      st.rx.set(e.rxId, rx);
      st.order.push(e.rxId);
    }
    rx.attempts.push({ attempt: e.attempt, indicator: e.indicator, tokens: e.tokens, snrDb: e.snrDb, tSec: e.tSec });
    if (st.activeRx === null) { st.activeRx = e.rxId; st.activeAttempt = e.attempt; rx.unread = false; }
    else if (st.activeRx === e.rxId) { st.activeAttempt = e.attempt; }
    this.log(e.tSec, "info", `Signal #${e.rxId} from ${e.from}${e.attempt > 0 ? ` (repeat ${e.attempt})` : ""}`);
    this.mark("rx", "copy", "analysis");
  }

  log(tSec: number, level: LogLevel, text: string): void {
    this.state.log.push({ tSec, level, text });
    if (this.state.log.length > LOG_MAX) this.state.log.splice(0, this.state.log.length - LOG_MAX);
    this.mark("log");
  }

  // ------------------------------------------------------------------ observation / telemetry

  setClock(tSec: number, txTotalSec: number): void {
    const st = this.state;
    if (st.tSec !== tSec) { st.tSec = tSec; this.mark("clock"); }
    if (st.tx.totalSec !== txTotalSec) { st.tx.totalSec = txTotalSec; this.mark("tx"); }
    if (st.emergency.reason !== null && tSec >= st.emergency.untilSec) { st.emergency = { untilSec: 0, reason: null }; this.mark("ui", "alert"); }
  }

  setBoat(b: BoatView): void {
    const cur = this.state.boat;
    if (cur.mode !== b.mode || cur.speedKn !== b.speedKn || cur.headingDeg !== b.headingDeg || cur.depthM !== b.depthM || cur.hull !== b.hull
      || cur.silence !== b.silence || cur.antennaUp !== b.antennaUp || cur.canTransmit !== b.canTransmit) {
      this.state.boat = b;
      this.mark("boat");
    }
  }

  /** Replace what the hydrophone hears this second (from Watch.listen()). */
  setListen(obs: readonly { id: number; bearingDeg: number; bladeRateHz: number; snrDb: number; guess: "escort" | "slow" }[]): void {
    const st = this.state;
    const heard = new Set<number>();
    for (const o of obs) {
      heard.add(o.id);
      st.sonar.set(o.id, { id: o.id, bearingDeg: o.bearingDeg, bladeRateHz: o.bladeRateHz, snrDb: o.snrDb, guess: o.guess, audible: true });
    }
    for (const c of st.sonar.values()) if (!heard.has(c.id)) c.audible = false;
    if (st.hydrophone !== null && !st.sonar.get(st.hydrophone)?.audible) st.hydrophone = null;
    this.mark("sonar");
  }

  // ------------------------------------------------------------------ player input state

  activeView(): RxView | null { return this.state.activeRx === null ? null : this.state.rx.get(this.state.activeRx) ?? null; }

  copyText(rxId: number, attempt: number): string { return this.state.rx.get(rxId)?.copy.get(attempt) ?? ""; }

  /** Append a copy character to the active attempt. Space never doubles or leads; length is bounded. */
  typeChar(ch: string): void {
    const rx = this.activeView();
    if (!rx || rx.resolved) return;
    const cur = rx.copy.get(this.state.activeAttempt) ?? "";
    if (cur.length >= COPY_MAX) return;
    if (ch === " " && (cur.length === 0 || cur.endsWith(" "))) return;
    rx.copy.set(this.state.activeAttempt, cur + ch);
    this.showCopy();
    this.mark("copy");
  }

  backspace(): void {
    const rx = this.activeView();
    if (!rx || rx.resolved) return;
    const cur = rx.copy.get(this.state.activeAttempt) ?? "";
    if (cur.length === 0) return;
    rx.copy.set(this.state.activeAttempt, cur.slice(0, -1));
    this.showCopy();
    this.mark("copy");
  }

  /**
   * End of a silent rebuild. Historical alerts must not re-trigger: the emergency layout survives only if its window
   * is still open at the restored tick, and no pending notice is carried over. Audio is never involved: the controller
   * subscribes to the bus only after the replay, so no historical MSG_RX is queued for playback.
   */
  finishReplay(tSec: number): void {
    const st = this.state;
    st.replaying = false;
    st.tSec = tSec;
    if (st.emergency.reason !== null && tSec >= st.emergency.untilSec) st.emergency = { untilSec: 0, reason: null };
    st.notice = null;
    st.pendingCheck = null;
    this.mark("ui", "alert", "clock");
  }

  /** Non-empty copies as plain entries (for separate persistence). */
  exportCopies(): { rxId: number; attempt: number; text: string }[] {
    const out: { rxId: number; attempt: number; text: string }[] = [];
    for (const rx of this.state.rx.values()) for (const [attempt, text] of rx.copy) if (text.length > 0) out.push({ rxId: rx.rxId, attempt, text });
    return out;
  }

  /** Restore unfinished copies for messages that exist; unknown messages/attempts are ignored. */
  importCopies(entries: readonly { rxId: number; attempt: number; text: string }[]): void {
    for (const e of entries) {
      const rx = this.state.rx.get(e.rxId);
      if (!rx || !rx.attempts.some((a) => a.attempt === e.attempt) || rx.resolved) continue;
      rx.copy.set(e.attempt, e.text);
    }
    this.mark("copy");
  }

  setAnalysis(rxId: number, attempt: number, a: Analysis): void {
    this.state.rx.get(rxId)?.analysis.set(attempt, a);
    if (rxId === this.state.activeRx && attempt === this.state.activeAttempt) { this.state.view = "plain"; this.state.decodeSeq++; this.mark("view"); }
    this.mark("analysis");
  }

  showCopy(): void { if (this.state.view !== "copy") { this.state.view = "copy"; this.mark("view"); } }
  setView(v: "copy" | "plain"): void { if (this.state.view !== v) { this.state.view = v; this.mark("view", "copy"); } }
  openDrawer(d: Drawer): void { if (this.state.drawer !== d) { this.state.drawer = d; this.mark("drawer"); } }
  closeDrawer(): void { if (this.state.drawer !== null) { this.state.drawer = null; this.mark("drawer"); } }

  selectRx(rxId: number): void {
    const rx = this.state.rx.get(rxId);
    if (!rx) return;
    this.state.activeRx = rxId;
    this.state.activeAttempt = (rx.attempts[rx.attempts.length - 1] as AttemptView).attempt;
    rx.unread = false;
    this.state.view = "copy";
    this.mark("rx", "copy", "analysis", "challenge", "view");
  }

  cycleRx(dir: 1 | -1): void {
    const o = this.state.order;
    if (o.length === 0) return;
    const i = this.state.activeRx === null ? -1 : o.indexOf(this.state.activeRx);
    this.selectRx(o[(i + dir + o.length) % o.length] as number);
  }

  cycleAttempt(dir: 1 | -1): void {
    const rx = this.activeView();
    if (!rx || rx.attempts.length < 2) return;
    const nums = rx.attempts.map((a) => a.attempt);
    const i = Math.max(0, nums.indexOf(this.state.activeAttempt));
    this.state.activeAttempt = nums[(i + dir + nums.length) % nums.length] as number;
    this.state.view = "copy";
    this.mark("copy", "analysis", "rx", "view");
  }

  notify(text: string): void {
    this.state.notice = { text, seq: ++this.noticeSeq };
    this.mark("ui");
  }

  /** Called by the controller right before dispatching `check`, so AUTH_RESULT can be attributed to a message. */
  noteCheck(rxId: number): void { this.state.pendingCheck = rxId; }

  setLookup(p: Partial<UiState["lookup"]>): void { Object.assign(this.state.lookup, p); this.mark("challenge"); }
}

/**
 * Rebuild a store from a restored watch: feed events in order and re-attribute AUTH_RESULT to the `check`
 * command that caused it (events carry no rxId). A check is accepted by the sim exactly when the challenge has
 * a reply and no verdict yet, which the store mirrors, so the match is deterministic.
 */
export function rebuildStore(store: Store, events: readonly SimEvent[], commands: readonly LoggedCommand[], restoredAtSec?: number): void {
  const used = new Set<number>();
  store.state.replaying = true;
  for (const ev of events) {
    if (ev.type === "AUTH_RESULT") {
      const idx = commands.findIndex((c, i) => {
        if (used.has(i) || c.cmd.kind !== "check" || c.tick !== Math.round(ev.tSec)) return false;
        const ch = store.state.rx.get(c.cmd.rxId)?.challenge;
        return !!ch && ch.reply !== null && ch.result === null;
      });
      if (idx >= 0) {
        used.add(idx);
        const c = (commands[idx] as LoggedCommand).cmd;
        if (c.kind === "check") store.noteCheck(c.rxId);
      }
    }
    store.apply(ev);
  }
  store.finishReplay(restoredAtSec ?? store.state.tSec);
}
