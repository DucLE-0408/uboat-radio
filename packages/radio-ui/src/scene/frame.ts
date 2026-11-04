import type { Ctx } from "../ctx";
import { formatClock } from "../store";
import { setText, setClass } from "../dom";
import { sprite } from "./assets";
import { paint, place, sliceVars, u } from "./px";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

/** Banner (submarine cutaway) + pause button + operator portrait + instrument plate. */
export function mountFrame(ctx: Ctx, root: HTMLElement): void {
  const { store, actions } = ctx;

  const banner = mk("section", "sc sbanner"); banner.setAttribute("aria-label", "Submarine"); place(banner, 8, 8, 624, 92); paint(banner, "banner-sub");
  const label = mk("div", "bannerlbl lbl"); label.style.left = u(10); label.style.bottom = u(6);
  banner.append(label);
  const pause = mk("button", "pause"); pause.type = "button"; pause.setAttribute("aria-label", "Pause or resume the watch (Esc)"); place(pause, 592, 8, 24, 24); paint(pause, "pause");
  pause.addEventListener("click", () => actions.togglePause());
  banner.append(pause);

  const portrait = mk("section", "sc portrait"); portrait.setAttribute("aria-label", "Radio operator"); place(portrait, 8, 108, 132, 152); paint(portrait, "portrait");

  const g = mk("section", "sc gauges"); g.setAttribute("aria-label", "Instruments"); place(g, 8, 264, 132, 88); paint(g, "gauges");
  const vals = ["TX", "HULL", "SPEED", "HDG"].map((k, i) => {
    const v = mk("div", "gv"); place(v, 8, 10 + i * 13, 74, 11); g.append(v);
    return v;
  });
  const lamps = ["ANT", "KEY", "SIL"].map((k, i) => {
    const l = mk("span", "sc slamp"); l.style.pointerEvents = "none"; place(l, 90, 11 + i * 20, 14, 14); paint(l, "lamp", 0); g.append(l);
    const t = mk("span", "gl lbl"); t.textContent = k; t.style.left = u(106); t.style.top = u(14 + i * 20); g.append(t);
    return l;
  });
  const mkBtn = (txt: string, x: number, on: () => void): HTMLButtonElement => {
    const b = mk("button", "sbtn"); b.type = "button"; b.textContent = txt; place(b, x, 66, 56, 16); sliceVars(b, "btn"); b.addEventListener("click", on); g.append(b); return b;
  };
  const report = mkBtn("Report", 8, () => actions.report(10)); report.setAttribute("aria-label", "Report: key the transmitter for 10 seconds (Alt+T)");
  const silence = mkBtn("Silence", 68, () => actions.toggleSilence()); silence.setAttribute("aria-label", "Toggle radio silence (Alt+S)");
  root.append(banner, portrait, g);

  const refresh = (): void => {
    const s = store.state, b = s.boat;
    setText(label, `${b.mode} · ${b.speedKn.toFixed(1)} kn · T ${formatClock(s.tSec)}`);
    setText(vals[0] as HTMLElement, `TX   ${formatClock(s.tx.totalSec)}`);
    setText(vals[1] as HTMLElement, `HULL ${String(Math.round(b.hull)).padStart(3, " ")}`);
    setText(vals[2] as HTMLElement, `SPD  ${b.speedKn.toFixed(1)}`);
    setText(vals[3] as HTMLElement, `HDG  ${String(Math.round(b.headingDeg) % 360).padStart(3, "0")}`);
    const keyed = s.tSec < s.tx.keyedUntilSec && b.canTransmit;
    for (const [i, on] of [b.antennaUp, keyed, b.silence].entries()) { const l = lamps[i] as HTMLElement; paint(l, "lamp", on ? 1 : 0); l.setAttribute("title", ["Antenna up", "Transmitting", "Radio silence"][i] as string); }
    setClass(silence, "on", b.silence);
    silence.setAttribute("aria-pressed", String(b.silence));
  };
  store.on(["clock", "boat", "tx"], refresh);
  refresh();
}
