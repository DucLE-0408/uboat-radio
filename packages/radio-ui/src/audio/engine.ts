// One shared AudioContext, created only after a user gesture (R1.4). Vietnamese: autoplay policy => không tạo/phát trước thao tác đầu.
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;

  /** False when the browser has no Web Audio at all (UI falls back to visual Morse, design s9). */
  get supported(): boolean { return typeof AudioContext !== "undefined"; }
  get ctx(): AudioContext | null { return this.context; }
  get out(): AudioNode | null { return this.master; }
  /** True while sound cannot play yet: show the "press a key to enable sound" prompt. */
  get needsGesture(): boolean { return this.supported && (this.context === null || this.context.state !== "running"); }

  /** Must be called from a trusted user-gesture handler (keydown / click). Safe to call repeatedly. */
  unlock(): void {
    if (!this.supported) return;
    if (this.context === null) {
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.context.destination);
    }
    if (this.context.state !== "running") void this.context.resume().catch(() => { /* still blocked; prompt stays visible */ });
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
