// Local sprite registry built from assets/manifest.json. Asset failures are recorded as short codes (no content).
import manifest from "../../assets/manifest.json";

export interface SpriteInfo { readonly id: string; readonly url: string; readonly w: number; readonly h: number; readonly frames: { readonly w: number; readonly h: number; readonly count: number } | null }

const urls = import.meta.glob("../../assets/sprites/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const byId = new Map<string, SpriteInfo>();
for (const e of manifest.sprites) {
  const url = urls[`../../assets/${e.path}`];
  if (url !== undefined) byId.set(e.id, { id: e.id, url, w: e.width, h: e.height, frames: e.frames });
}

/** Codes such as "ASSET_LOAD:machine"; consumed by diagnostics (stage 3). */
export const assetErrors: string[] = [];

export function sprite(id: string): SpriteInfo {
  const s = byId.get(id);
  if (!s) { if (!assetErrors.includes(`ASSET_MISSING:${id}`)) assetErrors.push(`ASSET_MISSING:${id}`); return { id, url: "", w: 1, h: 1, frames: null }; }
  return s;
}

/** Preload every sprite; resolves with the number of failures (0 = all good). */
export function preloadSprites(): Promise<number> {
  const jobs = [...byId.values()].map((s) => new Promise<void>((res) => {
    const img = new Image();
    img.onload = () => res();
    img.onerror = () => { assetErrors.push(`ASSET_LOAD:${s.id}`); res(); };
    img.src = s.url;
  }));
  return Promise.all(jobs).then(() => assetErrors.length);
}
