import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import { vi } from "../src/i18n/vi";
import { LANGS, parseLang, tableOf, translate } from "../src/i18n";

describe("i18n", () => {
  it("every language has exactly the English key set, with non-empty strings", () => {
    const keys = Object.keys(en).sort();
    for (const l of LANGS) {
      const tbl = tableOf(l);
      expect(Object.keys(tbl).sort(), l).toEqual(keys);
      for (const k of keys) expect((tbl as Record<string, string>)[k]?.trim().length, `${l}:${k}`).toBeGreaterThan(0);
    }
  });
  it("placeholders match between languages", () => {
    const ph = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort();
    for (const k of Object.keys(en) as (keyof typeof en)[]) expect(ph(vi[k]), k).toEqual(ph(en[k]));
  });
  it("substitutes variables and leaves unknown ones visible", () => {
    expect(translate("vi", "desk.score")).toBe("Khẩu phần");
    expect(translate("en", "desk.score", { x: 1 })).toBe("Ration");
  });
  it("parses only allowlisted languages", () => {
    expect(parseLang("vi")).toBe("vi");
    expect(parseLang("en")).toBe("en");
    for (const x of ["VI", "fr", "", null, 1, "en-US", "__proto__"]) expect(parseLang(x), String(x)).toBeNull();
  });
});
