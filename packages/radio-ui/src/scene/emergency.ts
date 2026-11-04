import { setText } from "../dom";
import { place, sliceVars } from "./px";
import type { SceneCtx } from "./scope";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

/** BRIDGE ALERT overlay: large boat orders over the radio stations (which become inert), boat alarm lighting and a warning border. Esc dismisses. */
export function mountEmergency(ctx: SceneCtx, root: HTMLElement, scene: HTMLElement): void {
  const { store, actions } = ctx;
  const el = mk("section", "sc emerg-panel"); place(el, 148, 108, 268, 244); el.setAttribute("role", "alert"); el.hidden = true;
  const title = mk("div", "etitle lbl"); const sub = mk("div", "typ esub"); const read = mk("div", "typ eread"); read.setAttribute("aria-live", "off");
  const grid = mk("div", "egrid");
  const btn = (txt: string, key: string, aria: string, on: () => void, cls = ""): HTMLButtonElement => {
    const b = mk("button", `sbtn ebtn ${cls}`.trim()); b.type = "button"; sliceVars(b, "btn"); b.setAttribute("aria-label", `${aria} (${key})`);
    const t = mk("span", ""); t.textContent = txt; const k = mk("kbd", ""); k.textContent = key; b.append(t, k); b.addEventListener("click", on); return b;
  };
  grid.append(
    btn("Dive", "D", "Dive", () => actions.setMode("dive"), "danger"), btn("Periscope", "P", "Come to periscope depth", () => actions.setMode("periscope")), btn("Surface", "U", "Surface", () => actions.setMode("surface")),
    btn("Speed -", "Down", "Slower", () => actions.steerSpeed(-1)), btn("Speed +", "Up", "Faster", () => actions.steerSpeed(1)),
    btn("Left 10", "Left", "Turn 10 degrees to port", () => actions.steerHeading(-10)), btn("Right 10", "Right", "Turn 10 degrees to starboard", () => actions.steerHeading(10)),
    btn("Dismiss", "Esc", "Dismiss the alert", () => actions.dismissEmergency()),
  );
  const hint = mk("div", "typ ehint"); hint.textContent = "Digits 0-9 set speed to 2 x digit knots.";
  el.append(title, sub, read, grid, hint);
  root.append(el);

  let was = false;
  const refresh = (): void => {
    const s = store.state, on = s.emergency.reason !== null && s.ended === null;
    el.hidden = !on;
    scene.classList.toggle("emerg", on);
    if (on !== was) {
      was = on;
      for (const n of root.querySelectorAll<HTMLElement>(":scope > .tg, :scope > .dock, :scope > .secret")) { if (on) n.setAttribute("inert", ""); else n.removeAttribute("inert"); }
    }
    if (!on) return;
    setText(title, "!! BRIDGE ALERT !!");
    setText(sub, s.emergency.reason === "asdic" ? "ASDIC lock: we are being pinged." : "Depth charges.");
    const b = s.boat;
    setText(read, `${b.mode.toUpperCase()} · ${b.depthM.toFixed(0)} m · ${b.speedKn.toFixed(1)} kn · HDG ${String(Math.round(b.headingDeg) % 360).padStart(3, "0")} · HULL ${Math.round(b.hull)}`);
  };
  ctx.scope.on(["ui", "alert", "ended", "clock", "boat"], refresh);
  ctx.scope.own(() => { scene.classList.remove("emerg"); });
  refresh();
}
