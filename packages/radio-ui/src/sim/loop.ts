// Fixed-step accumulator. Vietnamese: sim luôn bước đúng 1 s; tốc độ vẽ/khung hình chỉ quyết định
// "bao nhiêu bước" chạy mỗi khung, không bao giờ đổi kết quả của từng bước (R7.1).

export interface LoopOptions {
  /** Wall-clock milliseconds that correspond to one sim step at speed 1. */
  readonly stepMs: number;
  /** Upper bound of catch-up steps per frame; the excess backlog is dropped (no spiral of death). */
  readonly maxStepsPerFrame: number;
  /** Largest single frame delta accepted (ms); protects against tab sleep / debugger pauses. */
  readonly maxFrameMs: number;
}

export const DEFAULT_LOOP: LoopOptions = { stepMs: 1000, maxStepsPerFrame: 5, maxFrameMs: 2000 };

export class FixedStepLoop {
  private acc = 0;
  private paused = false;
  private speedFactor = 1;
  private clampCount = 0;
  private frameClampCount = 0;

  constructor(private readonly opt: LoopOptions = DEFAULT_LOOP) {
    if (!(opt.stepMs > 0) || opt.maxStepsPerFrame < 1 || !(opt.maxFrameMs > 0)) throw new RangeError("bad loop options");
  }

  get isPaused(): boolean { return this.paused; }
  get speed(): number { return this.speedFactor; }
  /** Diagnostics: how often the catch-up cap dropped backlog, and how often one frame delta was clamped. */
  get stats(): { readonly clamped: number; readonly frameClamped: number } { return { clamped: this.clampCount, frameClamped: this.frameClampCount }; }

  setSpeed(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) throw new RangeError(`bad speed ${factor}`);
    this.speedFactor = factor;
  }

  pause(): void { this.paused = true; }

  /** Resuming discards the partial step so a pause never "banks" time. */
  resume(): void {
    this.paused = false;
    this.acc = 0;
  }

  /** Feed wall-clock elapsed time; returns how many 1 s sim steps the caller must run now. */
  advance(frameMs: number): number {
    if (this.paused || !Number.isFinite(frameMs) || frameMs <= 0) return 0;
    if (frameMs > this.opt.maxFrameMs) this.frameClampCount++;
    this.acc += Math.min(frameMs, this.opt.maxFrameMs) * this.speedFactor;
    const due = Math.floor(this.acc / this.opt.stepMs);
    const steps = Math.min(due, this.opt.maxStepsPerFrame);
    if (due > steps) this.clampCount++;
    this.acc -= due * this.opt.stepMs; // backlog beyond the cap is discarded, remainder (<1 step) is kept
    return steps;
  }
}
