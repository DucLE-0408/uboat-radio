import { describe, expect, it } from "vitest";
import { PaperModel } from "../src/desk/papers";
import { canTrash, checkHandOver } from "../src/desk/rules";
import { EchoPress } from "../src/desk/echo";

const bundle = (stamp: boolean, sign: boolean, output = true) => {
  const m = new PaperModel();
  const i = m.ensure("input", 4, 0); m.flip(i.id);
  if (sign) m.sign(i.id);
  const sheets = [i];
  if (output) { const o = m.ensure("output", 4, 0); m.flip(o.id); if (stamp) m.stamp(o.id, "red"); sheets.push(o); }
  return { m, sheets };
};

describe("G1 stamping rules and hand-over", () => {
  it("needs one message with the Echo stamp", () => {
    const { sheets } = bundle(true, true);
    expect(checkHandOver(sheets, () => false)).toEqual({ ok: false, reason: "noEcho" });
    expect(checkHandOver(sheets, () => true)).toEqual({ ok: true, rxId: 4, problems: [] });
    const m = new PaperModel();
    expect(checkHandOver([m.ensure("output", 4, 0)], () => true)).toEqual({ ok: false, reason: "noInput" });
    expect(checkHandOver([m.ensure("input", 4, 0), m.ensure("input", 5, 0)], () => true)).toEqual({ ok: false, reason: "mixed" });
    expect(checkHandOver([m.ensure("mission")], () => true)).toEqual({ ok: false, reason: "mission" });
  });
  it("lists rule breaks without blocking", () => {
    expect(checkHandOver(bundle(false, false).sheets, () => true)).toEqual({ ok: true, rxId: 4, problems: ["outputUnstamped", "inputUnsigned"] });
    expect(checkHandOver(bundle(true, true, false).sheets, () => true)).toEqual({ ok: true, rxId: 4, problems: ["noOutput"] });
    const { m, sheets } = bundle(true, true);
    m.stamp((sheets[1] as { id: string }).id, "blue"); m.stamp((sheets[0] as { id: string }).id, "red");
    expect(checkHandOver(sheets, () => true)).toMatchObject({ ok: true, problems: ["outputWrongInk", "outputTwoStamps", "inputStamped"] });
  });
  it("checks every sheet on its own", () => {
    const m = new PaperModel();
    const i = m.ensure("input", 4, 0), i2 = m.ensure("input", 4, 1), o1 = m.ensure("output", 4, 0), o2 = m.ensure("output", 4, 1);
    for (const p of [i, i2, o1, o2]) m.flip(p.id);
    m.sign(i.id); m.stamp(o1.id, "red");
    expect(checkHandOver([i, i2, o1, o2], () => true)).toMatchObject({ ok: true, problems: ["outputUnstamped", "inputUnsigned"] });
  });
  it("never lets mission papers into the bin", () => {
    for (const k of ["input", "output", "mission"] as const) expect(canTrash(k)).toBe(false);
  });
});

describe("Echo stamper press", () => {
  it("sends resolve exactly once per message, even on repeated presses", () => {
    const e = new EchoPress();
    const sent: string[] = [];
    let decided = false;
    const send = (rx: number, d: string): boolean => { sent.push(`${rx}:${d}`); decided = true; return true; };
    expect(e.press(1, "accept", () => decided, send)).toBe("sent");
    expect(e.press(1, "reject", () => decided, send)).toBe("already");
    expect(e.press(1, "accept", () => false, send)).toBe("busy"); // even if the store has not caught up yet
    expect(sent).toEqual(["1:accept"]);
  });
  it("a refused resolve leaves no mark and can be pressed again", () => {
    const e = new EchoPress();
    let calls = 0;
    expect(e.press(2, "reject", () => false, () => { calls++; return false; })).toBe("refused");
    expect(e.press(2, "reject", () => false, () => { calls++; return true; })).toBe("sent");
    expect(calls).toBe(2);
  });
});
