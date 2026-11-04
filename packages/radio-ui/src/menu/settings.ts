// Player settings: a small, separate localStorage key (never part of the save). Everything read from storage is untrusted and validated.
import { parseLang, type Lang } from "../i18n";
import type { StorageLike } from "../sim/session";

export interface Settings {
  readonly master: number;       // 0..1
  readonly morse: number;        // 0..1 (Morse tones and static)
  readonly hydro: number;        // 0..1 (hydrophone)
  readonly sound: boolean;
  readonly reduceMotion: boolean;
  readonly ui: "p5" | "classic" | "desk";
  readonly lang: Lang;
  readonly timer: boolean;       // desk G2: 2-minute indicator per message (R10.3); off by default
}

export const SETTINGS_KEY = "uboat-radio.settings.v1";
const MAX_BYTES = 4096;

export function defaultSettings(prefersReducedMotion: boolean): Settings {
  return { master: 1, morse: 1, hydro: 1, sound: true, reduceMotion: prefersReducedMotion, ui: "desk", lang: "en", timer: false }; // Desk UI is the default since desk-ui Stage 5 (D7); P5 stays a Settings choice
}

const level = (x: unknown, d: number): number => (typeof x === "number" && Number.isFinite(x) ? Math.min(1, Math.max(0, Math.round(x * 20) / 20)) : d);
const flag = (x: unknown, d: boolean): boolean => (typeof x === "boolean" ? x : d);

/** Field-by-field validation: an invalid field falls back to its default; unknown fields are dropped. */
export function parseSettings(raw: string | null, d: Settings): Settings {
  if (raw === null || raw.length > MAX_BYTES) return d;
  let j: unknown;
  try { j = JSON.parse(raw); } catch { return d; }
  if (typeof j !== "object" || j === null || Array.isArray(j)) return d;
  const o = j as Record<string, unknown>;
  return {
    master: level(o["master"], d.master), morse: level(o["morse"], d.morse), hydro: level(o["hydro"], d.hydro),
    sound: flag(o["sound"], d.sound), reduceMotion: flag(o["reduceMotion"], d.reduceMotion),
    ui: o["ui"] === "classic" || o["ui"] === "p5" || o["ui"] === "desk" ? o["ui"] : d.ui,
    lang: parseLang(o["lang"]) ?? d.lang,
    timer: flag(o["timer"], d.timer),
  };
}

export function loadSettings(storage: StorageLike | null, d: Settings): Settings {
  try { return parseSettings(storage?.getItem(SETTINGS_KEY) ?? null, d); } catch { return d; }
}

/** Returns false when the browser refused the write (the caller tells the player once). */
export function saveSettings(storage: StorageLike | null, s: Settings): boolean {
  if (storage === null) return false;
  try { storage.setItem(SETTINGS_KEY, JSON.stringify(s)); return true; } catch { return false; }
}
