import { describe, expect, it } from "vitest";
import { FixedStepLoop } from "../src/sim/loop";

describe("FixedStepLoop", () => {
  it("emits exactly one step per 1000 ms regardless of frame rate", () => {
    for (const frameMs of [4, 16, 33, 100, 250]) {
      const loop = new FixedStepLoop();
      let steps = 0;
      const frames = Math.round(60_000 / frameMs);
      for (let i = 0; i < frames; i++) steps += loop.advance(frameMs);
      expect(Math.abs(steps - (frames * frameMs) / 1000)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the fractional remainder between frames", () => {
    const loop = new FixedStepLoop();
    expect(loop.advance(600)).toBe(0);
    expect(loop.advance(600)).toBe(1);
    expect(loop.advance(800)).toBe(1);
  });

  it("caps catch-up per frame and drops the backlog", () => {
    const loop = new FixedStepLoop({ stepMs: 1000, maxStepsPerFrame: 3, maxFrameMs: 60_000 });
    expect(loop.advance(20_000)).toBe(3);
    expect(loop.advance(10)).toBe(0); // nothing banked beyond the cap
  });

  it("clamps one huge frame (sleeping tab)", () => {
    const loop = new FixedStepLoop();
    expect(loop.advance(3_600_000)).toBe(2); // maxFrameMs = 2000
  });

  it("pause emits nothing and resume does not bank time", () => {
    const loop = new FixedStepLoop();
    loop.advance(900);
    loop.pause();
    expect(loop.advance(5000)).toBe(0);
    loop.resume();
    expect(loop.advance(200)).toBe(0);
  });

  it("speed factor multiplies steps but each step stays 1 s of sim time", () => {
    const loop = new FixedStepLoop();
    loop.setSpeed(4);
    expect(loop.advance(1000)).toBe(4);
    expect(() => loop.setSpeed(0)).toThrow();
  });

  it("ignores non-finite or non-positive deltas", () => {
    const loop = new FixedStepLoop();
    expect(loop.advance(NaN)).toBe(0);
    expect(loop.advance(-5)).toBe(0);
  });
});
