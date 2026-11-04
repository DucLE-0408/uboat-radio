// Minimal deterministic pixel canvas + PNG encoder (Node built-ins only). Tool-local PRNG: art never shares randomness with the sim.
import { deflateSync } from "node:zlib";

export type RGBA = readonly [number, number, number, number];

export const rgb = (h: string, a = 255): RGBA => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
export const CLEAR: RGBA = [0, 0, 0, 0];

/** mulberry32: tool-local PRNG (art only, never shares state with the sim). */
export function artRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither threshold in [0,1). */
export const bayer = (x: number, y: number): number => ((BAYER[((y & 3) << 2) | (x & 3)] as number) + 0.5) / 16;

export class Img {
  readonly d: Uint8Array;
  readonly w: number;
  readonly h: number;
  constructor(w: number, h: number) { this.w = w; this.h = h; this.d = new Uint8Array(w * h * 4); }

  set(x: number, y: number, c: RGBA): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c[3];
  }
  get(x: number, y: number): RGBA {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return CLEAR;
    const i = (y * this.w + x) * 4;
    return [this.d[i] as number, this.d[i + 1] as number, this.d[i + 2] as number, this.d[i + 3] as number];
  }
  rect(x: number, y: number, w: number, h: number, c: RGBA): void { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  hline(x: number, y: number, w: number, c: RGBA): void { for (let i = 0; i < w; i++) this.set(x + i, y, c); }
  vline(x: number, y: number, h: number, c: RGBA): void { for (let j = 0; j < h; j++) this.set(x, y + j, c); }
  frame(x: number, y: number, w: number, h: number, c: RGBA): void { this.hline(x, y, w, c); this.hline(x, y + h - 1, w, c); this.vline(x, y, h, c); this.vline(x + w - 1, y, h, c); }
  line(x0: number, y0: number, x1: number, y1: number, c: RGBA): void {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.25) + (y * y) / (ry * ry + 0.25) <= 1) this.set(cx + x, cy + y, c);
  }
  /** Dither `b` over `a` only inside an ellipse; optional light direction bias (x,y in -1..1) for form shading. */
  shadeEllipse(cx: number, cy: number, rx: number, ry: number, a: RGBA, b: RGBA, lx: number, ly: number): void {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x * x) / (rx * rx + 0.25) + (y * y) / (ry * ry + 0.25);
      if (d > 1) continue;
      const lit = (x / rx) * lx + (y / ry) * ly; // >0 toward the light
      this.set(cx + x, cy + y, bayer(cx + x, cy + y) < Math.min(1, Math.max(0, 0.5 - lit * 0.6 + d * 0.25)) ? b : a);
    }
  }
  blit(src: Img, x: number, y: number): void {
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const c = src.get(i, j); if (c[3] > 0) this.set(x + i, y + j, c); }
  }
  /** Vertical gradient between two colours using ordered dither (pixel-art look, no blending). */
  vgrad(x: number, y: number, w: number, h: number, top: RGBA, bottom: RGBA): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, bayer(x + i, y + j) < j / Math.max(1, h - 1) ? bottom : top);
  }
  /** Fill with `a`, sprinkle `b` where dither threshold < level. */
  dither(x: number, y: number, w: number, h: number, a: RGBA, b: RGBA, level: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, bayer(x + i, y + j) < level ? b : a);
  }
  /** Raised (or sunken) bevelled box. */
  bevel(x: number, y: number, w: number, h: number, light: RGBA, mid: RGBA, dark: RGBA, sunken = false): void {
    const [tl, br] = sunken ? [dark, light] : [light, dark];
    this.rect(x, y, w, h, mid);
    this.hline(x, y, w, tl); this.vline(x, y, h, tl);
    this.hline(x, y + h - 1, w, br); this.vline(x + w - 1, y, h, br);
  }
  rivet(x: number, y: number, hi: RGBA, lo: RGBA): void { this.set(x, y, hi); this.set(x + 1, y, hi); this.set(x, y + 1, hi); this.set(x + 1, y + 1, lo); }
  /** Scatter 1px wear marks. */
  wear(rng: () => number, x: number, y: number, w: number, h: number, c: RGBA, n: number): void { for (let k = 0; k < n; k++) this.set(x + Math.floor(rng() * w), y + Math.floor(rng() * h), c); }
  scratches(rng: () => number, x: number, y: number, w: number, h: number, c: RGBA, n: number): void {
    for (let k = 0; k < n; k++) { const sx = x + Math.floor(rng() * w), sy = y + Math.floor(rng() * h); this.hline(sx, sy, 2 + Math.floor(rng() * 5), c); }
  }
  /** Hand-authored stamp: one char per pixel, looked up in `map`; '.' and ' ' stay transparent. */
  stamp(x: number, y: number, rows: readonly string[], map: Readonly<Record<string, RGBA>>): void {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = map[row[i] as string]; if (c) this.set(x + i, y + j, c); } });
  }
  /** Mirror of stamp(): same rows flipped left-right (symmetric parts drawn once). */
  stampFlip(x: number, y: number, rows: readonly string[], map: Readonly<Record<string, RGBA>>): void {
    this.stamp(x, y, rows.map((r) => [...r].reverse().join("")), map);
  }
  /**
   * Banded form shading: `light(x,y)` returns null (outside the shape) or a value in 0..1, quantised onto `ramp`
   * (dark -> light). No dither: flat clusters, the way hand-placed pixel art reads.
   */
  shade(x0: number, y0: number, w: number, h: number, light: (x: number, y: number) => number | null, ramp: readonly RGBA[]): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const v = light(x, y);
      if (v === null) continue;
      const k = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)));
      this.set(x, y, ramp[k] as RGBA);
    }
  }
  /** Alpha-composite `c` over the existing pixel (used for tinted light and translucent overlays). */
  tint(x: number, y: number, c: RGBA): void {
    const o = this.get(x, y), a = c[3] / 255;
    if (o[3] === 0) { this.set(x, y, c); return; }
    this.set(x, y, [Math.round(o[0] + (c[0] - o[0]) * a), Math.round(o[1] + (c[1] - o[1]) * a), Math.round(o[2] + (c[2] - o[2]) * a), o[3]]);
  }
  /** Rounded rectangle (corner radius in px, 1-3 look right at this scale). */
  rrect(x: number, y: number, w: number, h: number, r: number, c: RGBA): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const cx = i < r ? r - i : i >= w - r ? i - (w - r - 1) : 0, cy = j < r ? r - j : j >= h - r ? j - (h - r - 1) : 0;
      if (cx * cx + cy * cy <= r * r + 0.5) this.set(x + i, y + j, c);
    }
  }
  /** 1px outline in `c` around every opaque pixel, drawn only on transparent pixels. */
  outline(c: RGBA): void {
    const solid = (x: number, y: number): boolean => this.get(x, y)[3] > 0;
    const pts: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) pts.push([x, y]);
    for (const [x, y] of pts) this.set(x, y, c);
  }
  pixelBytes(): Uint8Array { return this.d; }
}

/** Nearest-neighbour integer upscale (pixel art stays crisp). */
export function scaleNearest(src: Img, k: number): Img {
  const out = new Img(src.w * k, src.h * k);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.set(x, y, src.get(Math.floor(x / k), Math.floor(y / k)));
  return out;
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b: Uint8Array): number => { let c = 0xffffffff; for (const v of b) c = (CRC[(c ^ v) & 255] as number) ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Encode RGBA8 PNG (filter 0, zlib level 9). */
export function encodePng(img: Img): Uint8Array {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, img.w); dv.setUint32(4, img.h);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = new Uint8Array((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) raw.set(img.d.subarray(y * img.w * 4, (y + 1) * img.w * 4), y * (img.w * 4 + 1) + 1);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
