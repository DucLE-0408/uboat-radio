import { describe, expect, it } from "vitest";

// Static architecture invariants (R7.2). Vite's raw glob keeps this free of Node typings.
const sources = import.meta.glob("../src/**/*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("architecture invariants", () => {
  it("scans the UI sources", () => { expect(Object.keys(sources).length).toBeGreaterThan(15); });

  it("never calls truthOf (ground truth must not reach the UI)", () => {
    for (const [f, src] of Object.entries(sources)) expect(src, f).not.toMatch(/truthOf/);
  });

  it("imports sim-core only through the barrel", () => {
    for (const [f, src] of Object.entries(sources)) {
      for (const m of src.matchAll(/from\s+"([^"]+)"/g)) {
        const spec = m[1] as string;
        expect(spec, `${f}: ${spec}`).not.toMatch(/sim-core\/|\.\.\/\.\.\/sim-core|\/sim-core\/src/);
        if (spec.includes("sim-core")) expect(spec).toBe("@uboat/sim-core");
      }
    }
  });

  it("never reads hazard or Intel values", () => {
    for (const [f, src] of Object.entries(sources)) {
      expect(src, f).not.toMatch(/intelLevel|\.hazard|forgeryPassProbability/);
    }
  });

  it("never reads or shows a contact range (sonar shows bearing, blade rate and class only)", () => {
    for (const [f, src] of Object.entries(sources)) expect(src, f).not.toMatch(/rangeM|\.range\b/);
  });

  it("uses no innerHTML / eval (no injection path)", () => {
    for (const [f, src] of Object.entries(sources)) expect(src, f).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function/);
  });
});
