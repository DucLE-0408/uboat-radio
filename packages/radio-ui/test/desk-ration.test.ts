import { describe, expect, it } from "vitest";
import { penalize, CITATION_PENALTY, awardSteps, COMPLETE_BONUS, copyMarks, MISSION_STEPS, parseRation, RATION_EMPTY, scoreCopy, STEP_BONUS, type MissionStep } from "../src/desk/ration";

const all = (v: boolean): Record<MissionStep, boolean> => Object.fromEntries(MISSION_STEPS.map((k) => [k, v])) as Record<MissionStep, boolean>;

describe("ration scoring", () => {
  it("+1 per matching key, -1 per mismatch, only against what is printed", () => {
    expect(copyMarks("ABCD EFGH", 9, "ABXD")).toBe("ggrg");
    expect(copyMarks("ABCD EFGH", 2, "ABCD")).toBe("ggrr"); // typed ahead of the printer
    const s = scoreCopy(RATION_EMPTY, "1:0", "ABCD EFGH", 9, "ABXD");
    expect(s.score).toBe(2);
  });
  it("scores each position once: backspace + retype does not farm", () => {
    let s = scoreCopy(RATION_EMPTY, "1:0", "ABCD", 4, "AB");
    expect(s.score).toBe(2);
    s = scoreCopy(s, "1:0", "ABCD", 4, "A");    // backspace: nothing happens
    s = scoreCopy(s, "1:0", "ABCD", 4, "AB");   // retype: already scored
    expect(s.score).toBe(2);
    s = scoreCopy(s, "1:0", "ABCD", 4, "ABCD");
    expect(s.score).toBe(4);
    expect(scoreCopy(s, "1:0", "ABCD", 4, "ABCD")).toBe(s); // unchanged => same object
  });
  it("may go negative and is capped; bounded number of keys", () => {
    expect(scoreCopy(RATION_EMPTY, "1:0", "AAAA", 4, "ZZZ").score).toBe(-3);
    let s = RATION_EMPTY;
    for (let i = 0; i < 250; i++) s = scoreCopy(s, `${i}:0`, "A", 1, "A");
    expect(Object.keys(s.scored).length).toBe(200);
  });
  it("pays each step once per message and the completion bonus once", () => {
    let s = awardSteps(RATION_EMPTY, 3, { ...all(false), decoded: true });
    expect(s.score).toBe(STEP_BONUS.decoded);
    expect(awardSteps(s, 3, { ...all(false), decoded: true })).toBe(s);
    s = awardSteps(s, 3, all(true));
    const total = MISSION_STEPS.reduce((n, k) => n + STEP_BONUS[k], 0) + COMPLETE_BONUS;
    expect(s.score).toBe(total);
    expect(awardSteps(s, 3, all(true))).toBe(s);
    expect(awardSteps(s, 4, { ...all(false), decoded: true }).score).toBe(total + STEP_BONUS.decoded);
  });
  it("validates stored data", () => {
    expect(parseRation(null)).toBe(RATION_EMPTY);
    expect(parseRation({ score: 1.5 })).toBe(RATION_EMPTY);
    const r = parseRation({ score: 7, scored: { "1:0": 5, "bad": 3, "2:0": 9999 }, bonus: { "1": 3, "x": 1, "2": 999 } });
    expect(r).toEqual({ score: 7, scored: { "1:0": 5 }, bonus: { "1": 3 } });
  });
});

describe("citation penalty", () => {
  it("costs rations per citation and may go negative", () => {
    expect(penalize(RATION_EMPTY, 0)).toBe(RATION_EMPTY);
    expect(penalize({ score: 25, scored: {}, bonus: {} }, 2).score).toBe(25 - 2 * CITATION_PENALTY);
    expect(penalize(RATION_EMPTY, 1).score).toBe(-CITATION_PENALTY);
  });
});
