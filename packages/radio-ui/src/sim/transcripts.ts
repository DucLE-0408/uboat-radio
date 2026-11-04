// Unfinished transcription, persisted SEPARATELY from the save game (R3.3). Vietnamese: không bao giờ vào log/diag; validate chặt khi tải.
import type { StorageLike } from "./session";

export const COPY_KEY = "uboat-radio.copy.v1";
export const MAX_ENTRIES = 64;
export const MAX_TEXT = 400;
const MAX_BYTES = 64 * 1024;
const TEXT = /^[A-Z0-9? ]*$/;

export interface CopyEntry { readonly rxId: number; readonly attempt: number; readonly text: string }
export interface CopyFile { readonly v: 1; readonly seed: number; readonly entries: readonly CopyEntry[] }

const isIdx = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 1000;

/** Returns the entries only when the file is valid AND belongs to this seed. */
export function parseCopies(raw: string | null, seed: number): CopyEntry[] | null {
  if (raw === null || raw.length > MAX_BYTES) return null;
  let j: unknown;
  try { j = JSON.parse(raw); } catch { return null; }
  if (typeof j !== "object" || j === null) return null;
  const o = j as Record<string, unknown>;
  if (o["v"] !== 1 || o["seed"] !== seed || !Array.isArray(o["entries"]) || o["entries"].length > MAX_ENTRIES) return null;
  const out: CopyEntry[] = [];
  const seen = new Set<string>();
  for (const e of o["entries"] as unknown[]) {
    if (typeof e !== "object" || e === null) return null;
    const r = e as Record<string, unknown>;
    const text = r["text"];
    if (!isIdx(r["rxId"]) || !isIdx(r["attempt"]) || typeof text !== "string" || text.length > MAX_TEXT || !TEXT.test(text)) return null;
    const k = `${r["rxId"]}:${r["attempt"]}`;
    if (seen.has(k)) return null;
    seen.add(k);
    out.push({ rxId: r["rxId"], attempt: r["attempt"], text });
  }
  return out;
}

export function serializeCopies(seed: number, entries: readonly CopyEntry[]): string {
  const clean = entries.filter((e) => e.text.length > 0).slice(0, MAX_ENTRIES).map((e) => ({ rxId: e.rxId, attempt: e.attempt, text: e.text.slice(0, MAX_TEXT) }));
  return JSON.stringify({ v: 1, seed, entries: clean } satisfies CopyFile);
}

export function loadCopies(storage: StorageLike | null, seed: number): CopyEntry[] {
  try { return parseCopies(storage?.getItem(COPY_KEY) ?? null, seed) ?? []; } catch { return []; }
}

export function clearCopies(storage: StorageLike | null): void {
  try { storage?.removeItem(COPY_KEY); } catch { /* nothing to clear */ }
}

export interface Timers { set(fn: () => void, ms: number): unknown; clear(h: unknown): void }
const REAL: Timers = { set: (fn, ms) => globalThis.setTimeout(fn, ms), clear: (h) => globalThis.clearTimeout(h as number) };

/** Debounced writer. `flush()` is called on pagehide. Reports a single short code on failure. */
export class CopyPersistence {
  private handle: unknown = null;
  private failed = false;
  constructor(
    private readonly storage: StorageLike | null, private readonly seed: number,
    private readonly read: () => readonly CopyEntry[], private readonly onError: (code: string) => void,
    private readonly timers: Timers = REAL, private readonly delayMs = 500,
  ) {}

  schedule(): void {
    if (this.handle !== null) return;
    this.handle = this.timers.set(() => { this.handle = null; this.write(); }, this.delayMs);
  }

  flush(): void {
    if (this.handle !== null) { this.timers.clear(this.handle); this.handle = null; }
    this.write();
  }

  private write(): void {
    if (this.storage === null) return;
    try {
      const entries = this.read();
      if (entries.every((e) => e.text.length === 0)) this.storage.removeItem(COPY_KEY);
      else this.storage.setItem(COPY_KEY, serializeCopies(this.seed, entries));
    } catch {
      if (!this.failed) { this.failed = true; this.onError("COPY_WRITE_FAILED"); }
    }
  }
}
