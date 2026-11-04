// Session = Watch + save file. Vietnamese: save/load CHỈ là seed + commandLog + untilTick; khôi phục bằng replay(). Bản chép dở lưu RIÊNG (transcripts.ts).
import { replay, Watch, type Command, type LoggedCommand } from "@uboat/sim-core";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveFile {
  readonly v: 2;
  readonly seed: number;
  readonly untilTick: number;
  readonly commands: readonly LoggedCommand[];
}

export const SAVE_KEY = "uboat-radio.save.v2";
export const LEGACY_SAVE_KEY = "uboat-radio.save.v1"; // P4 format {v:1, seed, tick, commands}, read once and migrated
const MAX_COMMANDS = 5000; // a 30-minute watch cannot legitimately exceed this; bounds untrusted input
const MAX_TICK = 20_000;   // bounds replay work: replay() steps the sim untilTick times (watch is 1800 ticks)
const MAX_BYTES = 2_000_000;

const isInt = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 1_000_000;
const isNum = (x: unknown, lo: number, hi: number): x is number => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;

/** Boundary validation of one command from untrusted storage. */
export function parseCommand(x: unknown): Command | null {
  if (typeof x !== "object" || x === null) return null;
  const c = x as Record<string, unknown>;
  switch (c["kind"]) {
    case "heading": return isNum(c["deg"], -3600, 3600) ? { kind: "heading", deg: c["deg"] } : null;
    case "speed": return isNum(c["kn"], 0, 40) ? { kind: "speed", kn: c["kn"] } : null;
    case "mode": return c["mode"] === "surface" || c["mode"] === "periscope" || c["mode"] === "dive" ? { kind: "mode", mode: c["mode"] } : null;
    case "silence": return typeof c["on"] === "boolean" ? { kind: "silence", on: c["on"] } : null;
    case "transmit": return isNum(c["seconds"], 0, 600) ? { kind: "transmit", seconds: c["seconds"] } : null;
    case "repeat": return isInt(c["rxId"]) ? { kind: "repeat", rxId: c["rxId"] } : null;
    case "challenge": return isInt(c["rxId"]) ? { kind: "challenge", rxId: c["rxId"] } : null;
    case "check": return isInt(c["rxId"]) ? { kind: "check", rxId: c["rxId"] } : null;
    case "resolve":
      return isInt(c["rxId"]) && (c["decision"] === "accept" || c["decision"] === "reject")
        ? { kind: "resolve", rxId: c["rxId"], decision: c["decision"] } : null;
    default: return null;
  }
}

/** Parses v2, or migrates a legacy v1 save (P4: `tick` is renamed `untilTick`). Returns null for anything invalid. */
export function parseSave(raw: string | null): SaveFile | null {
  if (raw === null || raw.length > MAX_BYTES) return null;
  let j: unknown;
  try { j = JSON.parse(raw); } catch { return null; }
  if (typeof j !== "object" || j === null) return null;
  const o = j as Record<string, unknown>;
  const ver = o["v"];
  const until = ver === 2 ? o["untilTick"] : ver === 1 ? o["tick"] : undefined;
  if ((ver !== 1 && ver !== 2) || !isInt(o["seed"]) || !isInt(until) || until > MAX_TICK || !Array.isArray(o["commands"]) || o["commands"].length > MAX_COMMANDS) return null;
  const commands: LoggedCommand[] = [];
  let prev = 0;
  for (const e of o["commands"] as unknown[]) {
    if (typeof e !== "object" || e === null) return null;
    const r = e as Record<string, unknown>;
    const cmd = parseCommand(r["cmd"]);
    if (!isInt(r["tick"]) || r["tick"] < prev || cmd === null) return null; // ticks must be non-decreasing for replay
    prev = r["tick"];
    commands.push({ tick: r["tick"], cmd });
  }
  if (prev > until) return null;
  return { v: 2, seed: o["seed"], untilTick: until, commands };
}

export class Session {
  private storageFailed = false;

  private constructor(
    readonly seed: number,
    readonly watch: Watch,
    private readonly storage: StorageLike | null,
    private readonly onStorageError: (err: unknown) => void,
  ) {}

  static fresh(seed: number, storage: StorageLike | null, onStorageError: (e: unknown) => void = () => {}): Session {
    const s = new Session(seed, new Watch(seed), storage, onStorageError);
    s.save();
    return s;
  }

  /** Returns a restored session when a valid save exists (and matches `wantedSeed` if given), else null. */
  static restore(storage: StorageLike | null, wantedSeed: number | null, onStorageError: (e: unknown) => void = () => {}): Session | null {
    let save: SaveFile | null = null;
    try {
      save = parseSave(storage?.getItem(SAVE_KEY) ?? null) ?? parseSave(storage?.getItem(LEGACY_SAVE_KEY) ?? null);
    } catch (e) { onStorageError(e); return null; }
    if (save === null || (wantedSeed !== null && save.seed !== wantedSeed)) return null;
    const s = new Session(save.seed, replay(save.seed, save.commands, save.untilTick), storage, onStorageError);
    s.save(); // persists in v2 form (migrates a legacy save) and drops the v1 key
    return s;
  }

  /** Apply a player command (logged by the Watch itself) and persist. */
  dispatch(cmd: Command): boolean {
    const ok = this.watch.dispatch(cmd);
    this.save();
    return ok;
  }

  step(): void {
    this.watch.step();
    if (this.watch.tickCount % 5 === 0 || this.watch.endReason !== null) this.save();
  }

  toSave(): SaveFile {
    return { v: 2, seed: this.seed, untilTick: this.watch.tickCount, commands: this.watch.commandLog() };
  }

  save(): void {
    if (this.storage === null) return;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.toSave()));
      this.storage.removeItem(LEGACY_SAVE_KEY);
    } catch (e) {
      if (!this.storageFailed) { this.storageFailed = true; this.onStorageError(e); } // report once (design s9)
    }
  }

  static clear(storage: StorageLike | null): void {
    try { storage?.removeItem(SAVE_KEY); storage?.removeItem(LEGACY_SAVE_KEY); } catch { /* nothing to clear */ }
  }
}
