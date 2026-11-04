import { button, h, panel, setText } from "../dom";
import type { Ctx, Panel } from "../ctx";

/** Minimal Bridge strip (full Bridge screen is P5): boat orders always reachable, enlarged during an emergency. */
export function mountBridge(ctx: Ctx): Panel {
  const { store, actions } = ctx;
  const readout = h("span", { class: "hi" });
  const hint = h("div", { class: "hidden-if-calm alert", text: "EMERGENCY — U surface · P periscope · D dive · 0–9 speed (×2 kn) · ←/→ heading · Esc dismiss", attrs: { role: "alert" } });
  const el = panel("bridge", "Bridge orders", h("div", { class: "row" },
    button("Surface", "Alt+1", () => actions.setMode("surface")),
    button("Periscope", "Alt+2", () => actions.setMode("periscope")),
    button("Dive", "Alt+3", () => actions.setMode("dive"), "danger"),
    button("Speed −", "↓", () => actions.steerSpeed(-1)), button("Speed +", "↑", () => actions.steerSpeed(1)),
    button("◀ 10°", "←", () => actions.steerHeading(-10)), button("10° ▶", "→", () => actions.steerHeading(10)),
    readout), hint);
  el.classList.add("area-bridge");
  const refresh = (): void => {
    const b = store.state.boat;
    setText(readout, `${b.mode.toUpperCase()} · ${b.depthM.toFixed(0)} m · ${b.speedKn.toFixed(1)} kn · ${String(Math.round(b.headingDeg) % 360).padStart(3, "0")}°`);
  };
  store.on(["boat"], refresh);
  refresh();
  return { el };
}
