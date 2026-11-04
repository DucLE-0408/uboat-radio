import { describe, expect, it } from "vitest";
import { encode, copyFromTokens } from "@uboat/sim-core";
import { printMarks, printedCount, Printer } from "../src/desk/printer";

describe("teletyper print pacing", () => {
  it("has one mark per printed character, rising, ending at the transmission end", () => {
    const tokens = encode("ABCD EFGH K"), copy = copyFromTokens(tokens);
    const m = printMarks(tokens, copy);
    expect(m).toHaveLength(copy.length);
    for (let i = 1; i < m.length; i++) expect(m[i] as number).toBeGreaterThanOrEqual(m[i - 1] as number);
    expect(m.at(-1)).toBe(1);
    expect(m[0] as number).toBeGreaterThan(0);
  });
  it("keeps noise marks (?) and falls back to even pacing when shapes disagree", () => {
    const tokens = "._-_xx/..", copy = copyFromTokens(tokens);
    expect(copy).toContain("?");
    expect(printMarks(tokens, copy)).toHaveLength(copy.length);
    expect(printMarks("._-", "ABCDE")).toEqual([0.2, 0.4, 0.6, 0.8, 1]);
    expect(printMarks("", "")).toEqual([]);
  });
  it("prints nothing at the start and everything at the end", () => {
    const m = [0.25, 0.5, 1];
    expect(printedCount(m, 0, 10)).toBe(0);
    expect(printedCount(m, 5, 10)).toBe(2);
    expect(printedCount(m, 10, 10)).toBe(3);
    expect(printedCount(m, 3, 0)).toBe(3);
  });
  it("sheets without a job are fully printed; jobs finish and are dropped", () => {
    const p = new Printer();
    expect(p.visible("in:1:1", "ABCD", 0)).toBe(4);
    const tokens = encode("ABCD"), copy = copyFromTokens(tokens);
    p.start("in:1:2", tokens, copy, 1000, 4);
    expect(p.visible("in:1:2", copy, 1000)).toBe(0);
    expect(p.busy()).toBe(true);
    expect(p.visible("in:1:2", copy, 6000)).toBe(4);
    expect(p.busy()).toBe(false);
  });
});

describe("print timing follows the Morse schedule", () => {
  it("token end times add up to the audio plan and weight dahs and gaps", async () => {
    const { schedule } = await import("@uboat/sim-core");
    const { cosmeticRng, planMorse } = await import("../src/audio/morse");
    const { tokenEnds } = await import("../src/desk/printer");
    const fist = { wpm: 20, dahRatio: 3, gapStretch: 1, jitter: 0.1 };
    const tokens = encode("TE EM K");
    const ends = tokenEnds(tokens, schedule(tokens, fist, cosmeticRng(5, 1, 0)));
    expect(ends).toHaveLength(tokens.length);
    expect(ends.at(-1) as number).toBeCloseTo(planMorse(tokens, fist, "KDK", 30, 5, 1, 0).endSec, 9);
    // "T" is one dah, "E" one dit: with real timing T prints later in its share than its token count suggests
    const copy = copyFromTokens(tokens);
    const timed = printMarks(tokens, copy, ends), flat = printMarks(tokens, copy);
    expect(timed).toHaveLength(copy.length);
    expect(timed.at(-1)).toBe(1);
    expect(timed).not.toEqual(flat);
    for (let i = 1; i < timed.length; i++) expect(timed[i] as number).toBeGreaterThanOrEqual(timed[i - 1] as number);
  });
});
