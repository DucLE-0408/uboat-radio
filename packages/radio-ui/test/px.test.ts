import { describe, expect, it } from "vitest";
import { computeScale, layoutMode } from "../src/scene/px";

describe("computeScale", () => {
  it("fits the whole scene in both axes and rounds down to 0.01", () => {
    expect(computeScale(1280, 720)).toBe(2);
    expect(computeScale(1920, 1080)).toBe(3);   // 1080p fullscreen fills 100%
    expect(computeScale(2560, 1440)).toBe(4);
    expect(computeScale(3840, 2160)).toBe(6);
    expect(computeScale(1920, 960)).toBe(2.66);  // maximised window: was 2 (50% of the area)
    expect(computeScale(1600, 900)).toBe(2.5);   // was 2 (64%)
    expect(computeScale(1366, 768)).toBe(2.13);  // was 2
    expect(computeScale(1440, 800)).toBe(2.22);  // height-limited
    expect(computeScale(640, 360)).toBe(1);
    expect(computeScale(320, 480)).toBe(1);      // never below 1 (small screens use the stacked layout)
  });
  it("never overflows and always uses at least 99% of the limiting axis", () => {
    for (let w = 1280; w <= 3840; w += 37) for (const h of [720, 800, 900, 960, 1080, 1200, 1440, 2160]) {
      const s = computeScale(w, h);
      expect(s * 640, `${w}x${h}`).toBeLessThanOrEqual(w);
      expect(s * 360, `${w}x${h}`).toBeLessThanOrEqual(h);
      const limit = Math.min(w / 640, h / 360);
      expect(s, `${w}x${h}`).toBeGreaterThanOrEqual(limit * 0.99 - 0.01);
    }
  });
  it("keeps the desktop layout at >= 1280x720 and the old thresholds", () => {
    expect(layoutMode(1280, 720)).toBe("desktop");
    expect(layoutMode(1920, 960)).toBe("desktop");
    expect(layoutMode(1280, 700)).toBe("tablet");
    expect(layoutMode(1100, 900)).toBe("tablet");
    expect(layoutMode(500, 900)).toBe("mobile");
  });
});

