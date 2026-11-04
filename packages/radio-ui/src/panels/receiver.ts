import { button, h, panel, setClass, setText } from "../dom";
import type { Ctx, Panel } from "../ctx";

const snrWord = (db: number): string => (db >= 30 ? "strong" : db >= 20 ? "fair" : db >= 10 ? "weak" : "very weak");

export function mountReceiver(ctx: Ctx): Panel {
  const { store, audio, morse, actions } = ctx;
  const chips = h("div", { class: "chips", attrs: { role: "tablist", "aria-label": "received messages" } });
  const chipEls = new Map<number, HTMLButtonElement>();
  const tone = h("span", { class: "tone", attrs: { "aria-hidden": "true" } });
  const toneLabel = h("span", { class: "dim", text: "tone" });
  const canvas = h("canvas", { class: "wave", attrs: { width: "640", height: "64", role: "img", "aria-label": "received signal waveform" } });
  const info = h("div", { class: "dim", text: "Waiting for traffic…" });
  const morseText = h("div", { class: "morse-text", attrs: { "aria-label": "visual morse" } });
  const prompt = h("div", { class: "prompt", attrs: { role: "status" } });
  const replayBtn = button("Replay", "`", () => actions.replayAudio());
  const prevA = button("◀", "[", () => store.cycleAttempt(-1));
  const nextA = button("▶", "]", () => store.cycleAttempt(1));
  const visual = button("Visual Morse", "", () => { ctx.flags.showMorse = !ctx.flags.showMorse; refresh(); });

  const el = panel("receiver", "Receiver", chips,
    h("div", { class: "row" }, tone, toneLabel, replayBtn, prevA, nextA, visual), canvas, info, morseText, prompt);

  const g = canvas.getContext("2d");
  const ring = new Uint8Array(320);
  let head = 0;

  const refresh = (): void => {
    const s = store.state;
    for (const id of s.order) {
      const rx = s.rx.get(id);
      if (!rx) continue;
      let b = chipEls.get(id);
      if (!b) {
        b = h("button", { class: "chip", attrs: { type: "button", role: "tab" }, on: { click: () => store.selectRx(id) } });
        chipEls.set(id, b);
        chips.append(b);
      }
      setText(b, `#${id} ${rx.from}${rx.resolved ? (rx.resolved.decision === "accept" ? " ✔ accepted" : " ✖ rejected") : rx.unread ? " NEW" : ""}`);
      setClass(b, "sel", s.activeRx === id);
      b.setAttribute("aria-selected", String(s.activeRx === id));
    }
    const rx = store.activeView();
    const att = rx?.attempts.find((a) => a.attempt === s.activeAttempt);
    if (!rx || !att) { setText(info, "Waiting for traffic…"); setText(morseText, ""); return; }
    setText(info, `#${rx.rxId} · ${rx.from} → ${rx.net} · attempt ${att.attempt + 1}/${rx.attempts.length} · signal ${snrWord(att.snrDb)} · DF ${String(Math.round(rx.dfBearingDeg)).padStart(3, "0")}°`);
    setText(morseText, ctx.flags.showMorse ? att.tokens.replaceAll("_", " ").replaceAll("/", "  ⁄  ") : "");
    setClass(visual, "on", ctx.flags.showMorse);
  };
  store.on(["rx", "ui"], refresh);
  refresh();

  const frame = (): void => {
    const on = morse.toneOn();
    ring[head] = on ? 1 : 0;
    head = (head + 1) % ring.length;
    setClass(tone, "on", on);
    setText(prompt, !audio.supported ? "Audio unsupported in this browser — use Visual Morse." : audio.needsGesture ? "🔇 Press any key to enable sound." : "");
    if (!g) return;
    const w = canvas.width, hh = canvas.height;
    g.fillStyle = "#040704";
    g.fillRect(0, 0, w, hh);
    g.strokeStyle = on ? "#7dffa0" : "#3f7a50";
    g.beginPath();
    for (let i = 0; i < ring.length; i++) {
      const v = ring[(head + i) % ring.length] as number;
      const x = (i / ring.length) * w;
      const y = hh / 2 - (v ? hh * 0.35 : 0) + (v ? 0 : (((i * 7919) % 5) - 2) * 0.8);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  };
  return { el, frame };
}
