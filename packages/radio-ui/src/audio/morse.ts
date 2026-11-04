// Morse playback. Vietnamese: lịch phát (toneSpans) là hàm thuần để test; Web Audio chỉ thực thi lịch đó.
// Jitter âm thanh dùng RNG thẩm mỹ RIÊNG (derive từ cosmeticSeed), tuyệt đối không dùng RNG của sim (R1.2).
import { derive, fnv1a, schedule, type Fist, type Rng, type Segment } from "@uboat/sim-core";
import type { AudioEngine } from "./engine";

export interface ToneSpan { readonly startSec: number; readonly endSec: number }

export interface MorsePlan {
  readonly spans: readonly ToneSpan[];
  readonly endSec: number; // relative to start of playback
  readonly freqHz: number;
  readonly noiseGain: number;
}

/** Tone pitch per station (stable per callsign) so the operator can tell stations apart by ear. */
export function toneFrequencyHz(callsign: string): number { return 520 + (fnv1a(`tone:${callsign}`) % 360); }

/** Background hiss level from the received SNR: poorer signal => louder noise (0..0.35). */
export function noiseGain(snrDb: number): number { return Math.min(0.35, Math.max(0.02, (45 - snrDb) / 80)); }

export function cosmeticRng(cosmeticSeed: number, rxId: number, attempt: number): Rng { return derive(cosmeticSeed, "morse-audio", rxId, attempt); }

/** Convert timing segments into absolute tone on/off spans (seconds from t0). */
export function toneSpans(segments: readonly Segment[], t0 = 0): { spans: ToneSpan[]; endSec: number } {
  const spans: ToneSpan[] = [];
  let t = t0;
  for (const s of segments) {
    const d = s.ms / 1000;
    if (s.tone) spans.push({ startSec: t, endSec: t + d });
    t += d;
  }
  return { spans, endSec: t };
}

/**
 * Build the playback plan for received tokens. Replaying the same (rxId, attempt) gives the SAME timing,
 * because the cosmetic RNG is derived from them: no fresh noise is generated on replay (R1.3).
 */
export function planMorse(tokens: string, fist: Fist, callsign: string, snrDb: number, cosmeticSeed: number, rxId: number, attempt: number): MorsePlan {
  const segs = schedule(tokens, fist, cosmeticRng(cosmeticSeed, rxId, attempt));
  const { spans, endSec } = toneSpans(segs, 0);
  return { spans, endSec, freqHz: toneFrequencyHz(callsign), noiseGain: noiseGain(snrDb) };
}

const RAMP = 0.004; // 4 ms attack/release: no key clicks

export class MorsePlayer {
  private spans: readonly ToneSpan[] = [];
  private startedAt = 0;
  private endAt = 0;
  private nodes: { stop(): void }[] = [];

  constructor(private readonly engine: AudioEngine) {}

  get playing(): boolean { return this.engine.ctx !== null && this.engine.now < this.endAt; }

  /** True while a tone element is sounding right now; drives the waveform and the tone lamp (R1.5). */
  toneOn(): boolean {
    if (!this.playing) return false;
    const t = this.engine.now - this.startedAt;
    return this.spans.some((s) => t >= s.startSec && t < s.endSec);
  }

  /** Returns false when sound cannot start yet (no gesture / unsupported). */
  play(plan: MorsePlan): boolean {
    const ctx = this.engine.ctx;
    const out = this.engine.morseOut;
    if (ctx === null || out === null || ctx.state !== "running") return false;
    this.stop();
    const t0 = ctx.currentTime + 0.08;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = plan.freqHz;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(out);
    for (const s of plan.spans) {
      gain.gain.setValueAtTime(0, t0 + s.startSec);
      gain.gain.linearRampToValueAtTime(0.5, t0 + s.startSec + RAMP);
      gain.gain.setValueAtTime(0.5, Math.max(t0 + s.startSec + RAMP, t0 + s.endSec - RAMP));
      gain.gain.linearRampToValueAtTime(0, t0 + s.endSec);
    }
    const end = t0 + plan.endSec + 0.15;
    osc.start(t0);
    osc.stop(end);

    const nodes: { stop(): void }[] = [{ stop: () => { try { osc.stop(); } catch { /* already stopped */ } } }];
    const noise = this.engine.noiseSource();
    if (noise !== null) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = plan.freqHz;
      bp.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.value = plan.noiseGain;
      noise.connect(bp).connect(ng).connect(out);
      noise.start(t0 - 0.05);
      noise.stop(end);
      nodes.push({ stop: () => { try { noise.stop(); } catch { /* already stopped */ } } });
    }
    this.nodes = nodes;
    this.spans = plan.spans;
    this.startedAt = t0;
    this.endAt = end;
    return true;
  }

  stop(): void {
    for (const n of this.nodes) n.stop();
    this.nodes = [];
    this.endAt = 0;
    this.spans = [];
  }
}
