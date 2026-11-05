// Helm screen (G5): chart, compass, wheel, speed and depth controls, taken off the radio desk. Presentation only: the position it
// shows is the navigator's ESTIMATE (Watch.navFix), steering goes through the existing Actions (D3: no true position, no enemy).
import { BALANCE, coastKm, posToGrid } from "@uboat/sim-core";
import type { Ctx } from "../ctx";
import { h, setClass, setText } from "../dom";
import { t } from "../i18n";
import { place } from "../scene/px";
import { formatClock } from "../store";

const NS = "http://www.w3.org/2000/svg";
const sv = (tag: string, attrs: Record<string, string | number> = {}, text?: string): SVGElement => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Visible width of the chart in km for the three zoom levels: local (10 km grid), regional (90 km cells), the whole map. */
export const ZOOM_KM = [60, 600, 2340] as const;
const CW = 348, CH = 296, WORLD = BALANCE.world.cols * BALANCE.world.cellKm, CELL = BALANCE.world.cellKm;
const TRAIL_MAX = 200, TRAIL_EVERY_SEC = 5;

/** Smallest signed difference b - a in degrees, in (-180, 180]. */
/** Half the chart height in km at a given width. */
const halfH0 = (w: number): number => (CH / CW) * w / 2;
export const angDelta = (a: number, b: number): number => { const d = (((b - a) % 360) + 540) % 360 - 180; return d === -180 ? 180 : d; };
/** Compass bearing (0 = north, clockwise) from one point to another in km. */
export const bearingTo = (from: { x: number; y: number }, to: { x: number; y: number }): number => ((Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI + 360) % 360;

export interface HelmItem { readonly kind: "safeCoords" | "resupply"; readonly n: number; readonly xKm: number; readonly yKm: number; readonly lost?: boolean }
export interface HelmDeps {
  readonly ctx: Ctx;
  readonly root: HTMLElement;
  /** Chart on or off (the `map` module); the compass and wheel always work. */
  readonly mapOn: boolean;
  /** Safe-water and resupply points still on the Daily Orders (offsets from the watch origin, in km). */
  readonly items: () => readonly HelmItem[];
}
export interface Helm { open(): void; close(): void; toggle(): void; isOpen(): boolean; frame(now: number): void; dispose(): void }

export function mountHelm(d: HelmDeps): Helm {
  const { ctx } = d, { store, watch, actions } = ctx;
  const el = h("section", { class: "sc dhelm", attrs: { "aria-label": t("desk.helm.title"), role: "dialog" } }); place(el, 0, 0, 640, 360); el.hidden = true;
  d.root.append(el);

  // ---- chart
  const chartBox = h("div", { class: "sc dchart" }); place(chartBox, 8, 8, CW, CH);
  const svg = sv("svg", { viewBox: `0 0 ${CW} ${CH}`, width: "100%", height: "100%", role: "img", "aria-label": t("desk.helm.chart"), tabindex: 0 }) as SVGSVGElement;
  chartBox.append(svg as unknown as Node);
  let zoom = 0;
  const zoomBtn = h("button", { class: "dkey dhbtn", attrs: { type: "button" }, text: "" }); place(zoomBtn, 8, 308, 88, 14);
  const recenter = { x: 0, y: 0, k: 1, cx: 0, cy: 0 }; // last transform, to turn a click into a position
  const trail: { x: number; y: number }[] = [];
  let lastTrailT = -1e9, lastDraw = 0;
  const fix = (): { x: number; y: number; err: number; hdg: number } => { const f = watch.navFix(); return { x: f.xKm, y: f.yKm, err: f.errKm, hdg: f.headingDeg }; };

  const draw = (): void => {
    const f = fix(), w = ZOOM_KM[zoom] as number;
    const cx = zoom === 2 ? WORLD / 2 : f.x, cy = zoom === 2 ? WORLD / 2 : f.y, k = CW / w;
    const X = (x: number): number => CW / 2 + (x - cx) * k, Y = (y: number): number => CH / 2 - (y - cy) * k;
    recenter.k = k; recenter.cx = cx; recenter.cy = cy;
    const kids: SVGElement[] = [sv("rect", { x: 0, y: 0, width: CW, height: CH, fill: "#0e2a3a" })];
    const landX0 = (BALANCE.world.cols - BALANCE.world.landCols.length) * CELL; // land cells are the last columns
    kids.push(sv("rect", { x: X(landX0), y: Y(WORLD), width: Math.max(0, (WORLD - landX0) * k), height: WORLD * k, fill: "#3b4a35", opacity: 0.9 }));
    if (zoom < 2 && watch.chartDepth(0, 0) !== null) { // surveyed depth: shallower water is paler; shoals are ringed and labelled with their least depth
      const n = 18, cell = w / n, rows = Math.ceil((CH / CW) * n) + 1;
      for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
        const mx = cx - w / 2 + (i + 0.5) * cell, my = cy - halfH0(w) + (j + 0.5) * cell, dep = watch.chartDepth(mx, my);
        if (dep !== null && dep < 150 && mx < coastKm()) kids.push(sv("rect", { x: X(mx - cell / 2), y: Y(my + cell / 2), width: cell * k + 0.5, height: cell * k + 0.5, fill: "#9fd3e6", opacity: ((150 - dep) / 150) * 0.32 }));
      }
      for (const sh of watch.chartShoals()) {
        const sx = X(sh.xKm), sy = Y(sh.yKm), least = watch.chartDepth(sh.xKm, sh.yKm);
        if (sx < -20 || sx > CW + 20 || sy < -20 || sy > CH + 20) continue;
        kids.push(sv("circle", { cx: sx, cy: sy, r: Math.max(2, sh.radiusKm * k), fill: "none", stroke: "#d9b878", "stroke-width": 0.6, "stroke-dasharray": "3 2" }), sv("text", { x: sx, y: sy + 2, "text-anchor": "middle", "font-size": 7, fill: "#d9b878" }, `${least ?? "?"}m`));
      }
    }
    const nearCoast = coastKm() - f.x <= BALANCE.coast.warnKm || store.state.tSec - store.state.coastWarnAt < 120; // the estimate says so, or the sim warned just now
    kids.push(sv("line", { x1: X(landX0), y1: Y(WORLD), x2: X(landX0), y2: Y(0), stroke: nearCoast ? "#e06a72" : "#7d8f6a", "stroke-width": nearCoast ? 1.6 : 1 }));
    const step = zoom === 0 ? CELL / 9 : CELL, halfH = halfH0(w);
    const gx0 = Math.max(0, Math.floor((cx - w / 2) / step)), gx1 = Math.min(WORLD / step, Math.ceil((cx + w / 2) / step));
    const gy0 = Math.max(0, Math.floor((cy - halfH) / step)), gy1 = Math.min(WORLD / step, Math.ceil((cy + halfH) / step));
    for (let i = gx0; i <= gx1; i++) kids.push(sv("line", { x1: X(i * step), y1: Y(gy0 * step), x2: X(i * step), y2: Y(gy1 * step), stroke: "#2c5568", "stroke-width": 0.5 }));
    for (let j = gy0; j <= gy1; j++) kids.push(sv("line", { x1: X(gx0 * step), y1: Y(j * step), x2: X(gx1 * step), y2: Y(j * step), stroke: "#2c5568", "stroke-width": 0.5 }));
    for (let i = gx0; i < gx1 && zoom < 2; i++) for (let j = gy0; j < gy1; j++) { // cell labels at the centres (world reference `AB12` at the local level)
      const mx = (i + 0.5) * step, my = (j + 0.5) * step;
      const lab = zoom === 0 ? posToGrid({ x: mx, y: my }) : String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
      if (lab !== null) kids.push(sv("text", { x: X(mx), y: Y(my) + 2, "text-anchor": "middle", "font-size": zoom === 0 ? 6 : 8, fill: "#4f7d92" }, lab));
    }
    if (zoom === 2) {
      for (let i = 0; i < BALANCE.world.cols; i++) kids.push(sv("text", { x: X((i + 0.5) * CELL), y: 8, "text-anchor": "middle", "font-size": 7, fill: "#6f9bb0" }, String.fromCharCode(65 + i)));
      for (let j = 0; j < BALANCE.world.rows; j++) kids.push(sv("text", { x: 3, y: Y((j + 0.5) * CELL) + 2, "font-size": 7, fill: "#6f9bb0" }, String.fromCharCode(65 + j)));
    }
    const o = watch.originKm();
    for (const it of d.items()) {
      const px = X(o.x + it.xKm), py = Y(o.y + it.yKm), safe = it.kind === "safeCoords";
      kids.push(sv("rect", { x: px - 3, y: py - 3, width: 6, height: 6, fill: safe ? "#6fbf8a" : "#d9b878" }), sv("text", { x: px + 5, y: py + 2, "font-size": 7, fill: safe ? "#6fbf8a" : "#d9b878" }, `${safe ? "S" : "R"}${it.n}`));
    }
    if (trail.length > 1) kids.push(sv("polyline", { points: trail.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" "), fill: "none", stroke: "#9fd3e6", "stroke-width": 0.8, opacity: 0.7 }));
    const ord = store.state.moveOrder;
    if (ord !== null) {
      const c = parseGrid(ord.grid);
      if (c !== null) {
        const tx = X(c.x), ty = Y(c.y);
        kids.push(sv("line", { x1: X(f.x), y1: Y(f.y), x2: tx, y2: ty, stroke: "#e06a72", "stroke-width": 0.8, "stroke-dasharray": "3 2" }),
          sv("path", { d: `M${tx},${ty - 5} L${tx + 5},${ty} L${tx},${ty + 5} L${tx - 5},${ty} Z`, fill: "none", stroke: "#e06a72", "stroke-width": 1.2 }),
          sv("circle", { cx: tx, cy: ty, r: Math.max(2, BALANCE.move.arriveKm * k), fill: "none", stroke: "#e06a72", "stroke-width": 0.5, opacity: 0.6 }),
          sv("text", { x: tx + 7, y: ty - 4, "font-size": 7, fill: "#e06a72" }, `${ord.grid} · ${formatClock(Math.max(0, ord.deadlineAt - store.state.tSec))}`));
      }
    }
    const bx = X(f.x), by = Y(f.y);
    kids.push(sv("circle", { cx: bx, cy: by, r: Math.max(3, f.err * k), fill: "#9fd3e6", opacity: 0.12, stroke: "#9fd3e6", "stroke-width": 0.5, "stroke-dasharray": "2 2" }),
      sv("path", { d: "M0,-7 L4,5 L0,3 L-4,5 Z", fill: "#f3dfe1", transform: `translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${f.hdg.toFixed(1)})` }));
    svg.replaceChildren(...(kids as unknown as Node[]));
    const grid = posToGrid({ x: f.x, y: f.y });
    const toCoast = coastKm() - f.x;
    setText(posTxt, `${t("desk.helm.est")} ${grid ?? "—"} · ±${f.err.toFixed(1)} km${toCoast < 200 ? ` · ${t("desk.helm.coast", { km: Math.max(0, toCoast).toFixed(0) })}` : ""}`);
    setText(zoomBtn, t("desk.helm.zoom", { km: String(ZOOM_KM[zoom]) }));
  };
  svg.addEventListener("click", (ev) => {
    const r = (svg as unknown as Element).getBoundingClientRect();
    if (r.width === 0) return;
    const px = ((ev.clientX - r.left) / r.width) * CW, py = ((ev.clientY - r.top) / r.height) * CH;
    const x = recenter.cx + (px - CW / 2) / recenter.k, y = recenter.cy - (py - CH / 2) / recenter.k, f = fix();
    steerTo(bearingTo({ x: f.x, y: f.y }, { x, y })); // a click orders the course to that point; no autopilot
  });
  zoomBtn.addEventListener("click", () => { zoom = (zoom + 1) % ZOOM_KM.length; draw(); });
  const posTxt = h("div", { class: "dhtxt typ" }); place(posTxt, 100, 308, 268, 14);

  // ---- compass
  const compass = sv("svg", { viewBox: "-60 -60 120 120", width: "100%", height: "100%", role: "img", "aria-label": t("desk.helm.compass") }) as SVGSVGElement;
  const card = sv("g"), ordMark = sv("path", { d: "M-3,-55 L3,-55 L0,-46 Z", fill: "#e06a72" });
  for (let a = 0; a < 360; a += 10) {
    const long = a % 30 === 0, r1 = long ? 40 : 44, r2 = 50, rad = (a * Math.PI) / 180;
    card.append(sv("line", { x1: Math.sin(rad) * r1, y1: -Math.cos(rad) * r1, x2: Math.sin(rad) * r2, y2: -Math.cos(rad) * r2, stroke: "#c9bfc4", "stroke-width": long ? 1.2 : 0.6 }));
    if (long) { const lab = a === 0 ? "N" : a === 90 ? "E" : a === 180 ? "S" : a === 270 ? "W" : String(a / 10); card.append(sv("text", { x: Math.sin(rad) * 31, y: -Math.cos(rad) * 31 + 3, "text-anchor": "middle", "font-size": a % 90 === 0 ? 11 : 7, fill: a === 0 ? "#e06a72" : "#e6d8d4" }, lab)); }
  }
  card.append(ordMark);
  compass.append(sv("circle", { r: 54, fill: "#14181a", stroke: "#4a5251", "stroke-width": 1.5 }) as unknown as Node, card as unknown as Node, sv("path", { d: "M0,-58 L4,-50 L-4,-50 Z", fill: "#f0b85a" }) as unknown as Node);
  const compassBox = h("div", { class: "sc dcompass" }); place(compassBox, 380, 8, 120, 120); compassBox.append(compass as unknown as Node);

  // ---- wheel (drag to put the rudder over; it returns amidships as the boat comes round)
  const wheel = sv("svg", { viewBox: "-50 -50 100 100", width: "100%", height: "100%", role: "slider", tabindex: 0, "aria-label": t("desk.helm.wheel"), "aria-valuemin": -90, "aria-valuemax": 90, "aria-valuenow": 0 }) as SVGSVGElement;
  const spokes = sv("g");
  for (let a = 0; a < 360; a += 45) { const rad = (a * Math.PI) / 180; spokes.append(sv("line", { x1: 0, y1: 0, x2: Math.sin(rad) * 44, y2: -Math.cos(rad) * 44, stroke: "#b98a4a", "stroke-width": 3, "stroke-linecap": "round" })); spokes.append(sv("circle", { cx: Math.sin(rad) * 46, cy: -Math.cos(rad) * 46, r: 2.6, fill: "#d9b878" })); }
  spokes.append(sv("circle", { r: 36, fill: "none", stroke: "#8a6a3a", "stroke-width": 4 }), sv("circle", { r: 7, fill: "#d9b878" }));
  wheel.append(sv("circle", { r: 49, fill: "#14181a" }) as unknown as Node, spokes as unknown as Node, sv("path", { d: "M0,-50 L3,-45 L-3,-45 Z", fill: "#f0b85a" }) as unknown as Node);
  const wheelBox = h("div", { class: "sc dwheel" }); place(wheelBox, 380, 136, 120, 120); wheelBox.append(wheel as unknown as Node);

  // ---- state and steering
  let ordered = store.state.boat.headingDeg, lastSend = 0;
  const steerTo = (hdg: number, force = false): void => {
    ordered = ((hdg % 360) + 360) % 360;
    const now = performance.now();
    if (!force && now - lastSend < 120) return;
    lastSend = now;
    const dlt = angDelta(store.state.boat.headingDeg, ordered);
    if (Math.abs(dlt) >= 0.5) actions.steerHeading(dlt);
    draw();
  };
  const wheelAngle = (ev: PointerEvent): number => { const r = (wheel as unknown as Element).getBoundingClientRect(); return Math.max(-90, Math.min(90, (Math.atan2(ev.clientX - (r.left + r.width / 2), -(ev.clientY - (r.top + r.height / 2))) * 180) / Math.PI)); };
  let dragging = false;
  (wheel as unknown as Element).addEventListener("pointerdown", (ev) => { dragging = true; ((wheel as unknown as Element) as Element & { setPointerCapture(id: number): void }).setPointerCapture((ev as PointerEvent).pointerId); steerTo(store.state.boat.headingDeg + wheelAngle(ev as PointerEvent)); });
  (wheel as unknown as Element).addEventListener("pointermove", (ev) => { if (dragging) steerTo(store.state.boat.headingDeg + wheelAngle(ev as PointerEvent)); });
  const endDrag = (): void => { dragging = false; };
  (wheel as unknown as Element).addEventListener("pointerup", endDrag); (wheel as unknown as Element).addEventListener("pointercancel", endDrag);
  (wheel as unknown as Element).addEventListener("keydown", (ev) => {
    const e = ev as KeyboardEvent, step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft") { steerTo(ordered - step, true); e.preventDefault(); } else if (e.key === "ArrowRight") { steerTo(ordered + step, true); e.preventDefault(); }
  });
  const nudge = (label: string, dlt: number, x: number): HTMLElement => { const b = h("button", { class: "dkey dhbtn", attrs: { type: "button", "aria-label": t("desk.helm.turn", { n: label }) }, text: label }); place(b, x, 262, 28, 14); b.addEventListener("click", () => steerTo(ordered + dlt, true)); return b; };

  // ---- speed and depth
  const slower = h("button", { class: "dkey dhbtn", attrs: { type: "button", "aria-label": t("desk.ctl.slower") }, text: "−" }); place(slower, 512, 40, 20, 14);
  const faster = h("button", { class: "dkey dhbtn", attrs: { type: "button", "aria-label": t("desk.ctl.faster") }, text: "+" }); place(faster, 596, 40, 20, 14);
  slower.addEventListener("click", () => actions.steerSpeed(-1)); faster.addEventListener("click", () => actions.steerSpeed(1));
  const spd = h("div", { class: "dhtxt typ" }); place(spd, 536, 42, 56, 12);
  const modes = (["surface", "periscope", "dive"] as const).map((m, i) => { const b = h("button", { class: "dkey dhbtn", attrs: { type: "button", "aria-pressed": "false" }, text: t(`desk.helm.mode.${m}`) }); place(b, 512, 76 + i * 20, 104, 16); b.addEventListener("click", () => actions.setMode(m)); return { m, b }; });
  const readout = h("div", { class: "dhtxt typ dhread" }); place(readout, 512, 144, 120, 80);
  const orderTxt = h("div", { class: "dhtxt typ dhorder" }); place(orderTxt, 8, 326, 624, 28);
  const closeBtn = h("button", { class: "dkey dhbtn dhclose", attrs: { type: "button" }, text: t("desk.helm.close") }); place(closeBtn, 560, 332, 72, 20);
  closeBtn.addEventListener("click", () => api.close());
  el.append(chartBox, zoomBtn, posTxt, compassBox, wheelBox, nudge("−10°", -10, 380), nudge("−1°", -1, 410), nudge("+1°", 1, 440), nudge("+10°", 10, 470),
    slower, spd, faster, ...modes.map((x) => x.b), readout, orderTxt, closeBtn);
  chartBox.hidden = !d.mapOn; zoomBtn.hidden = !d.mapOn; posTxt.hidden = !d.mapOn;

  const update = (): void => {
    const f0 = fix();
    const b = store.state.boat, diff = angDelta(b.headingDeg, ordered);
    if (!dragging && Math.abs(diff) < 0.6) ordered = b.headingDeg; // back on course: rudder amidships
    const wa = Math.max(-90, Math.min(90, angDelta(b.headingDeg, ordered)));
    spokes.setAttribute("transform", `rotate(${wa.toFixed(1)})`); wheel.setAttribute("aria-valuenow", String(Math.round(wa)));
    card.setAttribute("transform", `rotate(${(-b.headingDeg).toFixed(1)})`);
    ordMark.setAttribute("transform", `rotate(${ordered.toFixed(1)})`);
    setText(spd, t("desk.ctl.kn", { n: b.speedKn.toFixed(1) }));
    const est = watch.chartDepth(f0.x, f0.y);
    for (const x of modes) {
      x.b.setAttribute("aria-pressed", String(b.mode === x.m)); setClass(x.b, "on", b.mode === x.m);
      const need = x.m === "surface" || est === null ? 0 : (x.m === "periscope" ? BALANCE.boat.periscopeDepthM : BALANCE.boat.diveDepthM) + BALANCE.seabed.clearanceM;
      (x.b as HTMLButtonElement).disabled = est !== null && est < need; // the chart says the water is too shallow to go there
      x.b.title = (x.b as HTMLButtonElement).disabled ? t("desk.helm.tooShallow", { m: String(need) }) : "";
    }
    const seabedM = watch.chartDepth(f0.x, f0.y);
    setText(readout, `${t("desk.helm.hdg")} ${String(Math.round(b.headingDeg)).padStart(3, "0")}°\n${t("desk.helm.ord")} ${String(Math.round(ordered)).padStart(3, "0")}°\n${t("desk.helm.depth")} ${Math.round(b.depthM)} m${seabedM === null ? "" : `\n${t("desk.helm.seabed")} ~${seabedM} m\n${t("desk.helm.keel")} ~${Math.max(0, seabedM - Math.round(b.depthM))} m`}`);
    const ord = store.state.moveOrder, f = fix();
    if (ord === null) setText(orderTxt, t("desk.helm.noOrder"));
    else { const c = parseGrid(ord.grid); const dist = c === null ? 0 : Math.hypot(c.x - f.x, c.y - f.y), brg = c === null ? 0 : bearingTo({ x: f.x, y: f.y }, c);
      setText(orderTxt, t("desk.helm.order", { grid: ord.grid, dist: dist.toFixed(1), brg: String(Math.round(brg)).padStart(3, "0"), left: formatClock(Math.max(0, ord.deadlineAt - store.state.tSec)) })); }
  };

  const api: Helm = {
    open: () => { el.hidden = false; ordered = store.state.boat.headingDeg; update(); if (d.mapOn) draw(); (wheel as unknown as HTMLElement).focus?.(); },
    close: () => { el.hidden = true; },
    toggle: () => { if (el.hidden) api.open(); else api.close(); },
    isOpen: () => !el.hidden,
    frame: (now) => {
      const t0 = store.state.tSec;
      if (t0 - lastTrailT >= TRAIL_EVERY_SEC) { lastTrailT = t0; const f = fix(); trail.push({ x: f.x, y: f.y }); if (trail.length > TRAIL_MAX) trail.shift(); } // the track the navigator has plotted
      if (el.hidden || now - lastDraw < 250) return;
      lastDraw = now; update(); if (d.mapOn) draw();
    },
    dispose: () => { el.remove(); },
  };
  return api;
}

/** World position (km) of the centre of a cell reference such as `AB35`; null when it is not one. */
export function parseGrid(g: string): { x: number; y: number } | null {
  const m = /^([A-Z])([A-Z])([1-9])([1-9])$/.exec(g);
  if (!m) return null;
  const sub = CELL / 9;
  return { x: ((m[1] as string).charCodeAt(0) - 65) * CELL + (Number(m[3]) - 0.5) * sub, y: ((m[2] as string).charCodeAt(0) - 65) * CELL + (Number(m[4]) - 0.5) * sub };
}
