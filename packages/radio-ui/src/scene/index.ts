// P5 scene entry (?ui=p5 while the classic UI is still the default; the default flips in stage 5).
import type { Ctx } from "../ctx";
import { h } from "../dom";
import { HELP } from "../input/keymap";
import { mountSummary } from "../panels/summary";
import { assetErrors, preloadSprites } from "./assets";
import { mountToast } from "./toast";
import { mountFrame } from "./frame";
import { mountMachine } from "./machine";
import { computeScale, paint } from "./px";
import { mountSecret } from "./secret";
import { mountTelegram } from "./telegram";
import "./scene.css";

export function mountScene(ctx: Ctx, app: HTMLElement): { frame(): void; dispose(): void } {
  app.classList.add("p5");
  const scene = h("div", { class: "scene", attrs: { role: "main", "aria-label": "Radio room" } });
  scene.append(h("h2", { text: "U-Boat radio room" }));
  const bg = h("div", { class: "sc" }); bg.style.inset = "0"; scene.append(bg);
  paint(bg, "scene-bg");
  const noise = h("div", { class: "fx-noise", attrs: { "aria-hidden": "true" } }); // optional CRT layer (off by default)

  mountFrame(ctx, scene);
  mountTelegram(ctx, scene);
  mountSecret(ctx, scene);
  const disposeMachine = mountMachine(ctx, scene);
  const toast = mountToast(ctx, scene);
  scene.append(noise);

  const help = h("div", { class: "scene-help lbl" }, ...HELP.map((t) => h("div", { text: t })));
  help.style.cssText = "max-width:calc(640px * var(--px));margin:8px auto;color:#938acb;font-size:10px;line-height:1.6;padding:0 8px;";
  app.append(scene, help, mountSummary(ctx).el);

  const fit = (): void => document.documentElement.style.setProperty("--px", String(computeScale(window.innerWidth, window.innerHeight)));
  fit();
  window.addEventListener("resize", fit);
  void preloadSprites().then((fails) => { for (const c of assetErrors) ctx.diag.err("asset", c); if (fails > 0) scene.classList.add("no-sprites"); });
  return { frame: () => toast.frame(), dispose: () => { window.removeEventListener("resize", fit); disposeMachine(); } };
}
