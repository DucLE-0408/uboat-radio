import { button, h, panel, setClass, setText } from "../dom";
import type { Ctx, Panel } from "../ctx";

export function mountTransmit(ctx: Ctx): Panel {
  const { store, actions } = ctx;
  const notice = h("div", { class: "notice", attrs: { role: "status", "aria-live": "assertive" } });
  const status = h("div", { class: "row" });
  const located = h("span", { class: "banner", text: "LOCATED — HF/DF fix on us", attrs: { role: "alert" } });
  const escort = h("span", { class: "banner", text: "ESCORT DISPATCHED", attrs: { role: "alert" } });
  status.append(located, escort);
  located.hidden = true; escort.hidden = true;
  const silence = button("Radio silence", "Alt+S", () => actions.toggleSilence());
  const el = panel("transmit", "Transmit",
    h("div", { class: "row" },
      button("Repeat", "Alt+R", () => actions.repeat()),
      button("Challenge", "Alt+C", () => actions.challenge()),
      button("Check reply", "Alt+K", () => actions.check()),
      button("Accept order", "Alt+Y", () => actions.resolve("accept")),
      button("Reject order", "Alt+N", () => actions.resolve("reject"), "danger"),
      button("Report 10s", "Alt+T", () => actions.report(10)),
      button("Report 30s", "Alt+G", () => actions.report(30)),
      silence),
    status, notice);
  el.classList.add("area-tx");

  let lastSeq = 0, noticeAt = 0;
  const refresh = (): void => {
    const s = store.state;
    setClass(silence, "on", s.boat.silence);
    located.hidden = !(s.tx.locatedAtSec !== null && s.tSec - s.tx.locatedAtSec < 120);
    escort.hidden = !(s.tx.escortAtSec !== null && s.tSec - s.tx.escortAtSec < 600);
    if (s.notice && s.notice.seq !== lastSeq) { lastSeq = s.notice.seq; noticeAt = performance.now(); setText(notice, s.notice.text); }
  };
  store.on(["ui", "tx", "boat", "clock"], refresh);
  refresh();
  // Notices fade after a while (wall clock; purely cosmetic)
  const frame = (): void => { if (noticeAt && performance.now() - noticeAt > 9000) { setText(notice, ""); noticeAt = 0; } };
  return { el, frame };
}
