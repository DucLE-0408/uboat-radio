import { describe, expect, it } from "vitest";
import { computeScale } from "../src/scene/px";

describe("computeScale", () => {
  it("is an integer >= 1 that fits both axes", () => {
    expect(computeScale(1280, 720)).toBe(2);
    expect(computeScale(1920, 1080)).toBe(3);
    expect(computeScale(2560, 1440)).toBe(4);
    expect(computeScale(1440, 800)).toBe(2);   // height-limited
    expect(computeScale(640, 360)).toBe(1);
    expect(computeScale(320, 480)).toBe(1);   // never below 1 (small screens use the stacked layout in stage 5)
  });
  it("never produces a fractional scale", () => {
    for (let w = 300; w <= 2600; w += 37) for (const h of [500, 720, 900, 1080]) expect(Number.isInteger(computeScale(w, h))).toBe(true);
  });
});
