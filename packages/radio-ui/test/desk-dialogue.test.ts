import { describe, expect, it } from "vitest";
import { CREW, pickScene, scenesFor, TRIGGERS, triggersBetween, type Observed } from "../src/desk/dialogue";
import { MANUAL, NEWS, ordersPages, pickNews } from "../src/desk/docs";

describe("dialogue tables", () => {
  it("both languages have the same scenes, speakers and line shape for every trigger", () => {
    for (const tr of TRIGGERS) {
      const en = scenesFor("en", tr), vi = scenesFor("vi", tr);
      expect(en.length, tr).toBeGreaterThan(0);
      expect(vi.map((s) => [s.crew, s.lines.map((l) => l.who)]), tr).toEqual(en.map((s) => [s.crew, s.lines.map((l) => l.who)]));
      for (const s of [...en, ...vi]) { expect(CREW).toContain(s.crew); for (const l of s.lines) expect(l.text.trim().length).toBeGreaterThan(0); }
    }
  });
  it("picks deterministically from a cosmetic value, same index in both languages", () => {
    expect(pickScene("en", "start", 0).crew).toBe(pickScene("vi", "start", 0).crew);
    expect(pickScene("en", "start", 0.99)).toBe(scenesFor("en", "start").at(-1));
  });
  it("turns observed changes into triggers and never says whether a decision was right", () => {
    const a: Observed = { rxCount: 0, decisions: [], authResults: 0, authPasses: 0, locatedAt: null, depthChargeAt: null, emergency: null };
    expect(triggersBetween(a, { ...a, rxCount: 1 })).toEqual(["firstRx"]);
    expect(triggersBetween({ ...a, rxCount: 2 }, { ...a, rxCount: 3, decisions: ["reject"] })).toEqual(["rejected"]);
    expect(triggersBetween(a, { ...a, authResults: 1, authPasses: 0 })).toEqual(["authFail"]);
    expect(triggersBetween(a, { ...a, authResults: 1, authPasses: 1, locatedAt: 40, emergency: "asdic" })).toEqual(["authPass", "dfFix", "bridgeAlert"]);
    expect(triggersBetween(a, { ...a, depthChargeAt: 90, emergency: "depth_charge" })).toEqual(["depthCharge"]);
    expect(triggersBetween(a, a)).toEqual([]);
  });
});

describe("reference documents", () => {
  it("Orders and Manual have the same pages in both languages and list the public stations", () => {
    const st = [{ callsign: "HQ", wpm: 25 }, { callsign: "KDK", wpm: null }];
    const en = ordersPages("en", st, [0, 1, 2]), vi = ordersPages("vi", st, [0, 1, 2]);
    expect(vi.pages.length).toBe(en.pages.length);
    expect(en.pages.some((p) => p.body.includes("HQ") && p.body.includes("25 wpm") && p.body.includes("KDK"))).toBe(true);
    expect(MANUAL.vi.pages.length).toBe(MANUAL.en.pages.length);
    expect(NEWS.vi.length).toBe(NEWS.en.length);
  });
  it("news picks are distinct", () => {
    let k = 0;
    const rng = (): number => [0.9, 0.9, 0.9, 0.1][k++ % 4] as number;
    const n = pickNews(rng);
    expect(new Set(n).size).toBe(3);
  });
});
