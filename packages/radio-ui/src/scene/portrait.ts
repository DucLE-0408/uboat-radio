import { paint, place, setFrame, sliceVars } from "./px";
import { PORTRAIT_FRAMES, portraitPose, type PortraitPose } from "./pose";
import type { Decor } from "./decor";
import type { SceneCtx } from "./scope";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

/** Operator portrait (pose follows observable state) and the Table / Sonar / Log drawer buttons. */
export function mountPortrait(ctx: SceneCtx, root: HTMLElement, decor: Decor): { frame(now: number): void } {
  const { store, morse, actions } = ctx;
  const p = mk("section", "sc portrait"); p.setAttribute("aria-label", "Radio operator"); place(p, 8, 108, 132, 152);   const img = mk("div", "pimg"); place(img, 0, 0, 132, 152); paint(img, "portrait"); p.append(img);
  const mkBtn = (txt: string, x: number, aria: string, on: () => void): HTMLButtonElement => {
    const b = mk("button", "sbtn"); b.type = "button"; b.textContent = txt; b.setAttribute("aria-label", aria); place(b, x, 130, 40, 16); sliceVars(b, "btn"); b.addEventListener("click", on); p.append(b); return b;
  };
  mkBtn("Table", 3, "Open the authentication table (Alt+L)", () => actions.openAuthTable());
  const sonar = mkBtn("Sonar", 46, "Open the sonar and hydrophone drawer", () => actions.openDrawer("sonar"));
  mkBtn("Log", 89, "Open the event log", () => actions.openDrawer("log"));
  root.append(p);

  let typedAt = -1e9, listenUntil = -1e9, hurtUntil = -1e9, lastHull = store.state.boat.hull, blinkUntil = 0, nextBlink = performance.now() + decor.nextBlinkMs();
  let pose: PortraitPose | "" = "";
  ctx.scope.on(["copy"], () => { typedAt = performance.now(); });
  ctx.scope.on(["rx"], () => { listenUntil = performance.now() + 6000; });
  ctx.scope.on(["boat"], () => { const h = store.state.boat.hull; if (h < lastHull) hurtUntil = performance.now() + 6000; lastHull = h; });
  ctx.scope.on(["sonar"], () => {
    const n = [...store.state.sonar.values()].filter((c) => c.audible).length;
    sonar.classList.toggle("on", n > 0);
    sonar.setAttribute("aria-label", n > 0 ? `Open the sonar and hydrophone drawer, ${n} contact${n === 1 ? "" : "s"} heard` : "Open the sonar and hydrophone drawer");
  });
  return {
    frame: (now) => {
      if (now >= nextBlink && ctx.flags.reduceMotion !== true) { blinkUntil = now + 140; nextBlink = now + decor.nextBlinkMs(); }
      const s = store.state;
      const next = portraitPose({ emergency: s.emergency.reason !== null && s.ended === null, hurtRecent: now < hurtUntil, typingRecent: now - typedAt < 2500, listening: morse.toneOn() || now < listenUntil, blinking: now < blinkUntil });
      if (next !== pose) { pose = next; setFrame(img, "portrait", PORTRAIT_FRAMES[next]); }
    },
  };
}
