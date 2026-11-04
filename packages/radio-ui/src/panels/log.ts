import { h, panel } from "../dom";
import type { Ctx, Panel } from "../ctx";
import { formatClock } from "../store";

export function mountLog(ctx: Ctx): Panel {
  const { store } = ctx;
  const list = h("ul", { class: "log", attrs: { role: "log", "aria-live": "polite", "aria-label": "event log" } });
  const el = panel("log", "Event log", list);
  el.classList.add("area-log");
  let shown = 0;
  let firstSeen: unknown = null;
  const refresh = (): void => {
    const lines = store.state.log;
    if (lines[0] !== firstSeen) { list.replaceChildren(); shown = 0; firstSeen = lines[0]; } // log was trimmed at the head
    for (let i = shown; i < lines.length; i++) {
      const l = lines[i]!;
      list.append(h("li", { class: l.level === "info" ? "" : l.level }, h("time", { text: formatClock(l.tSec) }), l.text));
    }
    shown = lines.length;
    while (list.childElementCount > 120) list.firstElementChild?.remove();
    list.scrollTop = list.scrollHeight;
  };
  store.on(["log"], refresh);
  refresh();
  return { el };
}
