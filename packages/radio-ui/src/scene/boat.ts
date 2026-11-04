import { formatClock } from "../store";
import { setClass, setText } from "../dom";
import { paint, place, setFrame, sliceVars, u } from "./px";
import { boatPose } from "./pose";
import type { SceneCtx } from "./scope";
import type { Decor } from "./decor";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };
const BOAT_X = 74, BOAT_Y = 2, BOAT_W = 500, BOAT_H = 80;

/** Submarine cutaway viewport: sea, boat (sinks with the mode), propeller, damage and alarm overlays, water in front, frame; plus pause button and status label. */
export function mountBoat(ctx: SceneCtx, root: HTMLElement, decor: Decor): { frame(now: number): void; setStageClass(c: string): void } {
  const { store, actions } = ctx;
  const banner = mk("section", "sc sbanner"); banner.setAttribute("aria-label", "Submarine"); place(banner, 8, 8, 624, 92);
  const stage = mk("div", "stage"); place(stage, 0, 0, 624, 92); banner.append(stage);
  const layer = (cls: string, id: string, x: number, y: number, w: number, h: number): HTMLElement => { const e = mk("div", `sl ${cls}`); place(e, x, y, w, h); paint(e, id); return e; };
  const sea = layer("sea", "banner-sea", 0, 0, 624, 92);
  const boat = mk("div", "sl boatwrap"); place(boat, BOAT_X, BOAT_Y, BOAT_W, BOAT_H);
  const bob = mk("div", "sl bob"); place(bob, 0, 0, BOAT_W, BOAT_H); bob.style.animationDelay = `-${decor.bobPhaseS()}s`;
  const hull = layer("hullimg", "banner-boat", 0, 0, BOAT_W, BOAT_H);
  const cracks = layer("cracks", "boat-cracks", 0, 0, BOAT_W, BOAT_H);
  const alarm = layer("alarm", "boat-alarm", 0, 0, BOAT_W, BOAT_H);
  const prop = layer("prop", "prop", 478, 42, 16, 16); // hub at the stern shaft of the boat sprite
  bob.append(hull, cracks, alarm, prop); boat.append(bob);
  const water = layer("water", "banner-water", 0, 0, 624, 92);
  const frame = layer("bframe", "banner-frame", 0, 0, 624, 92);
  stage.append(sea, boat, water, frame);
  const label = mk("div", "bannerlbl lbl"); label.style.left = u(10); label.style.bottom = u(6); label.setAttribute("aria-live", "off");
  const pause = mk("button", "pause"); pause.type = "button"; pause.setAttribute("aria-label", "Pause or resume the watch (Esc)"); place(pause, 592, 8, 24, 24); paint(pause, "pause");
  pause.addEventListener("click", () => actions.togglePause());
  const menuBtn = mk("button", "sbtn menubtn"); menuBtn.type = "button"; menuBtn.textContent = "Menu"; menuBtn.setAttribute("aria-label", "Save and return to the main menu");
  place(menuBtn, 8, 8, 66, 24); sliceVars(menuBtn, "btn"); menuBtn.addEventListener("click", () => actions.openMenu());
  banner.append(label, pause, menuBtn);
  root.append(banner);

  let lastDy = -1, lastCrack = -2, lastAlarm: boolean | null = null, lastProp = "x", nextFlick = 0, flickOn = false;
  const refresh = (): void => {
    const s = store.state, b = s.boat;
    const pose = boatPose(b.mode, b.speedKn, b.hull, s.emergency.reason !== null && s.ended === null);
    if (pose.dy !== lastDy) { lastDy = pose.dy; boat.style.transform = `translateY(${u(pose.dy)})`; }
    if (pose.crack !== lastCrack) { lastCrack = pose.crack; cracks.hidden = pose.crack < 0; if (pose.crack >= 0) setFrame(cracks, "boat-cracks", pose.crack); }
    if (pose.alarm !== lastAlarm) { lastAlarm = pose.alarm; alarm.hidden = !pose.alarm; }
    const pv = pose.propMs === null ? "off" : `${pose.propMs}`;
    if (pv !== lastProp) { lastProp = pv; prop.style.animation = pose.propMs === null ? "none" : `sc-prop ${pose.propMs}ms steps(4) infinite`; }
    setText(label, `${b.mode} · ${b.speedKn.toFixed(1)} kn · T ${formatClock(s.tSec)}${s.paused ? " · PAUSED" : ""}`);
    pause.setAttribute("aria-pressed", String(s.paused));
  };
  ctx.scope.on(["clock", "boat", "ui", "alert"], refresh);
  refresh();
  return {
    frame: (now) => { // decorative light flicker on a damaged boat (decor RNG, wall clock)
      if (lastCrack < 1 || ctx.flags.reduceMotion === true) { if (flickOn) { flickOn = false; hull.classList.remove("flick"); } return; }
      if (now >= nextFlick) { flickOn = !flickOn; setClass(hull, "flick", flickOn); nextFlick = now + (flickOn ? 120 : decor.nextFlickerMs()); }
    },
    setStageClass: (c) => { banner.dataset["layout"] = c; },
  };
}
