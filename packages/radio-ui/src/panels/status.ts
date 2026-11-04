import { BALANCE } from "@uboat/sim-core";
import { button, h, panel, setClass, setText } from "../dom";
import type { Ctx, Panel } from "../ctx";
import { formatClock } from "../store";

export function mountStatus(ctx: Ctx): Panel {
  const { store, actions } = ctx;
  const stat = (k: string): { wrap: HTMLElement; v: HTMLElement } => {
    const v = h("b", { text: "–" });
    return { wrap: h("span", { class: "stat" }, h("span", { class: "k", text: k }), v), v };
  };
  const clock = stat("T"), mode = stat("MODE"), speed = stat("SPEED"), hdg = stat("HDG"), tx = stat("TX TOTAL");
  const hullNum = h("b", { text: "100" });
  const hullBar = h("i");
  const hull = h("span", { class: "stat" }, h("span", { class: "k", text: "HULL" }), h("span", { class: "hull", attrs: { role: "img", "aria-label": "hull integrity" } }, hullBar), hullNum);
  const antenna = h("span", { class: "lamp", text: "ANTENNA UP" });
  const keyed = h("span", { class: "lamp", text: "KEYED" });
  const located = h("span", { class: "lamp danger", text: "LOCATED" });
  const silence = h("span", { class: "lamp", text: "SILENCE" });
  const paused = h("span", { class: "banner", text: "PAUSED — Esc to resume", attrs: { role: "status" } });
  const speeds = [1, 2, 4].map((f) => button(`${f}×`, "", () => actions.setSimSpeed(f), ""));
  const pauseBtn = button("Pause", "Esc", () => actions.togglePause());

  const el = panel("status", "Status", h("div", { class: "status" },
    clock.wrap, mode.wrap, speed.wrap, hdg.wrap, hull, tx.wrap, antenna, keyed, silence, located, paused,
    h("span", { class: "spacer" }), h("span", { class: "row", attrs: { role: "group", "aria-label": "time compression" } }, ...speeds, pauseBtn)));
  el.classList.add("area-status");

  const refresh = (): void => {
    const s = store.state;
    const left = Math.max(0, BALANCE.watch.durationSec - s.tSec);
    setText(clock.v, `${formatClock(s.tSec)}  (dawn in ${formatClock(left)})`);
    setText(mode.v, s.boat.mode.toUpperCase());
    setText(speed.v, `${s.boat.speedKn.toFixed(1)} kn`);
    setText(hdg.v, `${String(Math.round(s.boat.headingDeg) % 360).padStart(3, "0")}°`);
    setText(hullNum, String(Math.round(s.boat.hull)));
    (hullBar as HTMLElement).style.width = `${Math.max(0, Math.min(100, s.boat.hull))}%`;
    setText(tx.v, formatClock(s.tx.totalSec));
    setClass(antenna, "on", s.boat.antennaUp);
    setText(antenna, s.boat.antennaUp ? "ANTENNA UP" : "ANTENNA DOWN");
    setClass(keyed, "on", s.tSec < s.tx.keyedUntilSec && s.boat.canTransmit);
    setClass(silence, "on", s.boat.silence);
    setClass(located, "on", s.tx.locatedAtSec !== null && s.tSec - s.tx.locatedAtSec < 90);
    paused.hidden = !s.paused;
    speeds.forEach((b, i) => setClass(b, "on", ctx.flags.simSpeed === [1, 2, 4][i]));
  };
  store.on(["clock", "boat", "tx", "ui"], refresh);
  refresh();
  return { el };
}
