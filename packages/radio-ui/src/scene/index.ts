// P5 scene entry (?ui=p5 while the classic UI is still the default; the default flips in stage 5).
import type { Ctx } from "../ctx";
import { h } from "../dom";
import { HELP } from "../input/keymap";
import { mountSummary } from "../panels/summary";
import { mountAlerts } from "./alerts";
import { assetErrors, preloadSprites } from "./assets";
import { mountAuthDrawer } from "./drawer";
import { mountFrame } from "./frame";
import { mountMachine } from "./machine";
import { computeScale, paint } from "./px";
import { mountReceiver } from "./receiver";
import { Reveal } from "./reveal";
import { createScope, type SceneCtx } from "./scope";
import { mountSecret } from "./secret";
import { mountTelegram } from "./telegram";
import { mountToast } from "./toast";
import "./scene.css";

export function mountScene(base: Ctx, app: HTMLElement): { frame(): void; dispose(): void } {
  const scope = createScope(base);
  const ctx: SceneCtx = { ...base, scope, reveal: new Reveal() };
  app.classList.add("p5");
  const scene = h("div", { class: "scene", attrs: { role: "main", "aria-label": "Radio room" } });
  scene.append(h("h2", { text: "U-Boat radio room" }));
  const bg = h("div", { class: "sc" }); bg.style.inset = "0"; scene.append(bg);
  paint(bg, "scene-bg");
  const noise = h("div", { class: "fx-noise", attrs: { "aria-hidden": "true" } }); // optional CRT layer (off by default)

  mountFrame(ctx, scene);
  const receiver = mountReceiver(ctx, scene);
  mountAlerts(ctx, scene);
  mountTelegram(ctx, scene);
  const secret = mountSecret(ctx, scene);
  const machine = mountMachine(ctx, scene);
  const toast = mountToast(ctx, scene);
  mountAuthDrawer(ctx, scene);
  scene.append(noise);

  const help = h("div", { class: "scene-help lbl" }, ...HELP.map((t) => h("div", { text: t })));
  help.style.cssText = "max-width:calc(640px * var(--px));margin:8px auto;color:#938acb;font-size:10px;line-height:1.6;padding:0 8px;";
  const summary = mountSummary(ctx);
  app.append(scene, help, summary.el);

  const fit = (): void => document.documentElement.style.setProperty("--px", String(computeScale(window.innerWidth, window.innerHeight)));
  fit();
  window.addEventListener("resize", fit);
  void preloadSprites().then((fails) => { for (const c of assetErrors) ctx.diag.err("asset", c); if (fails > 0) scene.classList.add("no-sprites"); });

  const dispose = (): void => {
    window.removeEventListener("resize", fit);
    machine.dispose();
    ctx.morse.stop();   // no tone left scheduled once the scene is gone
    scope.dispose();    // every store subscription registered through the scope
    app.classList.remove("p5");
    scene.remove(); help.remove(); summary.el.remove();
  };
  return {
    frame: () => { const now = performance.now(); receiver.frame(now); secret.frame(now); machine.frame(now); toast.frame(); },
    dispose,
  };
}
