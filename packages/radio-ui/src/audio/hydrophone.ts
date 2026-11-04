// Hydrophone: propeller beat at the measured blade rate. Vietnamese: tần số xung = blade rate; mức theo SNR; pan theo bearing tương đối.
import type { AudioEngine } from "./engine";

export interface HydroParams { readonly beatHz: number; readonly level: number; readonly pan: number }

const rad = (d: number): number => (d * Math.PI) / 180;

/** Pure mapping from a sonar observation (+ own heading) to audio parameters. */
export function hydrophoneParams(o: { bearingDeg: number; bladeRateHz: number; snrDb: number }, headingDeg: number): HydroParams {
  const rel = o.bearingDeg - headingDeg;
  return {
    beatHz: Math.min(20, Math.max(0.5, o.bladeRateHz)),
    level: Math.min(0.5, Math.max(0.05, (o.snrDb + 5) / 60)),
    pan: Math.max(-1, Math.min(1, Math.sin(rad(rel)))),
  };
}

export class Hydrophone {
  private chain: { osc: OscillatorNode; lfo: OscillatorNode; depth: GainNode; amp: GainNode; pan: StereoPannerNode } | null = null;

  constructor(private readonly engine: AudioEngine) {}

  get active(): boolean { return this.chain !== null; }

  start(): boolean {
    const ctx = this.engine.ctx;
    const out = this.engine.hydroOut;
    if (ctx === null || out === null || ctx.state !== "running") return false;
    if (this.chain !== null) return true;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 62;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 280;
    const amp = ctx.createGain();
    amp.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.type = "square";
    const depth = ctx.createGain();
    lfo.connect(depth).connect(amp.gain);
    const pan = ctx.createStereoPanner();
    osc.connect(lp).connect(amp).connect(pan).connect(out);
    osc.start();
    lfo.start();
    this.chain = { osc, lfo, depth, amp, pan };
    return true;
  }

  update(p: HydroParams): void {
    const c = this.chain;
    const ctx = this.engine.ctx;
    if (c === null || ctx === null) return;
    const t = ctx.currentTime;
    c.lfo.frequency.setTargetAtTime(p.beatHz, t, 0.1);
    c.amp.gain.setTargetAtTime(p.level * 0.5, t, 0.1); // base level; LFO adds +/- depth around it
    c.depth.gain.setTargetAtTime(p.level * 0.5, t, 0.1);
    c.pan.pan.setTargetAtTime(p.pan, t, 0.1);
  }

  stop(): void {
    const c = this.chain;
    if (c === null) return;
    try { c.osc.stop(); c.lfo.stop(); } catch { /* already stopped */ }
    c.osc.disconnect(); c.lfo.disconnect(); c.pan.disconnect();
    this.chain = null;
  }
}
