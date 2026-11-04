import { describe, expect, it } from "vitest";
import { boatPose, portraitPose, PORTRAIT_FRAMES } from "../src/scene/pose";
import { makeDecor } from "../src/scene/decor";
import { layoutMode } from "../src/scene/px";

describe("boatPose", () => {
  it("sinks deeper with the mode", () => {
    const d = (m: "surface" | "periscope" | "dive"): number => boatPose(m, 0, 100, false).dy;
    expect(d("surface")).toBe(0);
    expect(d("periscope")).toBeGreaterThan(d("surface"));
    expect(d("dive")).toBeGreaterThan(d("periscope"));
  });
  it("spins the screw faster with speed and stops it at rest", () => {
    expect(boatPose("surface", 0, 100, false).propMs).toBeNull();
    const slow = boatPose("surface", 2, 100, false).propMs as number, fast = boatPose("surface", 15, 100, false).propMs as number;
    expect(fast).toBeLessThan(slow);
    expect(fast).toBeGreaterThanOrEqual(120);
  });
  it("hull damage levels", () => {
    expect([100, 90, 70, 40, 10, 0].map((h) => boatPose("surface", 0, h, false).crack)).toEqual([-1, -1, 0, 1, 2, 2]);
  });
  it("carries the alarm flag", () => { expect(boatPose("dive", 3, 50, true).alarm).toBe(true); });
});

describe("portraitPose priority", () => {
  const base = { emergency: false, hurtRecent: false, typingRecent: false, listening: false, blinking: false };
  it("is idle by default and blinks on demand", () => {
    expect(portraitPose(base)).toBe("idle");
    expect(portraitPose({ ...base, blinking: true })).toBe("blink");
  });
  it("orders hurt > alert > writing > listening > blink", () => {
    expect(portraitPose({ ...base, listening: true, blinking: true })).toBe("listening");
    expect(portraitPose({ ...base, listening: true, typingRecent: true })).toBe("writing");
    expect(portraitPose({ ...base, typingRecent: true, emergency: true })).toBe("alert");
    expect(portraitPose({ ...base, emergency: true, hurtRecent: true })).toBe("hurt");
  });
  it("has six distinct frames", () => { expect(new Set(Object.values(PORTRAIT_FRAMES)).size).toBe(6); });
});

describe("decor randomness", () => {
  it("is deterministic per cosmetic seed and within range", () => {
    const a = makeDecor(5), b = makeDecor(5), c = makeDecor(6);
    const sa = [a.nextBlinkMs(), a.nextFlickerMs(), a.bobPhaseS()], sb = [b.nextBlinkMs(), b.nextFlickerMs(), b.bobPhaseS()];
    expect(sa).toEqual(sb);
    expect([c.nextBlinkMs(), c.nextFlickerMs(), c.bobPhaseS()]).not.toEqual(sa);
    const d = makeDecor(9);
    for (let i = 0; i < 200; i++) { const x = d.nextBlinkMs(), y = d.nextFlickerMs(); expect(x).toBeGreaterThanOrEqual(3000); expect(x).toBeLessThan(7000); expect(y).toBeGreaterThanOrEqual(400); expect(y).toBeLessThan(1600); }
  });
});

describe("layoutMode", () => {
  it("maps the spec viewports", () => {
    expect(layoutMode(320, 640)).toBe("mobile");
    expect(layoutMode(480, 900)).toBe("mobile");
    expect(layoutMode(767, 1000)).toBe("mobile");
    expect(layoutMode(768, 1024)).toBe("tablet");
    expect(layoutMode(1024, 768)).toBe("tablet");
    expect(layoutMode(1279, 800)).toBe("tablet");
    expect(layoutMode(1280, 720)).toBe("desktop");
    expect(layoutMode(1920, 1080)).toBe("desktop");
  });
  it("a wide but very short window falls back to tablet (scale would be 1)", () => { expect(layoutMode(1400, 500)).toBe("tablet"); });
});
