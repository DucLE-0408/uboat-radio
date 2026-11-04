// Decorative decode animation clock. Vietnamese: chỉ là hiệu ứng; kết quả decode (verdict, tells) có ngay, không phụ thuộc hoạt ảnh.
const MAX_TOTAL_MS = 3000;
const PER_CHAR_MS = 28;

export class Reveal {
  private total = 0;
  private startMs = 0;
  private per = 0;
  private running = false;

  /** Begin revealing `letters` characters. `instant` (reduced motion) shows everything at once. */
  start(letters: number, nowMs: number, instant: boolean): void {
    this.total = Math.max(0, letters);
    this.startMs = nowMs;
    this.per = instant || letters === 0 ? 0 : Math.min(PER_CHAR_MS, MAX_TOTAL_MS / letters);
    this.running = this.per > 0;
  }

  /** Number of letters visible now (all of them when not animating). */
  shown(nowMs: number): number {
    if (!this.running) return this.total;
    const n = Math.floor((nowMs - this.startMs) / this.per) + 1;
    if (n >= this.total) { this.running = false; return this.total; }
    return Math.max(0, n);
  }

  isRunning(nowMs: number): boolean { if (this.running) this.shown(nowMs); return this.running; }
  /** Index of the letter whose lamp is lit right now, or -1. */
  lit(nowMs: number): number { return this.isRunning(nowMs) ? this.shown(nowMs) - 1 : -1; }
  setTotal(n: number): void { if (!this.running) this.total = n; }
}
