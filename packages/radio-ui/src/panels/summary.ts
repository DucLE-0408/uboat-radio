import { button, h } from "../dom";
import type { Ctx, Panel } from "../ctx";
import { formatClock } from "../store";

/** End-of-watch debrief (R8). Shows only what the player decided and how it turned out. */
export function mountSummary(ctx: Ctx): Panel {
  const { store, actions } = ctx;
  const card = h("div", { class: "card", attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "sum-title" } });
  const el = h("div", { class: "overlay" }, card);
  const refresh = (): void => {
    const s = store.state;
    el.classList.toggle("show", s.ended !== null);
    if (s.ended === null) return;
    const right = s.decisions.filter((d) => d.correct).length;
    const again = button("Play again — same seed", "", () => actions.newGame(true));
    const fresh = button("Play again — new seed", "", () => actions.newGame(false));
    card.replaceChildren(
      h("h1", { text: s.ended === "sunk" ? "BOAT LOST" : s.ended === "executed" ? "COURT-MARTIAL" : "DAWN — WATCH COMPLETE", attrs: { id: "sum-title" } }),
      h("dl", { class: "kv" },
        h("dt", { text: "Outcome" }), h("dd", { text: s.ended === "sunk" ? "The boat was sunk and the keybook lost." : s.ended === "executed" ? "The captain had you taken on deck. Too many paperwork violations." : "You brought the boat through the night watch." }),
        h("dt", { text: "Hull" }), h("dd", { text: `${Math.round(s.boat.hull)} / 100` }),
        h("dt", { text: "Time on the air" }), h("dd", { text: formatClock(s.tx.totalSec) }),
        h("dt", { text: "Decisions" }), h("dd", { text: s.decisions.length === 0 ? "none taken" : `${right} of ${s.decisions.length} correct` }),
        h("dt", { text: "Seed" }), h("dd", { text: String(ctx.seed) })),
      h("ul", {}, ...s.decisions.map((d) => h("li", { class: d.correct ? "ok" : "alert", text: `#${d.rxId}: ${d.decision === "accept" ? "accepted" : "rejected"} — ${d.correct ? "correct" : "WRONG"}` }))),
      h("div", { class: "row" }, again, fresh));
    again.focus();
  };
  store.on(["ended"], refresh);
  refresh();
  return { el };
}
