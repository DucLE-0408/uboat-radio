import { describe, expect, it } from "vitest";
import { COPY_KEY, CopyPersistence, MAX_ENTRIES, MAX_TEXT, clearCopies, loadCopies, parseCopies, serializeCopies, type Timers } from "../src/sim/transcripts";
import type { StorageLike } from "../src/sim/session";
import { Store } from "../src/store";
import type { SimEvent } from "@uboat/sim-core";

class Mem implements StorageLike {
  readonly m = new Map<string, string>(); writes = 0;
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  setItem(k: string, v: string): void { this.writes++; this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
}
const fist = { wpm: 18, dahRatio: 3, gapStretch: 1, jitter: 0.05 };
const rx = (rxId: number, attempt: number): SimEvent => ({ type: "MSG_RX", tSec: 60, rxId, attempt, from: "ABC", net: "HQ", sentAtMin: 1300, indicator: "ABCD", tokens: ".-", snrDb: 30, txFist: fist, dfBearingDeg: 0 });

describe("transcript persistence", () => {
  it("round-trips entries and ignores a file from another seed", () => {
    const raw = serializeCopies(42, [{ rxId: 1, attempt: 0, text: "WLNG CSQ" }, { rxId: 1, attempt: 1, text: "" }]);
    expect(parseCopies(raw, 42)).toEqual([{ rxId: 1, attempt: 0, text: "WLNG CSQ" }]);
    expect(parseCopies(raw, 43)).toBeNull();
  });

  it("rejects hostile or oversized data", () => {
    const bad = [
      "{", "null", '{"v":2,"seed":1,"entries":[]}', '{"v":1,"seed":1,"entries":[{"rxId":1,"attempt":0,"text":"<script>"}]}',
      '{"v":1,"seed":1,"entries":[{"rxId":1,"attempt":0,"text":"abc"}]}',
      `{"v":1,"seed":1,"entries":[{"rxId":1,"attempt":0,"text":"${"A".repeat(MAX_TEXT + 1)}"}]}`,
      '{"v":1,"seed":1,"entries":[{"rxId":-1,"attempt":0,"text":"A"}]}',
      '{"v":1,"seed":1,"entries":[{"rxId":1,"attempt":0,"text":"A"},{"rxId":1,"attempt":0,"text":"B"}]}',
      JSON.stringify({ v: 1, seed: 1, entries: Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => ({ rxId: i, attempt: 0, text: "A" })) }),
      "x".repeat(70_000),
    ];
    for (const raw of bad) expect(parseCopies(raw, 1), raw.slice(0, 40)).toBeNull();
  });

  it("store restores only copies of known messages/attempts", () => {
    const s = new Store();
    s.apply(rx(1, 0)); s.apply(rx(1, 1));
    s.importCopies([{ rxId: 1, attempt: 0, text: "AB" }, { rxId: 1, attempt: 1, text: "CD" }, { rxId: 9, attempt: 0, text: "ZZ" }, { rxId: 1, attempt: 7, text: "ZZ" }]);
    expect(s.exportCopies()).toEqual([{ rxId: 1, attempt: 0, text: "AB" }, { rxId: 1, attempt: 1, text: "CD" }]);
  });

  it("debounces writes, flushes on demand, removes the key when empty, reports one short code on failure", () => {
    const mem = new Mem();
    let pending: (() => void) | null = null;
    const timers: Timers = { set: (fn) => { pending = fn; return 1; }, clear: () => { pending = null; } };
    let entries = [{ rxId: 1, attempt: 0, text: "AB" }];
    const errs: string[] = [];
    const p = new CopyPersistence(mem, 7, () => entries, (c) => errs.push(c), timers);
    p.schedule(); p.schedule(); p.schedule();
    expect(mem.writes).toBe(0);
    pending!();
    expect(mem.writes).toBe(1);
    expect(loadCopies(mem, 7)).toEqual(entries);
    entries = [{ rxId: 1, attempt: 0, text: "" }];
    p.schedule(); p.flush();
    expect(mem.getItem(COPY_KEY)).toBeNull();
    const broken: StorageLike = { getItem: () => null, setItem: () => { throw new Error("quota with transcript AB"); }, removeItem: () => { throw new Error("x"); } };
    entries = [{ rxId: 1, attempt: 0, text: "AB" }];
    const p2 = new CopyPersistence(broken, 7, () => entries, (c) => errs.push(c), timers);
    p2.flush(); p2.flush();
    expect(errs).toEqual(["COPY_WRITE_FAILED"]);
    expect(JSON.stringify(errs)).not.toContain("AB");
    clearCopies(mem);
  });
});
