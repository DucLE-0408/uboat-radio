import { describe, expect, it } from "vitest";
import { decipherCopy, derive, Enigma, dayEnigma } from "@uboat/sim-core";
import { DeskMachine, isPositions, replayCopy } from "../src/desk/machine";
import { parseExtra, PaperModel } from "../src/desk/papers";
import { ordersPages } from "../src/desk/docs";
import { defaultSettings, parseSettings } from "../src/menu/settings";
import { harness, runTo } from "./harness";

const L = (i: number): string => String.fromCharCode(65 + i);
const randWord = (r: ReturnType<typeof derive>, n: number): string => Array.from({ length: n }, () => L(r.int(26))).join("");

describe("desk machine = decipherCopy (property)", () => {
  it("matches decipherCopy for random positions and damaged copies", () => {
    const r = derive(2026, "desk-machine-prop");
    for (let t = 0; t < 300; t++) {
      const seed = r.int(1_000_000), start = randWord(r, 4);
      const groups = 1 + r.int(8);
      const words: string[] = [];
      for (let g = 0; g < groups; g++) {
        const roll = r.int(10);
        const n = roll < 7 ? 4 : roll < 8 ? 1 + r.int(3) : roll < 9 ? 5 + r.int(4) : 4;
        words.push(randWord(r, n).replace(/./g, (c) => (r.chance(0.04) ? "?" : c)));
      }
      if (r.chance(0.6)) words.push(L(r.int(26))); // check letter
      const copy = words.join(" ");
      const d = decipherCopy(seed, 1, start, copy);
      const v = replayCopy(seed, 1, start, copy, true);
      expect(v.plain).toBe(d.plain);
    }
  });
  it("a wrong setting gives a different plain text, silently", () => {
    const copy = "ABCD EFGH IJKL";
    expect(replayCopy(7, 1, "AAAA", copy).plain).not.toBe(replayCopy(7, 1, "AAAB", copy).plain);
  });
});

describe("rotor stepping seen through the machine", () => {
  it("steps per key and the Greek wheel never moves; double-step happens", () => {
    const base = dayEnigma(5, 1);
    const e = new Enigma({ ...base, positions: "BAAA" });
    const seen = new Set<string>();
    for (let i = 0; i < 700; i++) { e.press("A"); seen.add(e.getPositions()[0] as string); }
    expect([...seen]).toEqual(["B"]);
    // the replay window after n keys equals the Enigma position after n keys (inside one group)
    const v = replayCopy(5, 1, "BAAA", "WXY");
    const e2 = new Enigma({ ...base, positions: "BAAA" }); e2.process("WXY");
    expect(v.window).toBe(e2.getPositions());
  });
  it("double-steps the middle wheel (II notch E, III notch V) and never the Greek wheel", () => {
    const e = new Enigma({ reflector: "B", rotors: ["Beta", "I", "II", "III"], rings: "AAAA", positions: "AADV", plugboard: [] });
    e.press("A"); expect(e.getPositions()).toBe("AAEW"); // right at its notch carries the middle wheel
    e.press("A"); expect(e.getPositions()).toBe("ABFX"); // middle at its notch: steps itself and drags the left wheel
  });
  it("resyncs at every group start, after a short group and right after a Space", () => {
    const base = dayEnigma(9, 1);
    const ref = new Enigma({ ...base, positions: "CDEF" }); ref.process("AAAA");
    expect(replayCopy(9, 1, "CDEF", "AB ").window).toBe(ref.getPositions());
    expect(replayCopy(9, 1, "CDEF", "AB ").lamp).toBeNull();
    expect(replayCopy(9, 1, "CDEF", "AB CD").plain).toBe(decipherCopy(9, 1, "CDEF", "AB CD").plain);
    expect(replayCopy(9, 1, "CDEF", "").window).toBe("CDEF");
  });
});

describe("machine switches", () => {
  it("keys work only with power on and the cover shut; the cover opens only while off", () => {
    const m = new DeskMachine();
    expect(m.keysLive).toBe(false);
    expect(m.openCover()).toBe(true);
    expect(m.setPower(true)).toBe(false); // interlock
    expect(m.rotate(1, 1)).toBe(true);
    expect(m.positions).toBe("ABAA");
    m.closeCover();
    expect(m.rotate(1, 1)).toBe(false); // cover shut: wheels are out of reach
    expect(m.setPower(true)).toBe(true);
    expect(m.keysLive).toBe(true);
    expect(m.openCover()).toBe(false);
  });
  it("wraps the wheels, accepts typed letters, validates input and a stored bad state", () => {
    const m = new DeskMachine(); m.openCover();
    m.rotate(0, -1); expect(m.positions).toBe("ZAAA");
    m.rotate(3, 27); expect(m.positions).toBe("ZAAB");
    expect(m.setLetter(2, "Q")).toBe(true); expect(m.setLetter(2, "q")).toBe(false); expect(m.setLetter(4, "Q")).toBe(false);
    expect(isPositions("ABCD") && !isPositions("ABC") && !isPositions("abcd") && !isPositions(5)).toBe(true);
    const bad = new DeskMachine({ power: true, cover: true, pos: "nope" });
    expect(bad.power).toBe(false); expect(bad.positions).toBe("AAAA");
  });
});

describe("desk hooks in the controller", () => {
  it("a dead machine swallows typing and decode and calls denied; a live one types", () => {
    const h = harness(12); runTo(h, 70);
    let denied = 0;
    h.hooks.typingGate = () => false; h.hooks.denied = () => { denied++; };
    h.ctl.handle({ t: "char", ch: "A" }); h.ctl.handle({ t: "space" }); h.ctl.handle({ t: "backspace" }); h.ctl.handle({ t: "confirm" });
    expect(h.store.copyText(h.store.state.activeRx as number, h.store.state.activeAttempt)).toBe("");
    expect(denied).toBe(4);
    h.hooks.typingGate = () => true;
    h.ctl.handle({ t: "char", ch: "A" });
    expect(h.store.copyText(h.store.state.activeRx as number, h.store.state.activeAttempt)).toBe("A");
  });
  it("decode uses the rotor setting the player dialled; the day, indicator and seed pin the maths to Watch.decipher", () => {
    const h = harness(12); runTo(h, 70);
    const rx = h.store.activeView(); expect(rx).toBeDefined();
    const att = (rx as NonNullable<typeof rx>).attempts[0] as { attempt: number; indicator: string };
    for (const ch of "ABCD") h.ctl.handle({ t: "char", ch });
    h.hooks.decodeSetting = () => att.indicator;
    h.ctl.handle({ t: "confirm" });
    const right = h.store.activeView()?.analysis.get(h.store.state.activeAttempt)?.plain;
    expect(right).toBe(h.session.watch.decipher(att.indicator, "ABCD").plain);
    expect(right).toBe(replayCopy(12, 1, att.indicator, "ABCD", true).plain); // DAY = 1 in the desk equals the sim's day
    h.hooks.decodeSetting = () => "AAAA" === att.indicator ? "ZZZZ" : "AAAA";
    h.ctl.handle({ t: "confirm" });
    expect(h.store.activeView()?.analysis.get(h.store.state.activeAttempt)?.plain).not.toBe(right); // wrong setting: wrong text, no message
  });
});

describe("desk.v1 G2 fields, Obscura page, timer setting", () => {
  it("round-trips the machine and ration and rejects bad data", () => {
    const m = new PaperModel();
    const raw = m.serialize(5, { mach: { power: true, cover: false, pos: "QWER" }, ration: { score: 9, scored: { "1:0": 4 }, bonus: { "1": 3 } } });
    expect(parseExtra(raw, 5)).toEqual({ mach: { power: true, cover: false, pos: "QWER" }, ration: { score: 9, scored: { "1:0": 4 }, bonus: { "1": 3 } } });
    expect(parseExtra(raw, 6).mach.pos).toBe("AAAA");                      // another watch
    expect(parseExtra(raw.replace("QWER", "qwer"), 5).mach.pos).toBe("AAAA");
    expect(parseExtra(raw.replace('"power":true,"cover":false', '"power":true,"cover":true'), 5).mach.power).toBe(false); // interlock survives storage
    expect(parseExtra(m.serialize(5), 5).ration.score).toBe(0);            // a layout without the new fields still loads
    expect(parseExtra("{oops", 5).mach.pos).toBe("AAAA");
  });
  it("prints the day key only when given, in both languages", () => {
    const key = { reflector: "B", rotors: ["Beta", "II", "V", "I"], rings: "AKQD", plugboard: ["AB", "CD"] };
    for (const lang of ["en", "vi"] as const) {
      const without = ordersPages(lang, [], [0, 1, 2]), withKey = ordersPages(lang, [], [0, 1, 2], key);
      expect(withKey.pages.length).toBe(without.pages.length + 1);
      const page = withKey.pages.find((p) => p.title === "Obscura Setup");
      expect(page?.body).toContain("Beta II V I");
      expect(page?.body).toContain("A K Q D");
      expect(page?.body).toContain("AB CD");
      expect(JSON.stringify(without)).not.toContain("Beta II V I");
    }
  });
  it("timer setting defaults off and validates", () => {
    const d = defaultSettings(false);
    expect(d.timer).toBe(false);
    expect(parseSettings(JSON.stringify({ timer: true }), d).timer).toBe(true);
    expect(parseSettings(JSON.stringify({ timer: "yes" }), d).timer).toBe(false);
  });
});
