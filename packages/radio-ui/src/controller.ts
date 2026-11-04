// Controller: the only place that mutates the sim (Session.dispatch / Session.step). Vietnamese: UI -> Command -> dispatch; sự kiện về qua bus.
import type { Command, SimEvent } from "@uboat/sim-core";
import type { Actions, BoatOrder, Ctx } from "./ctx";
import type { AudioEngine } from "./audio/engine";
import { hydrophoneParams, type Hydrophone } from "./audio/hydrophone";
import { planMorse, type MorsePlayer } from "./audio/morse";
import type { Action } from "./input/keymap";
import { explainRefusal, needsRx } from "./refusal";
import type { FixedStepLoop } from "./sim/loop";
import { Session } from "./sim/session";
import { clearCopies } from "./sim/transcripts";
import type { Analysis, Store, WordView } from "./store";

export interface ControllerEnv {
  readonly storage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } | null;
  readonly navigate: (query: string) => void;
  readonly cosmeticSeed: number; // audio jitter stream seed, independent of the sim seed (R1.2)
  readonly ctxRef: { flags: Ctx["flags"] };
}

const QUEUE_MAX = 3;

export class Controller implements Actions {
  private readonly queue: { rxId: number; attempt: number }[] = [];
  private manualPause = false;

  constructor(
    readonly session: Session,
    readonly store: Store,
    private readonly audio: AudioEngine,
    private readonly morse: MorsePlayer,
    private readonly hydro: Hydrophone,
    private readonly loop: FixedStepLoop,
    private readonly env: ControllerEnv,
  ) {
    session.watch.bus.subscribe((e) => this.onEvent(e));
  }

  private get watch() { return this.session.watch; }

  // ------------------------------------------------------------------ sim stepping

  /** One fixed 1 s sim step (called by the render loop zero or more times per frame). */
  stepSim(): void {
    this.session.step();
    this.syncTelemetry();
  }

  syncTelemetry(): void {
    const w = this.watch;
    const sum = w.summary();
    const b = w.boat.state();
    const r = w.boat.radio();
    this.store.setClock(w.tSec, sum.txTotalSec); // only tSec / txTotalSec are read; Intel is never touched
    this.store.setBoat({
      mode: b.mode, speedKn: b.speedKn, headingDeg: b.headingDeg, depthM: b.depthM, hull: b.hull,
      silence: b.radioSilence, antennaUp: r.exposure > 0, canTransmit: r.canTransmit,
    });
    this.store.setListen(w.listen());
    this.updateHydrophone();
  }

  /** Per-frame work: audio queue. */
  frame(): void {
    if (this.queue.length > 0 && !this.morse.playing) {
      const next = this.queue[0] as { rxId: number; attempt: number };
      if (this.playRx(next.rxId, next.attempt)) this.queue.shift();
    }
  }

  /** Stop every scheduled sound (Morse + hydrophone). Safe to call repeatedly. */
  silenceAudio(): void { this.morse.stop(); this.hydro.stop(); this.store.state.hydrophone = null; }

  private onEvent(e: SimEvent): void {
    this.store.apply(e);
    if (e.type === "WATCH_END") { this.queue.length = 0; this.silenceAudio(); }
    if (e.type === "MSG_RX") {
      this.queue.push({ rxId: e.rxId, attempt: e.attempt });
      while (this.queue.length > QUEUE_MAX) this.queue.shift();
    }
  }

  // ------------------------------------------------------------------ audio

  private playRx(rxId: number, attempt: number): boolean {
    const rx = this.store.state.rx.get(rxId);
    const a = rx?.attempts.find((x) => x.attempt === attempt);
    if (!rx || !a) return true; // nothing to play: drop from queue
    return this.morse.play(planMorse(a.tokens, rx.txFist, rx.from, a.snrDb, this.env.cosmeticSeed, rxId, attempt));
  }

  replayAudio(): void {
    const s = this.store.state;
    if (s.activeRx === null) { this.store.notify("No signal received yet."); return; }
    if (this.audio.needsGesture) { this.audio.unlock(); }
    if (!this.playRx(s.activeRx, s.activeAttempt)) this.store.notify("Sound is not enabled yet — press any key.");
  }

  private updateHydrophone(): void {
    const id = this.store.state.hydrophone;
    if (id === null) { if (this.hydro.active) this.hydro.stop(); return; }
    const c = this.store.state.sonar.get(id);
    if (!c || !c.audible) { this.hydro.stop(); this.store.state.hydrophone = null; this.store.mark("sonar"); return; }
    this.hydro.update(hydrophoneParams(c, this.store.state.boat.headingDeg));
  }

  toggleHydrophone(contactId?: number): void {
    const s = this.store.state;
    if (s.hydrophone !== null && (contactId === undefined || contactId === s.hydrophone)) { s.hydrophone = null; this.hydro.stop(); this.store.mark("sonar"); return; }
    const heard = [...s.sonar.values()].filter((c) => c.audible).sort((a, b) => Number(b.guess === "escort") - Number(a.guess === "escort"));
    const pick = contactId === undefined ? heard[0] : heard.find((c) => c.id === contactId);
    if (!pick) { this.store.notify("Hydrophone: nothing to hear."); return; }
    this.audio.unlock();
    if (!this.hydro.start()) { this.store.notify("Sound is not enabled yet — press any key, then try again."); return; }
    s.hydrophone = pick.id;
    this.updateHydrophone();
    this.store.mark("sonar");
  }

  // ------------------------------------------------------------------ commands

  private send(cmd: Command): boolean {
    const s = this.store.state;
    if (needsRx(cmd) && s.rx.get(cmd.rxId) === undefined) { this.store.notify("Select a message first — none has arrived yet."); return false; }
    if (cmd.kind === "check") this.store.noteCheck(cmd.rxId);
    const ok = this.session.dispatch(cmd);
    if (!ok) { s.pendingCheck = null; this.store.notify(explainRefusal(cmd, s)); }
    this.syncTelemetry();
    return ok;
  }

  private activeId(): number | null { return this.store.state.activeRx; }
  private withRx(make: (rxId: number) => Command): void {
    const id = this.activeId();
    if (id === null) { this.store.notify("Select a message first — none has arrived yet."); return; }
    this.send(make(id));
  }

  repeat(): void { this.withRx((rxId) => ({ kind: "repeat", rxId })); }
  challenge(): void { this.withRx((rxId) => ({ kind: "challenge", rxId })); }
  check(): void { this.withRx((rxId) => ({ kind: "check", rxId })); }
  resolve(decision: "accept" | "reject"): void { this.withRx((rxId) => ({ kind: "resolve", rxId, decision })); }
  report(seconds: number): void { this.send({ kind: "transmit", seconds }); }
  toggleSilence(): void { this.send({ kind: "silence", on: !this.store.state.boat.silence }); }
  setMode(m: BoatOrder): void { this.send({ kind: "mode", mode: m }); }
  steerHeading(delta: number): void { this.send({ kind: "heading", deg: this.store.state.boat.headingDeg + delta }); }
  steerSpeed(delta: number): void { this.send({ kind: "speed", kn: Math.max(0, Math.round(this.store.state.boat.speedKn) + delta) }); }
  setSpeedTo(kn: number): void { this.send({ kind: "speed", kn }); }

  // ------------------------------------------------------------------ decode / authenticate

  decode(): void {
    const st = this.store.state;
    const rx = this.store.activeView();
    if (!rx) { this.store.notify("Nothing to decode yet."); return; }
    const att = rx.attempts.find((a) => a.attempt === st.activeAttempt);
    const copy = (rx.copy.get(st.activeAttempt) ?? "").trim();
    if (!att || copy.length === 0) { this.store.notify("Copy the signal first (type what you hear), then press Enter."); return; }
    const d = this.watch.decipher(att.indicator, copy);
    const words = copy.split(/\s+/).filter((w) => w.length > 0);
    const last = words[words.length - 1];
    if (last !== undefined && last.length === 1 && /[A-Z]/.test(last)) words.pop(); // mirrors decipherCopy: trailing single letter = check letter
    let pos = 0;
    const views: WordView[] = words.map((w) => {
      const plain = d.plain.slice(pos, pos + w.length);
      pos += w.length;
      return { copy: w, plain, ok: w.length === 4 };
    });
    const a: Analysis = {
      plain: d.plain, words: views, checkLetter: d.checkLetter, damagedGroups: d.damagedGroups,
      matches: this.watch.checkMatches(rx.from, d),
      tells: this.watch.assess({ from: rx.from, sentAtMin: rx.sentAtMin, txFist: rx.txFist, dfBearingDeg: rx.dfBearingDeg }, d.plain),
    };
    this.store.setAnalysis(rx.rxId, st.activeAttempt, a);
  }

  toggleLookup(): void {
    const wasActive = this.store.state.lookup.active; // lookup is mutated in place, so read it BEFORE setLookup
    this.store.setLookup({ active: !wasActive, row: null, col: null });
    if (!wasActive) this.store.openDrawer("auth"); else this.store.closeDrawer(); // the table lives in a drawer in the P5 scene
  }

  /** Esc: close the drawer first (leaving lookup), otherwise pause/resume. */
  private escape(): void {
    const s = this.store.state;
    if (s.drawer !== null) { this.store.closeDrawer(); if (s.lookup.active) this.store.setLookup({ active: false, row: null, col: null }); return; }
    this.togglePause();
  }

  openAuthTable(): void { this.store.setLookup({ active: true, row: null, col: null }); this.store.openDrawer("auth"); }
  openDrawer(d: "sonar" | "log"): void { this.store.openDrawer(d); }
  closeDrawer(): void { this.store.closeDrawer(); if (this.store.state.lookup.active) this.store.setLookup({ active: false, row: null, col: null }); }
  showView(v: "copy" | "plain"): void { this.store.setView(v); }
  lookupCell(row: string, col: string): void { this.store.setLookup({ row, col }); }

  private lookupLetter(ch: string): void {
    const lk = this.store.state.lookup;
    if (!/^[A-Z]$/.test(ch)) return;
    if (lk.row === null || lk.col !== null) this.store.setLookup({ row: ch, col: null });
    else this.store.setLookup({ col: ch });
  }

  // ------------------------------------------------------------------ misc

  dismissEmergency(): void {
    const s = this.store.state;
    s.emergency = { untilSec: 0, reason: null };
    this.store.mark("ui", "alert");
  }

  togglePause(): void {
    if (this.store.state.ended !== null) return;
    this.manualPause = !this.manualPause;
    this.applyPause(this.manualPause);
  }

  /** Tab hidden: freeze the sim (design s9). Returning does NOT auto-resume: the player resumes with Esc. */
  autoPause(): void {
    if (this.store.state.ended !== null) return;
    this.manualPause = true;
    this.applyPause(true);
    this.session.save();
  }

  private applyPause(p: boolean): void {
    if (p) this.silenceAudio(); // paused watch => no scheduled tones or hydrophone left running (R2.5)
    if (p) this.loop.pause(); else this.loop.resume();
    this.store.state.paused = p;
    this.store.mark("ui");
  }

  setSimSpeed(factor: number): void {
    this.loop.setSpeed(factor);
    this.env.ctxRef.flags.simSpeed = factor;
    this.store.mark("ui");
  }

  newGame(sameSeed: boolean): void {
    Session.clear(this.env.storage);
    clearCopies(this.env.storage);
    this.env.navigate(sameSeed ? `?seed=${this.session.seed}` : "");
  }

  // ------------------------------------------------------------------ key actions

  handle(a: Action): void {
    const s = this.store.state;
    switch (a.t) {
      case "char":
        if (s.lookup.active) this.lookupLetter(a.ch); else if (s.ended === null) this.store.typeChar(a.ch);
        break;
      case "space": if (!s.lookup.active) this.store.typeChar(" "); break;
      case "backspace":
        if (s.lookup.active) this.store.setLookup(s.lookup.col !== null ? { col: null } : { row: null });
        else this.store.backspace();
        break;
      case "confirm": if (s.lookup.active) this.toggleLookup(); else this.decode(); break;
      case "replayAudio": this.replayAudio(); break;
      case "nextRx": this.store.cycleRx(1); break;
      case "prevRx": this.store.cycleRx(-1); break;
      case "nextAttempt": this.store.cycleAttempt(1); break;
      case "prevAttempt": this.store.cycleAttempt(-1); break;
      case "pause": this.escape(); break;
      case "toggleLookup": this.toggleLookup(); break;
      case "toggleHydrophone": this.toggleHydrophone(); break;
      case "dismissEmergency": this.dismissEmergency(); break;
      case "heading": this.steerHeading(a.delta); break;
      case "speed": this.steerSpeed(a.delta); break;
      case "speedTo": this.setSpeedTo(a.kn); break;
      case "cmd":
        switch (a.cmd) {
          case "repeat": this.repeat(); break;
          case "challenge": this.challenge(); break;
          case "check": this.check(); break;
          case "accept": this.resolve("accept"); break;
          case "reject": this.resolve("reject"); break;
          case "report10": this.report(10); break;
          case "report30": this.report(30); break;
          case "silence": this.toggleSilence(); break;
          case "surface": case "periscope": case "dive": this.setMode(a.cmd); break;
        }
        break;
    }
  }
}
