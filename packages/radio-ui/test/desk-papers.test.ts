import { describe, expect, it } from "vitest";
import { DESK_AREA, PaperModel, paperId, parseLayout, SIZE } from "../src/desk/papers";

describe("desk paper model", () => {
  it("creates one sheet per id, cascades new sheets and puts them on top", () => {
    const m = new PaperModel();
    const a = m.ensure("input", 1, 1), b = m.ensure("input", 1, 2);
    expect(m.ensure("input", 1, 1)).toBe(a);
    expect([b.x - a.x, b.y - a.y]).toEqual([8, 8]);
    expect(b.z).toBeGreaterThan(a.z);
    expect(m.list().map((p) => p.id)).toEqual(["in:1:1", "in:1:2"]);
    expect(paperId("output", 3, 2)).toBe("out:3:2");
  });
  it("never spawns a sheet exactly on top of another, also past the sixth one", () => {
    const m = new PaperModel();
    for (let k = 0; k < 20; k++) m.ensure("input", k, 0);
    const spots = m.list().map((p) => `${p.x},${p.y}`);
    expect(new Set(spots).size).toBe(spots.length);
  });
  it("raises, flips and keeps every sheet grabbable inside the desk", () => {
    const m = new PaperModel();
    const a = m.ensure("input", 1, 1); m.ensure("output", 1, 1);
    m.raise(a.id);
    expect(m.list().at(-1)?.id).toBe(a.id);
    m.flip(a.id); expect(a.face).toBe("back"); m.flip(a.id); expect(a.face).toBe("front");
    m.moveTo(a.id, -999, -999);
    expect(a.x + SIZE.input.w).toBeGreaterThanOrEqual(DESK_AREA.x + 24);
    expect(a.y).toBe(DESK_AREA.y);
    m.moveTo(a.id, 9999, 9999);
    expect(a.x).toBeLessThanOrEqual(DESK_AREA.x + DESK_AREA.w - 24);
    expect(a.y).toBeLessThanOrEqual(DESK_AREA.y + DESK_AREA.h - 24);
    m.nudge(a.id, -4.6, 0); expect(Number.isInteger(a.x)).toBe(true);
  });
  it("round-trips a layout, also for sheets created after the restore", () => {
    const m = new PaperModel();
    const a = m.ensure("input", 2, 1); m.moveTo(a.id, 200, 200); m.flip(a.id);
    const o = m.ensure("output", 2, 1); m.moveTo(o.id, 300, 120);
    const raw = m.serialize(42);
    const n = new PaperModel();
    n.restore(parseLayout(raw, 42));
    const a2 = n.ensure("input", 2, 1); n.applyPending(a2);
    expect([a2.x, a2.y, a2.face]).toEqual([200, 200, "back"]);
    const o2 = n.ensure("output", 2, 1); n.applyPending(o2);
    expect([o2.x, o2.y]).toEqual([300, 120]);
    expect(n.ensure("input", 9, 1).z).toBeGreaterThan(o2.z); // new sheets still land on top
  });
  it("rejects bad, foreign or oversized layouts and drops bad entries", () => {
    const ok = { id: "in:1:1", x: 200, y: 150, z: 3, face: "front" };
    const raw = (o: unknown): string => JSON.stringify(o);
    expect(parseLayout(raw({ v: 1, seed: 7, papers: [ok] }), 8)).toEqual([]);
    for (const r of [null, "", "{", "[]", raw({ v: 2, seed: 7, papers: [] }), "x".repeat(40_000)]) expect(parseLayout(r, 7)).toEqual([]);
    const bad = [{ ...ok, id: "../x" }, { ...ok, id: "in:1" }, { ...ok, x: 1.5 }, { ...ok, x: 1e9 }, { ...ok, face: "side" }, null, 3, { ...ok, z: -1 }, ok];
    expect(parseLayout(raw({ v: 1, seed: 7, papers: bad }), 7)).toEqual([ok]);
    expect(parseLayout(raw({ v: 1, seed: 7, papers: [ok, { ...ok, x: 10 }] }), 7)).toEqual([ok]); // duplicate id: first wins
  });
});
