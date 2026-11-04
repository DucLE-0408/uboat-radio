// Sanitised diagnostics (R11.3). Vietnamese: chỉ mã lỗi ngắn + số đo; TUYỆT ĐỐI không ghi nội dung tin, bản chép hay thông báo lỗi tự do.
// In-memory only, never sent anywhere, kept apart from the player-visible store.
export type DiagKind = "asset" | "audio" | "save" | "pwa";

export interface DiagSnapshot {
  readonly sessionId: string;
  readonly tick: number;
  readonly frames: { readonly n: number; readonly p50: number; readonly p95: number; readonly max: number };
  readonly catchUpClamped: number;
  readonly frameClamped: number;
  readonly errors: { readonly asset: readonly string[]; readonly audio: readonly string[]; readonly save: readonly string[]; readonly pwa: readonly string[] };
}

const CODE = /^[A-Z][A-Z0-9_]{1,30}(:[A-Za-z0-9_-]{1,24})?$/; // e.g. SAVE_WRITE_FAILED, ASSET_LOAD:machine
const WINDOW = 300;
const MAX_ERRORS = 50;

export function isSafeCode(c: string): boolean { return CODE.test(c); }

export class Diag {
  private readonly ring: number[] = [];
  private tickNow = 0;
  private clamped = 0;
  private frameClamped = 0;
  private readonly errs: Record<DiagKind, string[]> = { asset: [], audio: [], save: [], pwa: [] };

  constructor(readonly sessionId: string) {}

  frame(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.ring.push(ms);
    if (this.ring.length > WINDOW) this.ring.shift();
  }
  tick(t: number): void { this.tickNow = t; }
  loopStats(s: { clamped: number; frameClamped: number }): void { this.clamped = s.clamped; this.frameClamped = s.frameClamped; }

  /** Records a short code. Anything not matching the code grammar is replaced, so free text can never leak in. */
  err(kind: DiagKind, code: string): void {
    const c = isSafeCode(code) ? code : "INVALID_CODE";
    const list = this.errs[kind];
    if (list.length < MAX_ERRORS && !list.includes(c)) list.push(c);
  }

  snapshot(): DiagSnapshot {
    const a = [...this.ring].sort((x, y) => x - y);
    const q = (p: number): number => (a.length === 0 ? 0 : (a[Math.min(a.length - 1, Math.floor(p * a.length))] as number));
    return {
      sessionId: this.sessionId, tick: this.tickNow,
      frames: { n: a.length, p50: q(0.5), p95: q(0.95), max: a.length ? (a[a.length - 1] as number) : 0 },
      catchUpClamped: this.clamped, frameClamped: this.frameClamped,
      errors: { asset: [...this.errs.asset], audio: [...this.errs.audio], save: [...this.errs.save], pwa: [...this.errs.pwa] },
    };
  }
}

/** Optional overlay (?diag=1). Uses textContent only; returns a disposer. */
export function mountDiagOverlay(diag: Diag): () => void {
  const el = document.createElement("pre");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = "position:fixed;right:4px;top:4px;z-index:50;margin:0;padding:4px 6px;background:rgba(0,0,0,.75);color:#9f9;font:11px/1.3 monospace;pointer-events:none;max-width:40ch;white-space:pre-wrap";
  document.body.append(el);
  const draw = (): void => {
    const s = diag.snapshot();
    el.textContent = [`sid ${s.sessionId} tick ${s.tick}`, `frame ms p50 ${s.frames.p50.toFixed(1)} p95 ${s.frames.p95.toFixed(1)} max ${s.frames.max.toFixed(1)}`,
      `catch-up clamped ${s.catchUpClamped} frames clamped ${s.frameClamped}`, `asset ${s.errors.asset.join(",") || "-"}`, `audio ${s.errors.audio.join(",") || "-"}`, `save ${s.errors.save.join(",") || "-"}`, `pwa ${s.errors.pwa.join(",") || "-"}`].join("\n");
  };
  draw();
  const id = window.setInterval(draw, 500);
  return () => { window.clearInterval(id); el.remove(); };
}
