// Input mode separation (R3.5). Vietnamese: quyết định phím nào thuộc game, phím nào để cho điều khiển/trình duyệt.
export type InputMode = "copy" | "lookup" | "emergency";

export interface ModeContext { readonly emergency: boolean; readonly lookup: boolean }

/** Which game layer interprets plain keys right now. Emergency wins; lookup next; copy is the default. */
export function inputMode(c: ModeContext): InputMode { return c.emergency ? "emergency" : c.lookup ? "lookup" : "copy"; }

export interface KeyTarget { readonly tag: string; readonly editable: boolean }

const ACTIVATION = new Set(["Enter", "NumpadEnter", "Space"]);
const ACTIVATABLE = new Set(["BUTTON", "A", "SUMMARY", "SELECT"]);

/**
 * "game"    -> the keymap may handle it
 * "control" -> leave it to the focused control / the browser (Tab navigation, button activation, text fields)
 */
export function routeKey(code: string, target: KeyTarget | null): "game" | "control" {
  if (code === "Tab") return "control";
  if (target === null) return "game";
  if (target.editable) return "control";
  if (ACTIVATABLE.has(target.tag.toUpperCase()) && ACTIVATION.has(code)) return "control";
  return "game";
}

/** After a MOUSE/touch click (detail > 0) the control gives up focus so the next Enter/Space goes to the game; keyboard activation (detail 0) keeps focus. */
export const blursAfterPointer = (clickDetail: number): boolean => clickDetail > 0;
