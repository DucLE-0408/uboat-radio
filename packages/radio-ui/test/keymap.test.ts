import { describe, expect, it } from "vitest";
import { ALT_COMMANDS, resolveKey, type KeyInput } from "../src/input/keymap";

const key = (code: string, o: Partial<KeyInput> = {}): KeyInput => ({ code, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...o });
const calm = { emergency: false, lookup: false };
const emergency = { emergency: true, lookup: false };

describe("keymap", () => {
  it("accepts A-Z and 0-9 by event.code", () => {
    for (let i = 0; i < 26; i++) {
      const ch = String.fromCharCode(65 + i);
      expect(resolveKey(key(`Key${ch}`), calm)).toEqual({ t: "char", ch });
    }
    for (let i = 0; i < 10; i++) expect(resolveKey(key(`Digit${i}`), calm)).toEqual({ t: "char", ch: String(i) });
  });

  it("is layout independent: the character comes from code, never from key", () => {
    const azerty = { ...key("KeyQ"), key: "a" } as KeyInput;
    expect(resolveKey(azerty, calm)).toEqual({ t: "char", ch: "Q" });
  });

  it("maps Space, Backspace, Enter and '/' to the declared actions", () => {
    expect(resolveKey(key("Space"), calm)).toEqual({ t: "space" });
    expect(resolveKey(key("Backspace"), calm)).toEqual({ t: "backspace" });
    expect(resolveKey(key("Enter"), calm)).toEqual({ t: "confirm" });
    expect(resolveKey(key("Slash"), calm)).toEqual({ t: "char", ch: "?" });
    expect(resolveKey(key("Slash", { shiftKey: true }), calm)).toEqual({ t: "char", ch: "?" });
  });

  it("returns null for every undeclared key (so the browser keeps them)", () => {
    for (const c of ["F1", "F5", "F12", "Tab", "Semicolon", "Quote", "Period", "Comma", "Minus", "Equal", "Delete", "Home", "End", "NumpadAdd", "ShiftLeft", "AltLeft", "ContextMenu"]) {
      expect(resolveKey(key(c), calm)).toBeNull();
    }
  });

  it("never shadows Ctrl/Meta shortcuts", () => {
    expect(resolveKey(key("KeyR", { ctrlKey: true }), calm)).toBeNull();
    expect(resolveKey(key("KeyW", { metaKey: true }), calm)).toBeNull();
    expect(resolveKey(key("KeyA", { ctrlKey: true, altKey: true }), calm)).toBeNull();
  });

  it("Alt layer carries radio commands and nothing else", () => {
    for (const [code, cmd] of Object.entries(ALT_COMMANDS)) expect(resolveKey(key(code, { altKey: true }), calm)).toEqual({ t: "cmd", cmd });
    expect(resolveKey(key("KeyQ", { altKey: true }), calm)).toBeNull();
    expect(resolveKey(key("KeyH", { altKey: true }), calm)).toEqual({ t: "toggleHydrophone" });
  });

  it("emergency layer is opt-in and only active in emergency", () => {
    expect(resolveKey(key("KeyD"), calm)).toEqual({ t: "char", ch: "D" });
    expect(resolveKey(key("KeyD"), emergency)).toEqual({ t: "cmd", cmd: "dive" });
    expect(resolveKey(key("Digit3"), emergency)).toEqual({ t: "speedTo", kn: 6 });
    expect(resolveKey(key("KeyA"), emergency)).toEqual({ t: "char", ch: "A" });
  });

  it("Escape pauses normally and dismisses the emergency layout when it is up", () => {
    expect(resolveKey(key("Escape"), calm)).toEqual({ t: "pause" });
    expect(resolveKey(key("Escape"), emergency)).toEqual({ t: "dismissEmergency" });
  });

  it("arrows steer the boat", () => {
    expect(resolveKey(key("ArrowLeft"), calm)).toEqual({ t: "heading", delta: -10 });
    expect(resolveKey(key("ArrowUp"), calm)).toEqual({ t: "speed", delta: 1 });
  });
});
