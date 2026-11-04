// Paper layout model for the desk (R2). Pure: no DOM, no sim. Vietnamese: chỉ là trạng thái trình bày (vị trí, mặt, thứ tự);
// nội dung giấy luôn dẫn xuất từ store, quyết định luôn đi qua Actions.

export type PaperKind = "input" | "output" | "mission";
export type Face = "front" | "back";

export interface Paper {
  readonly id: string;          // "in:<rxId>:<attempt>", "out:<rxId>:<attempt>", "mission"
  readonly kind: PaperKind;
  readonly rxId: number | null;
  readonly attempt: number | null;
  x: number; y: number; z: number; // logical px on the 640x360 frame; z = stacking order
  face: Face;
}

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** Free area of the desk top where papers may lie (logical px). */
export const DESK_AREA: Rect = { x: 144, y: 104, w: 280, h: 248 };
export const SIZE: Readonly<Record<PaperKind, { readonly w: number; readonly h: number }>> = {
  input: { w: 112, h: 148 }, output: { w: 112, h: 148 }, mission: { w: 128, h: 70 },
};
/** Spawn points: new sheets cascade from here so a stack never hides a sheet completely (R2.5). */
const SPAWN: Readonly<Record<PaperKind, { readonly x: number; readonly y: number }>> = {
  input: { x: 262, y: 150 }, output: { x: 168, y: 176 }, mission: { x: 150, y: 112 },
};
const CASCADE = 8, CASCADE_STEPS = 6, COLUMN = 20, SPAWN_TRIES = 60;
/** A sheet may hang over the desk edge but always keeps this much on the desk, so it can be grabbed again. */
const KEEP = 24;

export const paperId = (kind: PaperKind, rxId: number | null, attempt: number | null): string =>
  kind === "mission" ? "mission" : `${kind === "input" ? "in" : "out"}:${rxId}:${attempt}`;

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
    const p: Paper = { id, kind, rxId, attempt, x: 0, y: 0, z: ++this.top, face: "front" };
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
  nudge(id: string, dx: number, dy: number): void { const p = this.byId.get(id); if (p) this.moveTo(id, p.x + dx, p.y + dy); }

  private clamp(p: Paper): void {
    const { w } = SIZE[p.kind], a = DESK_AREA;
    p.x = Math.min(a.x + a.w - KEEP, Math.max(a.x - w + KEEP, p.x));
    p.y = Math.min(a.y + a.h - KEEP, Math.max(a.y, p.y)); // never under the boat banner
  }

  // ---------------------------------------------------------------- persistence (desk.v1)

  serialize(seed: number): string {
    return JSON.stringify({ v: 1, seed, papers: this.list().map((p) => ({ id: p.id, x: p.x, y: p.y, z: p.z, face: p.face })) });
  }

  /** Applies a stored layout to sheets that exist now or appear later (positions are kept until the sheet is created). */
  restore(layout: StoredLayout): void {
    this.pending = new Map(layout.map((e) => [e.id, e]));
    for (const e of layout) this.top = Math.max(this.top, e.z);
    for (const p of this.byId.values()) this.applyPending(p);
  }
  /** Call after ensure(): moves a sheet to its stored place if the saved layout had one. */
  applyPending(p: Paper): void {
    const e = this.pending.get(p.id);
    if (!e) return;
    this.pending.delete(p.id);
    p.x = e.x; p.y = e.y; p.z = e.z; p.face = e.face;
    this.clamp(p);
  }
}

export interface StoredPaper { readonly id: string; readonly x: number; readonly y: number; readonly z: number; readonly face: Face }
export type StoredLayout = readonly StoredPaper[];

export const DESK_KEY = "uboat-radio.desk.v1";
const MAX_BYTES = 32_768, MAX_PAPERS = 400;
const ID_RE = /^(?:mission|(?:in|out):\d{1,6}:\d{1,3})$/;
const int = (x: unknown, lo: number, hi: number): number | null => (typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi ? x : null);

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
    seen.add(id);
    out.push({ id, x, y, z, face });
  }
  return out;
}
