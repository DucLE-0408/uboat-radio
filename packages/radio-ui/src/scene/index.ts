// P5 scene entry. Default UI since stage 5; the classic P4 panels stay available at ?ui=classic.
import type { Ctx } from "../ctx";
import { h } from "../dom";
import { HELP } from "../input/keymap";
import { mountAlerts } from "./alerts";
import { assetErrors, preloadSprites } from "./assets";
import { mountBoat } from "./boat";
import { makeDecor } from "./decor";
import { mountDrawers } from "./drawers";
import { mountEmergency } from "./emergency";
import { mountGauges } from "./frame";
import { mountMachine } from "./machine";
import { mountPortrait } from "./portrait";
import { computeScale, layoutMode, paint, type LayoutMode } from "./px";
import { mountReceiver } from "./receiver";
import { Reveal } from "./reveal";
import { createScope, type SceneCtx } from "./scope";
import { mountSecret } from "./secret";
import { mountSummary } from "./summary";
import { mountTelegram } from "./telegram";
import { mountToast } from "./toast";
import "./scene.css";

type Tab = "radio" | "machine" | "auth" | "sonar" | "log";

export function mountScene(base: Ctx, app: HTMLElement): { frame(): void; dispose(): void } {
  const scope = createScope(base);
  const ctx: SceneCtx = { ...base, scope, reveal: new Reveal() };
  const decor = makeDecor(base.cosmeticSeed);
  app.classList.add("p5");
  document.body.classList.add("p5"); // lets the page itself scroll on small screens (classic CSS pins body to 100% height)
  const scene = h("div", { class: "scene", attrs: { role: "main", "aria-label": "Radio room" } });
  app.append(scene);
  // Decide the layout while the scene is still empty: a desktop-sized scene would make mobile browsers widen their layout viewport.
  let mode: LayoutMode | "" = "";
  const applyLayout = (): boolean => {
    const next = layoutMode(window.innerWidth, window.innerHeight);
    const px = next === "desktop" ? computeScale(window.innerWidth, window.innerHeight) : 2;
    document.documentElement.style.setProperty("--px", String(px));
    if (next === mode) return false;
    mode = next;
    scene.classList.remove("l-desktop", "l-tablet", "l-mobile", "desk", "flow");
    scene.classList.add(`l-${next}`, next === "desktop" ? "desk" : "flow");
    scene.dataset["layout"] = next;
    return true;
  };
  applyLayout();
  scene.append(h("h2", { text: "U-Boat radio room" }));
  const bg = h("div", { class: "sc scenebg" }); bg.style.inset = "0"; scene.append(bg);
  paint(bg, "scene-bg");
  const noise = h("div", { class: "fx-noise", attrs: { "aria-hidden": "true" } }); // optional CRT layer (off by default)

  const boat = mountBoat(ctx, scene, decor);
  const portrait = mountPortrait(ctx, scene, decor);
  mountGauges(ctx, scene);
  const receiver = mountReceiver(ctx, scene);
  mountAlerts(ctx, scene);
  mountTelegram(ctx, scene);
  const secret = mountSecret(ctx, scene);
  const machine = mountMachine(ctx, scene);
  const toast = mountToast(ctx, scene);
  mountDrawers(ctx, scene);
  mountEmergency(ctx, scene, scene);
  mountSummary(ctx, scene);

  // navigation used by the touch layouts: tablet shows Table/Sonar/Log, mobile shows the full tab bar
  let tab: Tab = "radio";
  const nav = h("nav", { class: "scenenav", attrs: { "aria-label": "Stations" } });
  const tabs: [Tab, string, string][] = [["radio", "Radio", "Radio: telegram and transcription"], ["machine", "Keys", "Machine: keyboard"], ["auth", "Table", "Authentication table"], ["sonar", "Sonar", "Sonar and hydrophone"], ["log", "Log", "Event log"]];
  const navBtns = new Map<Tab, HTMLButtonElement>();
  for (const [id, label, aria] of tabs) {
    const b = h("button", { class: `ntab nt-${id}`, attrs: { type: "button", "aria-label": aria }, on: { click: () => go(id) } });
    b.textContent = label; nav.append(b); navBtns.set(id, b);
  }
  const syncTabUi = (): void => {
    const d = ctx.store.state.drawer;
    const cur: Tab = d !== null ? d : tab;
    scene.dataset["tab"] = cur;
    for (const [id, b] of navBtns) { b.setAttribute("aria-pressed", String(id === cur)); b.setAttribute("aria-current", id === cur ? "page" : "false"); }
  };
  const go = (t: Tab): void => {
    if (t === "auth") ctx.actions.openAuthTable();
    else if (t === "sonar" || t === "log") ctx.actions.openDrawer(t);
    else { tab = t; ctx.actions.closeDrawer(); }
    syncTabUi();
  };
  scope.on(["drawer"], syncTabUi);
  scene.append(nav, noise);

  const help = h("div", { class: "scene-help lbl" }, ...HELP.map((t) => h("div", { text: t })));
  app.append(help);

  const fit = (): void => {
    if (!applyLayout()) return;
    if (mode !== "mobile" && ctx.store.state.drawer === null) tab = "radio";
    boat.setStageClass(mode as LayoutMode);
    syncTabUi();
  };
  boat.setStageClass(mode as LayoutMode);
  syncTabUi();
  window.addEventListener("resize", fit);
  void preloadSprites().then((fails) => { for (const c of assetErrors) ctx.diag.err("asset", c); if (fails > 0) scene.classList.add("no-sprites"); });

  const dispose = (): void => {
    window.removeEventListener("resize", fit);
    machine.dispose();
    ctx.morse.stop();   // no tone left scheduled once the scene is gone
    scope.dispose();    // every store subscription registered through the scope
    app.classList.remove("p5"); document.body.classList.remove("p5");
    scene.remove(); help.remove();
  };
  return {
    frame: () => { const now = performance.now(); receiver.frame(now); secret.frame(now); machine.frame(now); boat.frame(now); portrait.frame(now); toast.frame(); },
    dispose,
  };
}
