import { describe, expect, it } from "vitest";
import { BALANCE, type SimEvent } from "@uboat/sim-core";
import { layerAdvice, SAMPLE_MAX, tempColor } from "../src/desk/water";
import { Store } from "../src/store";

const light = (hex: string): number => { const n = parseInt(hex.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };

describe("temperature scale", () => {
  it("runs cold blue to warm amber, clamps outside the range, and gets lighter as it warms (not colour alone)", () => {
    const c = BALANCE.water.coldC, w = BALANCE.water.warmC;
    expect(tempColor(c)).toBe("#3b6fd8"); expect(tempColor(w)).toBe("#f5c15a"); expect(tempColor(c - 20)).toBe(tempColor(c)); expect(tempColor(w + 20)).toBe(tempColor(w));
    let prev = -1; for (let t = c; t <= w; t += 1) { const l = light(tempColor(t)); expect(l).toBeGreaterThanOrEqual(prev - 1); prev = l; }
    expect(light(tempColor(w))).toBeGreaterThan(light(tempColor(c)) + 40);
  });
});

describe("layer advice", () => {
  it("says below or above the last measured layer, and nothing without a recent reading", () => {
    const s = { tSec: 100, layerM: 60 };
    expect(layerAdvice(80, s, 200)).toBe("below"); expect(layerAdvice(40, s, 200)).toBe("above"); expect(layerAdvice(60, s, 200)).toBe("above");
    expect(layerAdvice(80, s, 100 + 601)).toBeNull(); expect(layerAdvice(80, null, 200)).toBeNull();
  });
});

describe("water samples in the store", () => {
  it("keeps the latest readings, bounded", () => {
    const st = new Store();
    for (let i = 0; i < SAMPLE_MAX + 20; i++) st.apply({ type: "WATER_SAMPLE", tSec: i * 60, tempC: 12, layerM: 55, xKm: i, yKm: 0 } as SimEvent);
    expect(st.state.waterSamples).toHaveLength(SAMPLE_MAX);
    expect(st.state.waterSamples[SAMPLE_MAX - 1]!.xKm).toBe(SAMPLE_MAX + 19);
  });
});
