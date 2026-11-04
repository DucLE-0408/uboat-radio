// Teletyper print pacing (R3.1). Pure. Vietnamese: máy in tin in dần bản chép `watch.copy(tokens)`; mỗi chữ hiện khi phần
// token của nó đã "vang" xong, theo tỉ lệ trên tổng thời lượng Morse của attempt đó.

/** Fraction (0..1] of the transmission after which each character of `copy` is printed. */
export function printMarks(tokens: string, copy: string): number[] {
  const n = tokens.length;
  if (n === 0 || copy.length === 0) return [];
  const at: number[] = [];
  let i = 0;
  const words = tokens.split("/");
  words.forEach((w, wi) => {
    let start = i;
    for (const letter of w.split("_")) {
      if (letter.length > 0) at.push((start + letter.length) / n);
      start += letter.length + 1;
    }
    i += w.length + 1;
    if (wi < words.length - 1) at.push(Math.min(1, i / n)); // the space between groups prints with the word gap
  });
  if (at.length !== copy.length) return [...copy].map((_, k) => (k + 1) / copy.length); // shapes disagree: print evenly
  return at;
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
  start(id: string, tokens: string, copy: string, nowMs: number, durSec: number): void {
    this.jobs.set(id, { marks: printMarks(tokens, copy), startMs: nowMs, durSec });
  }
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
