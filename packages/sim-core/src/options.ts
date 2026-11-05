// G4 watch options: mode, module switches and difficulty. Part of the save (seed + opts + command log). Pure and validated.
export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];
export const MODULE_NAMES = ["timer", "rotors", "stamps", "signatures", "cables", "teletyper", "map", "weather", "radar"] as const;
export type ModuleName = (typeof MODULE_NAMES)[number];
export type ModuleSet = Readonly<Record<ModuleName, boolean>>;

export interface WatchOptions {
  readonly mode: "night" | "endless";
  readonly modules: ModuleSet;
  readonly difficulty: Difficulty;
}

/** Modules are independent of difficulty: all of them are on unless the player switches one off. */
export const ALL_MODULES: ModuleSet = { timer: true, rotors: true, stamps: true, signatures: true, cables: true, teletyper: true, map: true, weather: true, radar: true };
export const defaultOptions = (mode: WatchOptions["mode"] = "endless"): WatchOptions => ({ mode, modules: ALL_MODULES, difficulty: "normal" });

/** Boundary validation for options from a save or a menu: anything unknown is rejected (null), nothing is guessed. */
export function parseOptions(x: unknown): WatchOptions | null {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  if (o["mode"] !== "night" && o["mode"] !== "endless") return null;
  if (!DIFFICULTIES.includes(o["difficulty"] as Difficulty)) return null;
  const m = o["modules"];
  if (typeof m !== "object" || m === null || Array.isArray(m)) return null;
  const mm = m as Record<string, unknown>;
  const mods: Record<string, boolean> = {};
  for (const k of MODULE_NAMES) {
    if ((k === "map" || k === "weather" || k === "radar") && mm[k] === undefined) { mods[k] = true; continue; } // saves from before G5 have no map module, before G6 no weather or radar module: they are on
    if (typeof mm[k] !== "boolean") return null;
    mods[k] = mm[k] as boolean;
  }
  return { mode: o["mode"], difficulty: o["difficulty"] as Difficulty, modules: mods as ModuleSet };
}
