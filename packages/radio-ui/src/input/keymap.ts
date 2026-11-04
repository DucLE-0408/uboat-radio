// Single declarative key table, keyed by event.code (layout independent). Vietnamese: mọi phím được dùng khai báo ở ĐÂY;
// phím không có trong bảng trả về null => không preventDefault, trình duyệt xử lý bình thường (Ctrl+R, F12...).

export type CmdKey = "repeat" | "challenge" | "check" | "accept" | "reject" | "report10" | "report30" | "silence"
  | "surface" | "periscope" | "dive";

export type Action =
  | { readonly t: "char"; readonly ch: string }
  | { readonly t: "space" }
  | { readonly t: "backspace" }
  | { readonly t: "confirm" }
  | { readonly t: "replayAudio" }
  | { readonly t: "nextRx" } | { readonly t: "prevRx" }
  | { readonly t: "nextAttempt" } | { readonly t: "prevAttempt" }
  | { readonly t: "pause" }
  | { readonly t: "cmd"; readonly cmd: CmdKey }
  | { readonly t: "heading"; readonly delta: number }
  | { readonly t: "speed"; readonly delta: number }
  | { readonly t: "speedTo"; readonly kn: number }
  | { readonly t: "toggleLookup" }
  | { readonly t: "toggleHydrophone" }
  | { readonly t: "dismissEmergency" };

export interface KeyInput {
  readonly code: string;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

export interface KeyContext {
  readonly emergency: boolean;
  readonly lookup: boolean;
}

/** Alt + key => radio-room command (Alt keeps plain letters free for copying). */
export const ALT_COMMANDS: Readonly<Record<string, CmdKey>> = {
  KeyR: "repeat", KeyC: "challenge", KeyK: "check", KeyY: "accept", KeyN: "reject",
  KeyT: "report10", KeyG: "report30", KeyS: "silence",
  Digit1: "surface", Digit2: "periscope", Digit3: "dive",
};

/** Emergency layer: plain keys, no modifiers, so the captain's orders can be typed in a hurry. */
export const EMERGENCY_KEYS: Readonly<Record<string, CmdKey>> = { KeyU: "surface", KeyP: "periscope", KeyD: "dive" };

export const HEADING_STEP = 10;
export const SPEED_STEP = 1;
export const SPEED_PER_DIGIT = 2; // emergency: Digit n => 2n knots

const LETTER = /^Key([A-Z])$/;
const DIGIT = /^Digit([0-9])$/;

/**
 * Map a keydown to an action, or null when the key is not ours.
 * Only A-Z, 0-9, Space, Backspace, Enter and the declared control keys are ever accepted as input (R2.1).
 */
export function resolveKey(k: KeyInput, ctx: KeyContext): Action | null {
  if (k.ctrlKey || k.metaKey) return null; // never shadow browser / OS shortcuts

  if (k.altKey) {
    const cmd = ALT_COMMANDS[k.code];
    if (cmd !== undefined) return { t: "cmd", cmd };
    if (k.code === "KeyH") return { t: "toggleHydrophone" };
    if (k.code === "KeyL") return { t: "toggleLookup" };
    return null;
  }

  switch (k.code) {
    case "Escape": return ctx.emergency ? { t: "dismissEmergency" } : { t: "pause" };
    case "PageDown": return { t: "nextRx" };
    case "PageUp": return { t: "prevRx" };
    case "BracketRight": return { t: "nextAttempt" };
    case "BracketLeft": return { t: "prevAttempt" };
    case "Backquote": return { t: "replayAudio" };
    case "ArrowLeft": return { t: "heading", delta: -HEADING_STEP };
    case "ArrowRight": return { t: "heading", delta: HEADING_STEP };
    case "ArrowUp": return { t: "speed", delta: SPEED_STEP };
    case "ArrowDown": return { t: "speed", delta: -SPEED_STEP };
    default: break;
  }

  if (ctx.emergency) {
    const cmd = EMERGENCY_KEYS[k.code];
    if (cmd !== undefined) return { t: "cmd", cmd };
    const d = DIGIT.exec(k.code);
    if (d) return { t: "speedTo", kn: Number(d[1]) * SPEED_PER_DIGIT };
    // other keys fall through to copy input so the operator is never locked out of the key
  }

  if (k.code === "Backspace") return { t: "backspace" };
  if (k.code === "Space") return { t: "space" };
  if (k.code === "Enter" || k.code === "NumpadEnter") return { t: "confirm" };
  if (k.code === "Slash") return { t: "char", ch: "?" }; // 'unreadable' placeholder keeps the rotor in step
  const l = LETTER.exec(k.code);
  if (l) return { t: "char", ch: l[1] as string };
  const d = DIGIT.exec(k.code);
  if (d) return { t: "char", ch: d[1] as string };
  return null;
}

/** Keys the document must swallow (preventDefault) while the radio room has focus. */
export function shouldPrevent(a: Action | null): boolean { return a !== null; }

/** Short help strings shown in the footer; kept next to the table so they cannot drift. */
export const HELP: readonly string[] = [
  "A–Z 0–9 copy · Space group · / unreadable (?) · Backspace · Enter decode",
  "Alt+R repeat · Alt+C challenge · Alt+K check · Alt+Y accept · Alt+N reject · Alt+T/G report · Alt+S silence",
  "Alt+L auth lookup · Alt+H hydrophone · ` replay audio · PgUp/PgDn message · [ ] attempt · Esc pause",
  "← → heading · ↑ ↓ speed · Alt+1/2/3 surface/periscope/dive · EMERGENCY: U P D, 0–9 speed",
];
