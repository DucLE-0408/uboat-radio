// Teletyper print pacing (R3.1). Pure. Vietnamese: máy in tin in dần bản chép `watch.copy(tokens)`; mỗi chữ hiện khi phần
// token của nó đã "vang" xong, theo tỉ lệ trên tổng thời lượng Morse của attempt đó.

/**
 * End time (seconds from the start) of every token character, from the same timing segments the audio plays
 * (`schedule()`): a dah lasts longer than a dit and word gaps longer than letter gaps. An element after another
 * element is preceded by its intra-letter gap segment.
 */
export function tokenEnds(tokens: string, segs: readonly { readonly ms: number }[]): number[] {
  const ends: number[] = [];
  let k = 0, t = 0, prevElement = false;
  for (const ch of tokens) {
    const element = ch === "." || ch === "-";
    const n = element && prevElement ? 2 : 1;
    for (let j = 0; j < n && k < segs.length; j++) t += (segs[k++] as { ms: number }).ms / 1000;
    ends.push(t);
    prevElement = element;
  }
  return ends;
}

/**
 * Fraction (0..1] of the transmission after which each character of `copy` is printed. `ends` (from tokenEnds) gives
 * real timing; without it the token position is used. A letter prints when its last element ends, the group space
 * when the word gap ends.
 */
export function printMarks(tokens: string, copy: string, ends?: readonly number[]): number[] {
  const n = tokens.length;
  if (n === 0 || copy.length === 0) return [];
  const timed = ends !== undefined && ends.length === n && (ends[n - 1] as number) > 0;
  const total = timed ? (ends[n - 1] as number) : n;
  const at = (idx: number): number => Math.min(1, (timed ? (ends[idx] as number) : idx + 1) / total); // idx = last token char
  const out: number[] = [];
  let i = 0;
  const words = tokens.split("/");
  words.forEach((w, wi) => {
    let start = i;
    for (const letter of w.split("_")) {
      if (letter.length > 0) out.push(at(start + letter.length - 1));
      start += letter.length + 1;
    }
    i += w.length + 1;
    if (wi < words.length - 1) out.push(at(i - 1)); // the space between groups prints with the word gap
  });
  if (out.length !== copy.length) return [...copy].map((_, k) => (k + 1) / copy.length); // shapes disagree: print evenly
  return out;
}

/** How many characters are printed after `elapsedSec` of a `durationSec` transmission. */
export function printedCount(marks: readonly number[], elapsedSec: number, durationSec: number): number {
  if (durationSec <= 0 || elapsedSec >= durationSec) return marks.length;
  if (elapsedSec <= 0) return 0;
  const f = elapsedSec / durationSec;
  let k = 0;
  while (k < marks.length && (marks[k] as number) <= f) k++;
  return k;
}

/** Print jobs keyed by sheet id. A sheet without a job is fully printed (restored sheets, silent rebuild R3.4). */
export class Printer {
  private readonly jobs = new Map<string, { readonly marks: number[]; readonly startMs: number; readonly durSec: number }>();
  private freeAtMs = 0;
  /**
   * Queues a print. Like the Morse player (Controller.frame starts the next transmission only when the previous one has
   * finished), the Teletyper is one device: a sheet starts when the one before it is done, so each sheet follows its
   * own transmission even when attempts arrive while another is still sounding. Works the same with audio off.
   */
  start(id: string, tokens: string, copy: string, nowMs: number, durSec: number, ends?: readonly number[]): void {
    const startMs = Math.max(nowMs, this.freeAtMs);
    this.freeAtMs = startMs + Math.max(0, durSec) * 1000;
    this.jobs.set(id, { marks: printMarks(tokens, copy, ends), startMs, durSec });
  }
  /** True while `id` waits for an earlier sheet to finish. */
  queued(id: string, nowMs: number): boolean { const j = this.jobs.get(id); return j !== undefined && nowMs < j.startMs; }
  /** Characters of `copy` visible now; finished jobs are dropped. */
  visible(id: string, copy: string, nowMs: number): number {
    const j = this.jobs.get(id);
    if (!j) return copy.length;
    const k = printedCount(j.marks, (nowMs - j.startMs) / 1000, j.durSec);
    if (k >= copy.length) { this.jobs.delete(id); return copy.length; }
    return k;
  }
  busy(): boolean { return this.jobs.size > 0; }
}
