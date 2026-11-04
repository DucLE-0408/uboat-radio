// Pixel-scale helpers. Vietnamese: toàn bộ kích thước scene tính theo đơn vị logic 640x360 nhân với --px (có thể lẻ, xem computeScale).
import { sprite } from "./assets";

export const SCENE_W = 640;
export const SCENE_H = 360;

/**
 * Scale that fits the whole 640x360 scene in the viewport (>= 1), rounded DOWN to 0.01 so it never overflows.
 * It is fractional on purpose: the game is played full screen or maximised, and an integer scale left half of a maximised
 * 1920x960 window empty (50% of the area). Sprites keep image-rendering: pixelated; the leftover margin is painted with the
 * scene's slate colour by fillWindow().
 */
export function computeScale(vw: number, vh: number): number {
  return Math.max(1, Math.floor(Math.min(vw / SCENE_W, vh / SCENE_H) * 100) / 100);
}

/** Fixed-frame layouts (desktop) fill the window and centre the scene; flow layouts (tablet, mobile) scroll as before. */
export function fillWindow(app: HTMLElement, on: boolean): void {
  app.classList.toggle("fill-window", on);
  document.documentElement.classList.toggle("fill-window", on);
}

export type LayoutMode = "desktop" | "tablet" | "mobile";

/**
 * desktop: the 640x360 scene at an integer scale >= 2 (needs >= 1280 px wide);
 * tablet: 768-1279 px (or a wide but short window): two columns of real-size controls + drawers;
 * mobile: < 768 px: one column with tabs. (R9)
 */
export function layoutMode(vw: number, vh: number): LayoutMode {
  if (vw >= 1280 && computeScale(vw, vh) >= 2) return "desktop";
  return vw >= 768 ? "tablet" : "mobile";
}

export const u = (n: number): string => `calc(var(--px) * ${n}px)`;

export function place(el: HTMLElement, x: number, y: number, w: number, h: number): void {
  el.dataset["p"] = "1"; // marks logical-px placement so flow layouts (tablet/mobile) can neutralise it
  const s = el.style;
  s.left = u(x); s.top = u(y); s.width = u(w); s.height = u(h);
}

/** Paint a sprite (or one frame of a sheet) as the element background; crisp nearest-neighbour scaling. */
export function paint(el: HTMLElement, id: string, frame = 0): void {
  const sp = sprite(id);
  const fw = sp.frames ? sp.frames.w : sp.w;
  const s = el.style;
  s.backgroundImage = `url("${sp.url}")`;
  s.backgroundSize = `${u(sp.w)} ${u(sp.h)}`;
  s.backgroundPosition = `${u(-frame * fw)} 0`;
  s.backgroundRepeat = "no-repeat";
}

export function setFrame(el: HTMLElement, id: string, frame: number): void {
  const sp = sprite(id);
  const fw = sp.frames ? sp.frames.w : sp.w;
  const v = `${u(-frame * fw)} 0`;
  if (el.style.backgroundPosition !== v) el.style.backgroundPosition = v;
}

/** 9-slice sprite states for buttons/keys: sets CSS vars consumed by .sbtn/.key.wide (up, pressed, disabled). */
export function sliceVars(el: HTMLElement, kind: "btn" | "keywide"): void {
  const up = sprite(kind === "btn" ? "btn-up" : "keywide-up").url, down = sprite(kind === "btn" ? "btn-down" : "keywide-down").url;
  const off = kind === "btn" ? sprite("btn-off").url : up;
  el.style.setProperty("--up", `url("${up}")`); el.style.setProperty("--down", `url("${down}")`); el.style.setProperty("--off", `url("${off}")`);
}
