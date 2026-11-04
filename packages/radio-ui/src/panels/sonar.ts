import { button, h, panel, setClass, setText } from "../dom";
import type { Ctx, Panel } from "../ctx";

const NS = "http://www.w3.org/2000/svg";
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

/** Bearing dial + contact list. Shows noisy bearing, blade rate and class only — never range (R6.1). */
export function mountSonar(ctx: Ctx): Panel {
  const { store, actions } = ctx;
  const dial = svg("svg", { class: "dial", viewBox: "-90 -90 180 180", role: "img", "aria-label": "hydrophone bearing dial" });
  dial.append(svg("circle", { r: "78" }), svg("circle", { r: "40" }), svg("line", { x1: "0", y1: "-78", x2: "0", y2: "78" }), svg("line", { x1: "-78", y1: "0", x2: "78", y2: "0" }));
  for (const [t, x, y] of [["N", 0, -80], ["E", 84, 3], ["S", 0, 88], ["W", -84, 3]] as const) { const tx = svg("text", { x: String(x), y: String(y) }); tx.textContent = t; dial.append(tx); }
  const hdg = svg("line", { class: "hdg", x1: "0", y1: "0", x2: "0", y2: "-34" });
  dial.append(hdg);
  const blips = new Map<number, SVGGElement>();
  const body = h("tbody");
  const empty = h("div", { class: "dim", text: "Hydrophone: quiet." });
  const table = h("table", { class: "contacts" }, h("thead", {}, h("tr", {}, h("th", { text: "#" }), h("th", { text: "Bearing" }), h("th", { text: "Blade rate" }), h("th", { text: "Class" }), h("th", { text: "" }))), body);
  const el = panel("sonar", "Sonar / hydrophone", h("div", { class: "sonar-body" }, dial, h("div", {}, empty, table)));
  el.classList.add("area-sonar");
  const listenBtns = new Map<number, HTMLButtonElement>();
  const cells = new Map<number, HTMLElement[]>();

  const refresh = (): void => {
    const s = store.state;
    hdg.setAttribute("transform", `rotate(${s.boat.headingDeg})`);
    const audible = [...s.sonar.values()].filter((c) => c.audible);
    empty.hidden = audible.length > 0;
    table.hidden = audible.length === 0;
    for (const c of s.sonar.values()) {
      let g = blips.get(c.id);
      if (!g) { g = svg("g"); g.append(svg("circle", { r: "5", class: "blip" })); dial.append(g); blips.set(c.id, g); }
      g.style.display = c.audible ? "" : "none";
      const circle = g.firstChild as SVGCircleElement;
      circle.setAttribute("class", `blip ${c.guess}`);
      const a = (c.bearingDeg * Math.PI) / 180;
      g.setAttribute("transform", `translate(${(Math.sin(a) * 60).toFixed(1)} ${(-Math.cos(a) * 60).toFixed(1)})`);
      let tds = cells.get(c.id);
      if (!tds) {
        const tr = h("tr"); tds = [h("td"), h("td"), h("td"), h("td"), h("td")];
        const lb = button("Listen", "Alt+H", () => actions.toggleHydrophone(c.id));
        listenBtns.set(c.id, lb);
        tds[4]!.append(lb);
        tr.append(...tds); body.append(tr); cells.set(c.id, tds); (tds[0] as HTMLElement).dataset["row"] = String(c.id);
        (tr as HTMLElement).dataset["id"] = String(c.id);
      }
      const row = (tds[0] as HTMLElement).parentElement as HTMLElement;
      row.hidden = !c.audible;
      setText(tds[0] as HTMLElement, String(c.id));
      setText(tds[1] as HTMLElement, `${String(Math.round(c.bearingDeg) % 360).padStart(3, "0")}° ±`);
      setText(tds[2] as HTMLElement, `${c.bladeRateHz.toFixed(1)} Hz`);
      setText(tds[3] as HTMLElement, c.guess === "escort" ? "ESCORT (fast screws)" : "slow (merchant/U-boat)");
      setClass(tds[3] as HTMLElement, "alert", c.guess === "escort");
      setClass(listenBtns.get(c.id) as HTMLElement, "on", s.hydrophone === c.id);
    }
  };
  store.on(["sonar", "boat"], refresh);
  refresh();
  return { el };
}
