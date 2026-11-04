// Pure menu logic (no DOM): item list, keyboard navigation, seed input parsing, a safe description of the saved watch.
import { parseSave, isSeed, SAVE_KEY, LEGACY_SAVE_KEY, type StorageLike } from "../sim/session";

export type MenuId = "continue" | "new" | "settings" | "help";
export interface MenuItem { readonly id: MenuId; readonly label: string; readonly enabled: boolean }

export function menuItems(hasSave: boolean): MenuItem[] {
  return [
    { id: "continue", label: "Continue", enabled: hasSave },
    { id: "new", label: "New game", enabled: true },
    { id: "settings", label: "Settings", enabled: true },
    { id: "help", label: "Help", enabled: true },
  ];
}

/** Index of the first enabled item: Continue when a save exists, otherwise New game. */
export const initialSelection = (items: readonly MenuItem[]): number => Math.max(0, items.findIndex((i) => i.enabled));

/** Next enabled index in the given direction, wrapping around; stays put when nothing else is enabled. */
export function stepSelection(items: readonly MenuItem[], from: number, dir: 1 | -1): number {
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if ((items[i] as MenuItem).enabled) return i;
  }
  return from;
}

export type SeedInput = { readonly ok: true; readonly seed: number | null } | { readonly ok: false };

/** "" means random (null). Otherwise 1-10 digits that fit in a u32. */
export function parseSeedInput(text: string): SeedInput {
  const t = text.trim();
  if (t === "") return { ok: true, seed: null };
  if (!/^\d{1,10}$/.test(t)) return { ok: false };
  const n = Number(t);
  return isSeed(n) ? { ok: true, seed: n } : { ok: false };
}

export interface SaveInfo { readonly seed: number; readonly tickSec: number; readonly commands: number }

/** What the Continue button may show about the saved watch: seed and elapsed time only (never Intel, hazard or true range). */
export function describeSave(storage: StorageLike | null): SaveInfo | null {
  let raw: string | null = null;
  try { raw = storage?.getItem(SAVE_KEY) ?? storage?.getItem(LEGACY_SAVE_KEY) ?? null; } catch { return null; }
  const s = parseSave(raw);
  return s === null ? null : { seed: s.seed, tickSec: s.untilTick, commands: s.commands.length };
}

export function formatElapsed(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
