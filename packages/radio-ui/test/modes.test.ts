import { describe, expect, it } from "vitest";
import { blursAfterPointer, inputMode, routeKey } from "../src/input/modes";

describe("input modes", () => {
  it("emergency wins over lookup, lookup over copy", () => {
    expect(inputMode({ emergency: false, lookup: false })).toBe("copy");
    expect(inputMode({ emergency: false, lookup: true })).toBe("lookup");
    expect(inputMode({ emergency: true, lookup: true })).toBe("emergency");
  });
  it("Tab is never swallowed", () => {
    expect(routeKey("Tab", null)).toBe("control");
    expect(routeKey("Tab", { tag: "BUTTON", editable: false })).toBe("control");
  });
  it("Enter/Space on a focused button activate the button, not the game", () => {
    for (const code of ["Enter", "NumpadEnter", "Space"]) expect(routeKey(code, { tag: "button", editable: false })).toBe("control");
    expect(routeKey("Enter", { tag: "DIV", editable: false })).toBe("game");
    expect(routeKey("Enter", null)).toBe("game");
  });
  it("letters keep going to the game even when a button has focus", () => {
    expect(routeKey("KeyA", { tag: "BUTTON", editable: false })).toBe("game");
  });
  it("text fields keep every key", () => {
    expect(routeKey("KeyA", { tag: "INPUT", editable: true })).toBe("control");
  });
  it("mouse clicks release focus, keyboard activation keeps it", () => {
    expect(blursAfterPointer(1)).toBe(true);
    expect(blursAfterPointer(0)).toBe(false);
  });
});
