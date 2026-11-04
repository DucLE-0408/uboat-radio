import { formatClock, type UiState } from "../store";
import { setClass, setText } from "../dom";
import { paint, place, sliceVars, u } from "./px";
import type { SceneCtx } from "./scope";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

/** Instrument plate: TX time, hull, speed, heading, three lamps, Report and Silence. */
export function mountGauges(ctx: SceneCtx, root: HTMLElement): void {
  const { store, actions } = ctx;
  const g = mk("section", "sc gauges"); g.setAttribute("aria-label", "Instruments"); place(g, 8, 264, 132, 88); paint(g, "gauges");
  const vals = ["TX", "HULL", "SPEED", "HDG"].map((_, i) => { const v = mk("div", "gv"); place(v, 8, 10 + i * 13, 74, 11); g.append(v); return v; });
  const lamps = ["ANT", "KEY", "SIL"].map((k, i) => {
    const pair = mk("span", "gpair"); g.append(pair); // display: contents on desktop; keeps lamp + label together in the flow layouts
    const l = mk("span", "sc slamp"); l.style.pointerEvents = "none"; place(l, 90, 11 + i * 20, 14, 14); paint(l, "lamp", 0); pair.append(l);
    const t = mk("span", "gl lbl"); t.textContent = k; t.style.left = u(106); t.style.top = u(14 + i * 20); pair.append(t);
    return l;
  });
  const mkBtn = (txt: string, x: number, on: () => void): HTMLButtonElement => {
    const b = mk("button", "sbtn"); b.type = "button"; b.textContent = txt; place(b, x, 66, 56, 16); sliceVars(b, "btn"); b.addEventListener("click", on); g.append(b); return b;
  };
  const report = mkBtn("Report", 8, () => actions.report(10)); report.setAttribute("aria-label", "Report: key the transmitter for 10 seconds (Alt+T)");
  const silence = mkBtn("Silence", 68, () => actions.toggleSilence()); silence.setAttribute("aria-label", "Toggle radio silence (Alt+S)");
  root.append(g);

  const refresh = (): void => {
    const s: UiState = store.state, b = s.boat;
    setText(vals[0] as HTMLElement, `TX   ${formatClock(s.tx.totalSec)}`);
    setText(vals[1] as HTMLElement, `HULL ${String(Math.round(b.hull)).padStart(3, " ")}`);
    setText(vals[2] as HTMLElement, `SPD  ${b.speedKn.toFixed(1)}`);
    setText(vals[3] as HTMLElement, `HDG  ${String(Math.round(b.headingDeg) % 360).padStart(3, "0")}`);
    const keyed = s.tSec < s.tx.keyedUntilSec && b.canTransmit;
    for (const [i, on] of [b.antennaUp, keyed, b.silence].entries()) { const l = lamps[i] as HTMLElement; paint(l, "lamp", on ? 1 : 0); l.title = ["Antenna up", "Transmitting", "Radio silence"][i] as string; }
    setClass(silence, "on", b.silence);
    silence.setAttribute("aria-pressed", String(b.silence));
  };
  ctx.scope.on(["clock", "boat", "tx"], refresh);
  refresh();
}
