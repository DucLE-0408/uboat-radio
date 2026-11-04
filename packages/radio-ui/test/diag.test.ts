import { describe, expect, it } from "vitest";
import { Diag, isSafeCode } from "../src/diag";

describe("diagnostics", () => {
  it("computes frame percentiles over a bounded window", () => {
    const d = new Diag("abcd1234");
    for (let i = 1; i <= 400; i++) d.frame(i % 20 === 0 ? 50 : 16);
    const s = d.snapshot();
    expect(s.frames.n).toBe(300);
    expect(s.frames.p50).toBe(16);
    expect(s.frames.max).toBe(50);
    expect(s.sessionId).toBe("abcd1234");
  });

  it("ignores non-finite frame times", () => {
    const d = new Diag("x");
    d.frame(NaN); d.frame(-1);
    expect(d.snapshot().frames.n).toBe(0);
  });

  it("accepts only short error codes; free text (e.g. message or transcript content) is replaced", () => {
    const d = new Diag("x");
    d.err("save", "SAVE_WRITE_FAILED");
    d.err("asset", "ASSET_LOAD:machine");
    d.err("audio", "WLNG CSQC NUWP secret transcript");
    d.err("audio", "Error: quota exceeded at /home/user");
    const s = d.snapshot();
    expect(s.errors.save).toEqual(["SAVE_WRITE_FAILED"]);
    expect(s.errors.asset).toEqual(["ASSET_LOAD:machine"]);
    expect(s.errors.audio).toEqual(["INVALID_CODE"]);
    expect(JSON.stringify(s)).not.toMatch(/WLNG|transcript|quota|home/);
    expect(isSafeCode("ASSET_LOAD:machine")).toBe(true);
    expect(isSafeCode("lowercase")).toBe(false);
  });

  it("deduplicates and bounds the error list", () => {
    const d = new Diag("x");
    for (let i = 0; i < 200; i++) d.err("asset", `ASSET_MISSING:id${i}`);
    d.err("asset", "ASSET_MISSING:id0");
    expect(d.snapshot().errors.asset.length).toBe(50);
  });

  it("reports loop statistics", () => {
    const d = new Diag("x");
    d.loopStats({ clamped: 3, frameClamped: 1 }); d.tick(42);
    expect(d.snapshot()).toMatchObject({ catchUpClamped: 3, frameClamped: 1, tick: 42 });
  });
});
