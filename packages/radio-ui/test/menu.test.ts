import { describe, expect, it } from "vitest";
import { describeSave, formatElapsed, initialSelection, menuItems, parseSeedInput, stepSelection } from "../src/menu/model";
import { defaultSettings, loadSettings, parseSettings, saveSettings, SETTINGS_KEY } from "../src/menu/settings";
import { SAVE_KEY, type StorageLike } from "../src/sim/session";

const mem = (init: Record<string, string> = {}): StorageLike & { map: Map<string, string> } => {
  const map = new Map(Object.entries(init));
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } };
};

describe("menu items and navigation", () => {
  it("lists Continue, New game, Settings, Help; Continue needs a save", () => {
    expect(menuItems(true).map((i) => i.label)).toEqual(["Continue", "New game", "Settings", "Help"]);
    expect(menuItems(false)[0]?.enabled).toBe(false);
    expect(menuItems(false).slice(1).every((i) => i.enabled)).toBe(true);
  });
  it("starts on Continue with a save, otherwise on New game", () => {
    expect(initialSelection(menuItems(true))).toBe(0);
    expect(initialSelection(menuItems(false))).toBe(1);
  });
  it("arrow keys wrap and skip a disabled Continue", () => {
    const it0 = menuItems(false);
    expect(stepSelection(it0, 1, -1)).toBe(3);   // up from New game wraps past the disabled Continue to Help
    expect(stepSelection(it0, 3, 1)).toBe(1);    // down from Help wraps to New game
    const it1 = menuItems(true);
    expect(stepSelection(it1, 0, -1)).toBe(3);
    expect(stepSelection(it1, 2, 1)).toBe(3);
  });
  it("stays put when nothing else is enabled", () => {
    const only = [{ id: "new" as const, label: "x", enabled: true }, { id: "help" as const, label: "y", enabled: false }];
    expect(stepSelection(only, 0, 1)).toBe(0);
  });
});

describe("seed input", () => {
  it("empty means random; digits within u32 are accepted", () => {
    expect(parseSeedInput("")).toEqual({ ok: true, seed: null });
    expect(parseSeedInput("  ")).toEqual({ ok: true, seed: null });
    expect(parseSeedInput("0")).toEqual({ ok: true, seed: 0 });
    expect(parseSeedInput("4294967295")).toEqual({ ok: true, seed: 4294967295 });
  });
  it("rejects everything else", () => {
    for (const bad of ["4294967296", "-1", "1.5", "1e3", "abc", "12 3", "99999999999", "0x10", "١٢"]) expect(parseSeedInput(bad), bad).toEqual({ ok: false });
  });
});

describe("saved watch description", () => {
  it("shows seed, elapsed time and command count only", () => {
    const st = mem({ [SAVE_KEY]: JSON.stringify({ v: 2, seed: 3000000000, untilTick: 754, commands: [{ tick: 3, cmd: { kind: "silence", on: true } }] }) });
    expect(describeSave(st)).toEqual({ seed: 3000000000, tickSec: 754, commands: 1 });
    expect(formatElapsed(754)).toBe("12:34");
  });
  it("is null for no, corrupt or unreadable storage", () => {
    expect(describeSave(null)).toBeNull();
    expect(describeSave(mem())).toBeNull();
    expect(describeSave(mem({ [SAVE_KEY]: "{oops" }))).toBeNull();
    const boom: StorageLike = { getItem: () => { throw new Error("denied"); }, setItem: () => {}, removeItem: () => {} };
    expect(describeSave(boom)).toBeNull();
  });
});

describe("settings", () => {
  const d = defaultSettings(false);
  it("defaults follow the OS reduced-motion preference", () => {
    expect(defaultSettings(true).reduceMotion).toBe(true);
    expect(d).toMatchObject({ master: 1, morse: 1, hydro: 1, sound: true, reduceMotion: false, ui: "p5" });
  });
  it("round-trips and validates field by field", () => {
    const st = mem();
    expect(saveSettings(st, { ...d, master: 0.4, ui: "classic", sound: false })).toBe(true);
    expect(loadSettings(st, d)).toMatchObject({ master: 0.4, ui: "classic", sound: false });
    expect(parseSettings(JSON.stringify({ master: 7, morse: -3, hydro: "x", sound: 1, reduceMotion: null, ui: "evil", extra: 1 }), d)).toEqual({ ...d, master: 1, morse: 0 });
  });
  it("falls back to defaults on junk, oversized or unreadable input", () => {
    for (const raw of [null, "", "{", "[]", "null", "1", "x".repeat(5000)]) expect(parseSettings(raw, d), String(raw).slice(0, 8)).toEqual(d);
    const boom: StorageLike = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("full"); }, removeItem: () => {} };
    expect(loadSettings(boom, d)).toEqual(d);
    expect(saveSettings(boom, d)).toBe(false);
    expect(saveSettings(null, d)).toBe(false);
    expect(SETTINGS_KEY).toBe("uboat-radio.settings.v1");
  });
});
