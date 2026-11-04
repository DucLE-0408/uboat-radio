import { describe, expect, it } from "vitest";
import { Reveal } from "../src/scene/reveal";

describe("Reveal (decorative decode clock)", () => {
  it("reveals letters progressively and lights one lamp at a time", () => {
    const r = new Reveal();
    r.start(100, 1000, false);
    expect(r.shown(1000)).toBe(1);
    expect(r.lit(1000)).toBe(0);
    expect(r.shown(1000 + 28 * 9)).toBe(10);
    expect(r.lit(1000 + 28 * 9)).toBe(9);
    expect(r.shown(1000 + 10_000)).toBe(100);
    expect(r.lit(1000 + 10_000)).toBe(-1);
  });
  it("never takes longer than about 3 s however long the text is", () => {
    const r = new Reveal();
    r.start(600, 0, false);
    expect(r.isRunning(2900)).toBe(true);
    expect(r.isRunning(3100)).toBe(false);
    expect(r.shown(3100)).toBe(600);
  });
  it("instant mode (reduced motion) shows everything and lights nothing", () => {
    const r = new Reveal();
    r.start(80, 0, true);
    expect(r.shown(0)).toBe(80);
    expect(r.lit(0)).toBe(-1);
  });
  it("empty text is a no-op", () => {
    const r = new Reveal();
    r.start(0, 0, false);
    expect(r.shown(5)).toBe(0);
    expect(r.isRunning(5)).toBe(false);
  });
});
