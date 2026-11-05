import { describe, expect, it } from "vitest";
import { DESK_AREA, PaperModel, paperId, parseLayout, SIZE } from "../src/desk/papers";
import { canTrash, checkHandOver } from "../src/desk/rules";
import { sprite } from "../src/scene/assets";

describe("sender slip and encode sheet", () => {
  it("have their own ids, sizes and sprites that match the sheet size", () => {
    expect(paperId("slip", 4, 1)).toBe("slip:4:1");
    expect(paperId("encode", 4, 0)).toBe("enc:4:0");
    for (const [kind, id] of [["slip", "paper-slip"], ["encode", "paper-encode"]] as const) {
      const s = sprite(id);
      expect(s.frames).toEqual({ w: SIZE[kind].w, h: SIZE[kind].h, count: 2 });
      expect(s.w).toBe(SIZE[kind].w * 2);
    }
  });
  it("spawn inside the desk and never exactly on top of another sheet", () => {
    const m = new PaperModel();
    for (let k = 0; k < 8; k++) { m.ensure("slip", k, 1); m.ensure("encode", k, 0); }
    const spots = m.list().map((p) => `${p.x},${p.y}`);
    expect(new Set(spots).size).toBe(spots.length);
    for (const p of m.list()) {
      expect(p.x + SIZE[p.kind].w).toBeGreaterThanOrEqual(DESK_AREA.x + 24);
      expect(p.y).toBeGreaterThanOrEqual(DESK_AREA.y);
    }
  });
  it("can be stamped on the back, signed and clipped to their own message only", () => {
    const m = new PaperModel();
    const s = m.ensure("slip", 1, 1), e = m.ensure("encode", 1, 0), other = m.ensure("slip", 2, 1);
    expect(m.stamp(s.id, "blue")).toBe("front");
    m.flip(s.id); expect(m.stamp(s.id, "blue")).toBe("ok"); expect(m.sign(s.id)).toBe("ok");
    expect(m.clipTo(s.id, e.id)).toBe("ok");
    expect(m.clipTo(other.id, e.id)).toBe("otherMessage");
  });
  it("are records: not binned, and they leave with the bundle they are clipped to", () => {
    expect(canTrash("slip")).toBe(false);
    expect(canTrash("encode")).toBe(false);
    const m = new PaperModel();
    const i = m.ensure("input", 1, 0), s = m.ensure("slip", 1, 0);
    m.clipTo(s.id, i.id);
    const res = checkHandOver(m.group(i.id), () => true);
    expect(res.ok).toBe(true);
    m.handOver(m.group(i.id).map((p) => p.id));
    expect(s.place).toBe("handed");
  });
  it("survive a save and reload, and a forged id is dropped", () => {
    const m = new PaperModel();
    const s = m.ensure("slip", 3, 2), e = m.ensure("encode", 3, 0);
    m.flip(s.id); m.stamp(s.id, "red");
    const back = parseLayout(m.serialize(7), 7);
    expect(back.map((p) => p.id).sort()).toEqual([e.id, s.id].sort());
    expect(back.find((p) => p.id === s.id)?.stamps).toEqual(["red"]);
    const bad = JSON.stringify({ v: 1, seed: 7, papers: [{ id: "slip:x:1", x: 0, y: 0, z: 1, face: "front" }, { id: "enc:3:0", x: 200, y: 200, z: 2, face: "front" }] });
    expect(parseLayout(bad, 7).map((p) => p.id)).toEqual(["enc:3:0"]);
  });
});
