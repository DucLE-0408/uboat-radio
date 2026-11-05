// Paper layout model for the desk (R2). Pure: no DOM, no sim. Vietnamese: chỉ là trạng thái trình bày (vị trí, mặt, thứ tự);
// nội dung giấy luôn dẫn xuất từ store, quyết định luôn đi qua Actions.

import { validPlugboard } from "@uboat/sim-core";
import { isPositions, MACHINE_DEFAULT, type MachineState } from "./machine";
import { parseRation, RATION_EMPTY, type RationState } from "./ration";

export type PaperKind = "input" | "output" | "mission" | "orders" | "manual";
/** Desk furniture: no rxId, never stamped, signed, clipped, handed over or binned. */
export const isReference = (k: PaperKind): boolean => k === "mission" || k === "orders" || k === "manual";
export type Face = "front" | "back";
export type StampColor = "blue" | "red";
/** "desk": lying on the desk; "handed": given to the crew at the door; "drawer": a reference sheet put away. Neither of the last two is drawn. */
export type Place = "desk" | "handed" | "drawer";
/** Regular stamp boxes on the back of a sheet (the Echo box is separate and comes from the sim's MSG_RESOLVED). */
export const STAMP_SLOTS = 2;

export interface Paper {
  readonly id: string;          // "in:<rxId>:<attempt>", "out:<rxId>:<attempt>", "mission", "orders", "manual"
  readonly kind: PaperKind;
  readonly rxId: number | null;
  readonly attempt: number | null;
  x: number; y: number; z: number; // logical px on the 640x360 frame; z = stacking order
  face: Face;
  place: Place;
  /** Clip group: sheets with the same number are clipped together and move as one. */
  clip: number | null;
  /** Regular stamps in box order. Ink does not come off (R6.2 applies to every stamp). */
  stamps: StampColor[];
  signed: boolean;
  /**
   * Output only: the deciphered groups as last shown. The store keeps no analysis across a reload and no copy of a resolved
   * message, so a stamped Output keeps its text here.
   */
  decoded: Decoded | null;
}

/** What the Output last showed: the plain text of a decode, or the player's copy when it was edited after (or without) one. */
export interface Decoded { readonly mode: "plain" | "copy"; readonly words: readonly string[]; readonly bad: readonly boolean[]; readonly damaged: number }

/** Outcome of a stamp/sign/clip attempt; the UI turns a refusal into a short explanation. */
export type MarkResult = "ok" | "front" | "full" | "already" | "notAllowed" | "otherMessage" | "none";

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** Free area of the desk top where papers may lie (logical px). */
export const DESK_AREA: Rect = { x: 144, y: 104, w: 280, h: 248 };
export const SIZE: Readonly<Record<PaperKind, { readonly w: number; readonly h: number }>> = {
  input: { w: 112, h: 148 }, output: { w: 112, h: 148 }, mission: { w: 128, h: 104 }, orders: { w: 128, h: 150 }, manual: { w: 128, h: 150 },
};
/** Spawn points: new sheets cascade from here so a stack never hides a sheet completely (R2.5). */
const SPAWN: Readonly<Record<PaperKind, { readonly x: number; readonly y: number }>> = {
  input: { x: 262, y: 150 }, output: { x: 168, y: 176 }, mission: { x: 150, y: 112 }, orders: { x: 262, y: 108 }, manual: { x: 278, y: 116 },
};
const CASCADE = 8, CASCADE_STEPS = 6, COLUMN = 20, SPAWN_TRIES = 60;
/** A sheet may hang over the desk edge but always keeps this much on the desk, so it can be grabbed again. */
const KEEP = 24;

export const paperId = (kind: PaperKind, rxId: number | null, attempt: number | null): string =>
  isReference(kind) ? kind : `${kind === "input" ? "in" : "out"}:${rxId}:${attempt}`;

export class PaperModel {
  private readonly byId = new Map<string, Paper>();
  private top = 0;
  private pending = new Map<string, StoredPaper>();

  list(): Paper[] { return [...this.byId.values()].sort((a, b) => a.z - b.z); }
  get(id: string): Paper | undefined { return this.byId.get(id); }
  has(id: string): boolean { return this.byId.has(id); }

  /** Returns the existing sheet or lays a new one on top of its kind's cascade. */
  ensure(kind: PaperKind, rxId: number | null = null, attempt: number | null = null): Paper {
    const id = paperId(kind, rxId, attempt);
    const old = this.byId.get(id);
    if (old) return old;
    const p: Paper = { id, kind, rxId, attempt, x: 0, y: 0, z: ++this.top, face: "front", place: "desk", clip: null, stamps: [], signed: false, decoded: null };
    this.spawnAt(p);
    this.byId.set(id, p);
    return p;
  }

  /** First cascade slot not taken by another sheet; after six steps the cascade starts a new column, so no sheet hides another exactly. */
  private spawnAt(p: Paper): void {
    const s = SPAWN[p.kind];
    const taken = new Set([...this.byId.values()].map((q) => `${q.x},${q.y}`));
    for (let k = 0; k < SPAWN_TRIES; k++) {
      p.x = s.x + (k % CASCADE_STEPS) * CASCADE + Math.floor(k / CASCADE_STEPS) * COLUMN;
      p.y = s.y + (k % CASCADE_STEPS) * CASCADE;
      this.clamp(p);
      if (!taken.has(`${p.x},${p.y}`)) return;
    }
  }

  raise(id: string): void { const p = this.byId.get(id); if (p && p.z !== this.top) p.z = ++this.top; }
  flip(id: string): void { const p = this.byId.get(id); if (p) p.face = p.face === "front" ? "back" : "front"; }
  moveTo(id: string, x: number, y: number): void { const p = this.byId.get(id); if (!p) return; p.x = Math.round(x); p.y = Math.round(y); this.clamp(p); }
  nudge(id: string, dx: number, dy: number): void { const p = this.byId.get(id); if (p) this.moveWith(id, p.x + dx, p.y + dy); }

  /** Sheets clipped to `id` (itself included), in stacking order. */
  group(id: string): Paper[] {
    const p = this.byId.get(id);
    if (!p) return [];
    return p.clip === null ? [p] : this.list().filter((q) => q.clip === p.clip && q.place === p.place);
  }
  /** Moves a sheet and everything clipped to it by the same amount. */
  moveWith(id: string, x: number, y: number): void {
    const p = this.byId.get(id);
    if (!p) return;
    this.shift(this.group(id), Math.round(x) - p.x, Math.round(y) - p.y);
  }
  /** One shared displacement, limited so that every sheet stays grabbable: the offsets inside a bundle never change. */
  private shift(sheets: readonly Paper[], dx: number, dy: number): void {
    for (const q of sheets) {
      const b = this.bounds(q);
      dx = Math.min(b.maxX - q.x, Math.max(b.minX - q.x, dx));
      dy = Math.min(b.maxY - q.y, Math.max(b.minY - q.y, dy));
    }
    for (const q of sheets) { q.x += dx; q.y += dy; }
  }
  /** Raises a whole clip group, keeping its inner order. */
  raiseGroup(id: string): void { for (const q of this.group(id)) q.z = ++this.top; }

  /** Regular stamp in the next free box on the back. */
  stamp(id: string, color: StampColor): MarkResult {
    const p = this.byId.get(id);
    if (!p || p.place !== "desk") return "none";
    if (isReference(p.kind)) return "notAllowed";
    if (p.face !== "back") return "front";
    if (p.stamps.length >= STAMP_SLOTS) return "full";
    p.stamps.push(color);
    return "ok";
  }
  sign(id: string): MarkResult {
    const p = this.byId.get(id);
    if (!p || p.place !== "desk") return "none";
    if (isReference(p.kind)) return "notAllowed";
    if (p.face !== "back") return "front";
    if (p.signed) return "already";
    p.signed = true;
    return "ok";
  }
  /** Clips `id` onto `onto` (joining its group); the clipped sheet lands slightly offset on top. */
  clipTo(id: string, onto: string): MarkResult {
    const a = this.byId.get(id), b = this.byId.get(onto);
    if (!a || !b || a === b || a.place !== "desk" || b.place !== "desk") return "none";
    if (isReference(a.kind) || isReference(b.kind)) return "notAllowed";
    if (a.clip !== null && a.clip === b.clip) return "already";
    if (a.rxId !== b.rxId || this.group(id).some((q) => q.rxId !== b.rxId) || this.group(onto).some((q) => q.rxId !== a.rxId)) return "otherMessage"; // one message per bundle
    const moving = this.group(id);                       // a's own bundle (or just a) joins b's
    const top = this.group(onto).at(-1) ?? b;
    const dx = top.x + 4 - a.x, dy = top.y + 4 - a.y;
    const g = b.clip ?? (b.clip = ++this.clips);
    for (const q of moving) q.clip = g;
    this.shift(moving, dx, dy); // only the joining sheets move, keeping their own offsets
    const ids = new Set(moving.map((q) => q.id));
    for (const q of this.group(onto)) if (!ids.has(q.id)) q.z = ++this.top; // the bundle comes up...
    for (const q of moving) q.z = ++this.top;                                // ...with the newly clipped sheet on top
    return "ok";
  }
  unclip(id: string): MarkResult {
    const p = this.byId.get(id);
    if (!p || p.clip === null) return "none";
    const rest = this.group(id).filter((q) => q !== p);
    p.clip = null;
    if (rest.length === 1) (rest[0] as Paper).clip = null; // a group of one is no group
    return "ok";
  }
  /** The crew takes the sheets: they leave the desk. */
  handOver(ids: readonly string[]): void { for (const id of ids) { const p = this.byId.get(id); if (p && !isReference(p.kind)) p.place = "handed"; } }
  /** Takes a reference sheet out of the drawer (on top) or puts it back. Returns the new place. */
  toggleDrawer(id: string): Place | null {
    const p = this.byId.get(id);
    if (!p || !isReference(p.kind) || p.kind === "mission") return null;
    p.place = p.place === "desk" ? "drawer" : "desk";
    if (p.place === "desk") p.z = ++this.top;
    return p.place;
  }
  private clips = 0;

  private bounds(p: Paper): { minX: number; maxX: number; minY: number; maxY: number } {
    const { w } = SIZE[p.kind], a = DESK_AREA;
    return { minX: a.x - w + KEEP, maxX: a.x + a.w - KEEP, minY: a.y, maxY: a.y + a.h - KEEP }; // never under the boat banner
  }
  private clamp(p: Paper): void {
    const b = this.bounds(p);
    p.x = Math.min(b.maxX, Math.max(b.minX, p.x));
    p.y = Math.min(b.maxY, Math.max(b.minY, p.y));
  }

  // ---------------------------------------------------------------- persistence (desk.v1)

  serialize(seed: number, extra?: DeskExtra): string {
    return JSON.stringify({ v: 1, seed, ...(extra ? { mach: extra.mach, ration: extra.ration, gone: (extra.gone ?? []).slice(-60) } : {}), papers: this.list().map((p) => ({ id: p.id, x: p.x, y: p.y, z: p.z, face: p.face, place: p.place, clip: p.clip, stamps: p.stamps, signed: p.signed, ...(p.decoded ? { decoded: p.decoded } : {}) })) });
  }

  /** Applies a stored layout to sheets that exist now or appear later (positions are kept until the sheet is created). */
  restore(layout: StoredLayout): void {
    this.pending = new Map(layout.map((e) => [e.id, e]));
    for (const e of layout) { this.top = Math.max(this.top, e.z); if (e.clip !== null) this.clips = Math.max(this.clips, e.clip); }
    for (const p of this.byId.values()) this.applyPending(p);
  }
  /** True while the restored layout still holds an entry for a sheet that has not been created yet. */
  hasPending(id: string): boolean { return this.pending.has(id); }
  /** Call after ensure(): moves a sheet to its stored place if the saved layout had one. */
  applyPending(p: Paper): void {
    const e = this.pending.get(p.id);
    if (!e) return;
    this.pending.delete(p.id);
    p.x = e.x; p.y = e.y; p.z = e.z; p.face = e.face; p.place = e.place; p.clip = e.clip; p.stamps = [...e.stamps]; p.signed = e.signed; p.decoded = e.decoded;
    this.clamp(p);
  }
}

export interface StoredPaper {
  readonly id: string; readonly x: number; readonly y: number; readonly z: number; readonly face: Face;
  readonly place: Place; readonly clip: number | null; readonly stamps: readonly StampColor[]; readonly signed: boolean;
  readonly decoded: Decoded | null;
}
export type StoredLayout = readonly StoredPaper[];

export const DESK_KEY = "uboat-radio.desk.v1";

/** G2 additions to desk.v1 (optional fields: a v1 blob without them still loads, an older build ignores them). */
export interface DeskExtra { readonly mach: MachineState; readonly ration: RationState; readonly gone?: readonly string[] }
export const NOTE_KEY_RE = /^\d{1,7}:[A-Za-z]{3,10}$/; // a private note is "<tSec>:<topic>"; thrown-away notes are remembered so a reload does not bring them back
/** Validates the machine and ration parts of a stored blob (untrusted); wrong seed or any malformation gives the defaults. */
export function parseExtra(raw: string | null, seed: number): DeskExtra {
  const none: DeskExtra = { mach: MACHINE_DEFAULT, ration: RATION_EMPTY, gone: [] };
  if (raw === null || raw.length > 32_768) return none;
  let j: unknown;
  try { j = JSON.parse(raw); } catch { return none; }
  if (typeof j !== "object" || j === null || Array.isArray(j)) return none;
  const o = j as Record<string, unknown>;
  if (o["v"] !== 1 || o["seed"] !== seed) return none;
  let mach = MACHINE_DEFAULT;
  const m = o["mach"];
  if (typeof m === "object" && m !== null && !Array.isArray(m)) {
    const r = m as Record<string, unknown>;
    if (typeof r["power"] === "boolean" && typeof r["cover"] === "boolean" && isPositions(r["pos"])) {
      const pl = r["plugs"], plugs = Array.isArray(pl) && pl.every((x) => typeof x === "string") && validPlugboard(pl as string[]) ? (pl as string[]) : [];
      mach = { power: r["power"] && !r["cover"], cover: r["cover"], pos: r["pos"], plugs };
    }
  }
  const g = o["gone"];
  const gone = Array.isArray(g) ? g.filter((x): x is string => typeof x === "string" && NOTE_KEY_RE.test(x)).slice(-60) : [];
  return { mach, ration: parseRation(o["ration"]), gone };
}
const MAX_BYTES = 32_768, MAX_PAPERS = 400;
const ID_RE = /^(?:mission|orders|manual|(?:in|out):\d{1,6}:\d{1,3})$/;
const int = (x: unknown, lo: number, hi: number): number | null => (typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi ? x : null);

const WORD_RE = /^[A-Z0-9?]*$/;
/** Same bound as the copy editor (Store COPY_MAX): a decode can never hold more characters than the copy it came from. */
const COPY_CHARS = 400;
function parseDecoded(x: unknown): Decoded | null {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>, w = o["words"], b = o["bad"], d = int(o["damaged"], 0, COPY_CHARS);
  if (!Array.isArray(w) || !Array.isArray(b) || w.length > COPY_CHARS || b.length !== w.length || d === null) return null;
  if (!w.every((s) => typeof s === "string" && WORD_RE.test(s)) || !b.every((v) => typeof v === "boolean")) return null;
  if ((w as string[]).reduce((n, s) => n + s.length, 0) > COPY_CHARS) return null; // a missed group space gives one long word: allowed
  const mode = o["mode"] === undefined || o["mode"] === "plain" ? "plain" : o["mode"] === "copy" ? "copy" : null;
  if (mode === null) return null;
  return { mode, words: w as string[], bad: b as boolean[], damaged: d };
}

/** Validates a stored layout (untrusted). Wrong seed, bad JSON or oversize => empty; bad entries are dropped one by one. */
export function parseLayout(raw: string | null, seed: number): StoredLayout {
  if (raw === null || raw.length > MAX_BYTES) return [];
  let j: unknown;
  try { j = JSON.parse(raw); } catch { return []; }
  if (typeof j !== "object" || j === null || Array.isArray(j)) return [];
  const o = j as Record<string, unknown>;
  if (o["v"] !== 1 || o["seed"] !== seed || !Array.isArray(o["papers"])) return [];
  const out: StoredPaper[] = [];
  const seen = new Set<string>();
  for (const e of (o["papers"] as unknown[]).slice(0, MAX_PAPERS)) {
    if (typeof e !== "object" || e === null) continue;
    const r = e as Record<string, unknown>;
    const id = r["id"], x = int(r["x"], -200, 840), y = int(r["y"], -200, 560), z = int(r["z"], 0, 1_000_000);
    const face = r["face"] === "front" || r["face"] === "back" ? r["face"] : null;
    if (typeof id !== "string" || !ID_RE.test(id) || seen.has(id) || x === null || y === null || z === null || face === null) continue;
    // Stage 3 fields: absent in older layouts (defaults); present but malformed => the entry is dropped
    const place = r["place"] === undefined ? "desk" : r["place"] === "desk" || r["place"] === "handed" || r["place"] === "drawer" ? r["place"] : null;
    const clip = r["clip"] === undefined || r["clip"] === null ? null : int(r["clip"], 1, 1_000_000);
    const rawStamps = r["stamps"] === undefined ? [] : r["stamps"];
    const stamps = Array.isArray(rawStamps) && rawStamps.length <= STAMP_SLOTS && rawStamps.every((c) => c === "blue" || c === "red") ? (rawStamps as StampColor[]) : null;
    const signed = r["signed"] === undefined ? false : typeof r["signed"] === "boolean" ? r["signed"] : null;
    // decoded text is a cache of what the sheet showed: if it is malformed or on a non-Output, only the text is dropped
    const decoded = r["decoded"] === undefined || typeof id !== "string" || !id.startsWith("out:") ? null : parseDecoded(r["decoded"]);
    if (place === null || (r["clip"] !== undefined && r["clip"] !== null && clip === null) || stamps === null || signed === null) continue;
    const ref = id === "mission" || id === "orders" || id === "manual";
    if (ref && (stamps.length > 0 || signed || clip !== null || place === "handed")) continue;   // reference sheets carry no marks
    if (!ref && place === "drawer") continue;                                                   // message sheets never go in the drawer
    if (id === "mission" && place !== "desk") continue;
    seen.add(id);
    out.push({ id, x, y, z, face, place, clip, stamps, signed, decoded });
  }
  return out;
}
