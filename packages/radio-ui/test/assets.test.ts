import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { buildManifest, FONTS } from "../tools/art/generate.ts";
import manifest from "../assets/manifest.json";

const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

describe("asset manifest", () => {
  it("every sprite exists, has the declared size and a valid PNG header", () => {
    for (const e of manifest.sprites) {
      const f = `assets/${e.path}`;
      expect(existsSync(f), f).toBe(true);
      const b = readFileSync(f);
      expect(sha(b), `${e.id} sha256`).toBe(e.sha256);
      expect(Array.from(b.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      expect([dv.getUint32(16), dv.getUint32(20)], e.id).toEqual([e.width, e.height]);
    }
  });

  it("records origin, license and TEMPORARY status for every sprite", () => {
    expect(manifest.sprites.length).toBeGreaterThanOrEqual(16);
    for (const e of manifest.sprites) {
      expect(e.origin.length, e.id).toBeGreaterThan(10);
      expect(e.license.length, e.id).toBeGreaterThan(5);
      expect(e.status, e.id).toBe("TEMPORARY");
      if (e.frames) expect(e.frames.w * e.frames.count, e.id).toBe(e.width);
    }
  });

  it("generator is deterministic and matches the committed pixels", () => {
    const a = buildManifest(), b = buildManifest();
    expect(a.entries.map((e) => e.pixelSha256)).toEqual(b.entries.map((e) => e.pixelSha256));
    expect(a.entries.map((e) => [e.id, e.pixelSha256])).toEqual(manifest.sprites.map((e) => [e.id, e.pixelSha256]));
  });

  it("fonts ship with their OFL license and the recorded hash", () => {
    for (const f of FONTS) {
      expect(sha(readFileSync(`assets/${f.path}`)), f.id).toBe(f.sha256);
      expect(existsSync(`assets/${f.licenseFile}`), f.id).toBe(true);
      expect(f.license).toBe("OFL-1.1");
    }
  });

  it("scene geometry is the 640x360 logical frame", () => {
    expect(manifest.scene).toEqual({ width: 640, height: 360 });
    const bg = manifest.sprites.find((s) => s.id === "scene-bg");
    expect([bg?.width, bg?.height]).toEqual([640, 360]);
  });
});
