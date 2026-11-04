export interface AudioMix { readonly master: number; readonly morse: number; readonly hydro: number; readonly sound: boolean }

// One shared AudioContext, created only after a user gesture (R1.4). Vietnamese: autoplay policy => không tạo/phát trước thao tác đầu.
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private morseBus: GainNode | null = null;
  private hydroBus: GainNode | null = null;
  private mix: AudioMix = { master: 1, morse: 1, hydro: 1, sound: true };
  /** Diagnostics hook: receives short error codes only (never messages). */
  onError: (code: string) => void = () => {};

  /** False when the browser has no Web Audio at all (UI falls back to visual Morse, design s9). */
  get supported(): boolean { return typeof AudioContext !== "undefined"; }
  get ctx(): AudioContext | null { return this.context; }
  get out(): AudioNode | null { return this.master; }
  /** Per-channel buses (player volume settings); fall back to the master before unlock. */
  get morseOut(): AudioNode | null { return this.morseBus ?? this.master; }
  get hydroOut(): AudioNode | null { return this.hydroBus ?? this.master; }

  /** Player volume settings. Safe to call before unlock: applied as soon as the context exists. */
  setMix(m: AudioMix): void { this.mix = m; this.applyMix(); }
  private applyMix(): void {
    if (this.master) this.master.gain.value = this.mix.sound ? 0.6 * this.mix.master : 0;
    if (this.morseBus) this.morseBus.gain.value = this.mix.morse;
    if (this.hydroBus) this.hydroBus.gain.value = this.mix.hydro;
  }
  /** True while sound cannot play yet: show the "press a key to enable sound" prompt. */
  get needsGesture(): boolean { return this.supported && (this.context === null || this.context.state !== "running"); }

  /** Must be called from a trusted user-gesture handler (keydown / click). Safe to call repeatedly. */
  unlock(): void {
    if (!this.supported) return;
    if (this.context === null) {
      try {
        this.context = new AudioContext({ latencyHint: "interactive" });
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.morseBus = this.context.createGain(); this.morseBus.connect(this.master);
        this.hydroBus = this.context.createGain(); this.hydroBus.connect(this.master);
        this.applyMix();
      } catch { this.context = null; this.onError("AUDIO_INIT_FAILED"); return; }
    }
    if (this.context.state !== "running") void this.context.resume().catch(() => { this.onError("AUDIO_RESUME_FAILED"); /* prompt stays visible */ });
  }

  get now(): number { return this.context?.currentTime ?? 0; }

  /** Looping white-noise buffer (cosmetic only: Math.random is fine here, it never touches the sim). */
  noiseSource(seconds = 2): AudioBufferSourceNode | null {
    const c = this.context;
    if (c === null) return null;
    const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }
}
