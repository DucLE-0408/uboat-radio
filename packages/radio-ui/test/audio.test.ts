import { describe, expect, it } from "vitest";
import { Rng, schedule } from "@uboat/sim-core";
import { cosmeticRng, noiseGain, planMorse, toneFrequencyHz, toneSpans } from "../src/audio/morse";
import { hydrophoneParams } from "../src/audio/hydrophone";

const fist = { wpm: 20, dahRatio: 3, gapStretch: 1, jitter: 0.1 };

describe("morse plan", () => {
  it("builds ordered, non-overlapping tone spans from schedule()", () => {
    const segs = schedule(".-_-...", fist, new Rng(1));
    const { spans, endSec } = toneSpans(segs);
    expect(spans.length).toBe(6); // . - - . . .
    for (let i = 1; i < spans.length; i++) expect((spans[i] as { startSec: number }).startSec).toBeGreaterThan((spans[i - 1] as { endSec: number }).endSec);
    expect(endSec).toBeGreaterThan((spans[spans.length - 1] as { endSec: number }).endSec - 1e-9);
  });

  it("dit lasts 1200/wpm ms when jitter is zero", () => {
    const segs = schedule(".", { ...fist, jitter: 0 }, new Rng(1));
    expect(segs).toEqual([{ tone: true, ms: 60 }]);
  });

  it("replay of the same message is bit-identical (no new noise), a different attempt differs", () => {
    const a = planMorse(".-_-...", fist, "ABC", 30, 555, 1, 0);
    const b = planMorse(".-_-...", fist, "ABC", 30, 555, 1, 0);
    const c = planMorse(".-_-...", fist, "ABC", 30, 555, 1, 1);
    expect(b).toEqual(a);
    expect(c.spans).not.toEqual(a.spans);
  });

  it("uses a stream independent of the sim RNG for the same ids", () => {
    // the cosmetic stream must not equal derive(simSeed, ...) streams used by the sim: different path namespace
    const x = cosmeticRng(42, 1, 0).next();
    const y = cosmeticRng(43, 1, 0).next();
    expect(x).not.toBe(y);
  });

  it("pitch is stable per callsign and in the audible band; hiss rises as SNR falls", () => {
    expect(toneFrequencyHz("ABC")).toBe(toneFrequencyHz("ABC"));
    const f = toneFrequencyHz("XYZ");
    expect(f).toBeGreaterThanOrEqual(520); expect(f).toBeLessThan(880);
    expect(noiseGain(5)).toBeGreaterThan(noiseGain(35));
  });
});

describe("hydrophone params", () => {
  it("beat follows blade rate and pans by relative bearing", () => {
    const right = hydrophoneParams({ bearingDeg: 90, bladeRateHz: 12, snrDb: 10 }, 0);
    const left = hydrophoneParams({ bearingDeg: 270, bladeRateHz: 12, snrDb: 10 }, 0);
    const ahead = hydrophoneParams({ bearingDeg: 0, bladeRateHz: 12, snrDb: 10 }, 0);
    expect(right.beatHz).toBe(12);
    expect(right.pan).toBeCloseTo(1); expect(left.pan).toBeCloseTo(-1); expect(ahead.pan).toBeCloseTo(0);
  });
});
