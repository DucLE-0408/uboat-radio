import { describe, expect, it } from "vitest";
import { defaultOptions } from "@uboat/sim-core";
import { ENDLESS_KEY, SCORES_KEY, loadEndlessOptions, loadScores, recordScore, saveEndlessOptions, scoreLabel } from "../src/menu/endless";

const mem = (): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } };
};

describe("Endless configuration storage", () => {
  it("defaults to all modules on at normal; remembers the last choice; ignores damaged data", () => {
    const st = mem();
    expect(loadEndlessOptions(st)).toEqual(defaultOptions("endless"));
    const o = { ...defaultOptions("endless"), difficulty: "hard" as const, modules: { ...defaultOptions().modules, timer: false, cables: false } };
    expect(saveEndlessOptions(st, o)).toBe(true);
    expect(loadEndlessOptions(st)).toEqual(o);
    st.map.set(ENDLESS_KEY, "{oops"); expect(loadEndlessOptions(st)).toEqual(defaultOptions("endless"));
    st.map.set(ENDLESS_KEY, JSON.stringify({ difficulty: "x", modules: {} })); expect(loadEndlessOptions(st)).toEqual(defaultOptions("endless"));
    st.map.set(ENDLESS_KEY, JSON.stringify({ ...o, mode: "night" })); expect(loadEndlessOptions(st).mode).toBe("endless"); // the mode is not the player's to change here
    expect(saveEndlessOptions(null, o)).toBe(false);
  });
  it("difficulty never switches a module (they are independent)", () => {
    for (const d of ["easy", "normal", "hard"] as const) expect(loadEndlessOptions(mem()).modules).toEqual(defaultOptions("endless").modules);
    expect(scoreLabel(defaultOptions("endless"))).toBe("normal:1111111111");
    expect(scoreLabel({ ...defaultOptions("endless"), difficulty: "easy", modules: { ...defaultOptions().modules, timer: false } })).toBe("easy:0111111111");
  });
});

describe("Endless high scores", () => {
  it("keep the best of each field per (difficulty, module set) and validate what is read back", () => {
    const st = mem(), o = defaultOptions("endless"), easy = { ...o, difficulty: "easy" as const };
    expect(recordScore(st, o, { correct: 5, streak: 3, ration: 40, survivedSec: 900 })).toEqual({ previous: null, saved: true });
    const r = recordScore(st, o, { correct: 4, streak: 6, ration: 10, survivedSec: 1200 });
    expect(r.previous).toEqual({ correct: 5, streak: 3, ration: 40, survivedSec: 900 });
    expect(loadScores(st)[scoreLabel(o)]).toEqual({ correct: 5, streak: 6, ration: 40, survivedSec: 1200 });
    recordScore(st, easy, { correct: 1, streak: 1, ration: 1, survivedSec: 1 });
    expect(Object.keys(loadScores(st)).sort()).toEqual([scoreLabel(easy), scoreLabel(o)].sort());
    st.map.set(SCORES_KEY, JSON.stringify({ "normal:1111111111": { correct: -1, streak: 1, ration: 1, survivedSec: 1 }, "bad": { correct: 1, streak: 1, ration: 1, survivedSec: 1 }, "hard:000000": { correct: 2, streak: 2, ration: 2, survivedSec: 2 } }));
    expect(loadScores(st)).toEqual({ "hard:000000": { correct: 2, streak: 2, ration: 2, survivedSec: 2 } });
    expect(recordScore(null, o, { correct: 1, streak: 1, ration: 1, survivedSec: 1 }).saved).toBe(false);
  });
});
