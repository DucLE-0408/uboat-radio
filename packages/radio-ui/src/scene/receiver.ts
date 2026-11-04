import { setClass, setText } from "../dom";
import { paint, place, setFrame, sliceVars, u } from "./px";
import type { SceneCtx } from "./scope";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

/** Inbox (message selector) on the banner's left, and the receiver HUD (tone lamp, waveform, replay, attempt, visual Morse) on its right. */
export function mountReceiver(ctx: SceneCtx, root: HTMLElement): { frame(now: number): void } {
  const { store, audio, morse, actions, flags } = ctx;

  const inbox = mk("section", "sc inbox"); inbox.setAttribute("aria-label", "Received messages"); place(inbox, 14, 16, 70, 80);
  const chips = new Map<number, HTMLButtonElement>();
  const hud = mk("section", "sc hud"); hud.setAttribute("aria-label", "Receiver"); place(hud, 262, 72, 358, 22);
  const lamp = mk("span", "slamp"); place(lamp, 4, 4, 14, 14); paint(lamp, "lamp", 0); lamp.style.pointerEvents = "none";
  const canvas = mk("canvas", "wave"); canvas.width = 80; canvas.height = 14; place(canvas, 22, 4, 80, 14); canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "Received signal waveform");
  const btn = (txt: string, x: number, w: number, aria: string, on: () => void): HTMLButtonElement => {
    const b = mk("button", "sbtn"); b.type = "button"; b.textContent = txt; b.setAttribute("aria-label", aria); b.title = aria; place(b, x, 3, w, 16); sliceVars(b, "btn"); b.addEventListener("click", on); return b;
  };
  const replay = btn("Replay", 106, 44, "Replay the signal (`)", () => actions.replayAudio());
  const att = btn("A1/1", 153, 38, "Next attempt of this message (])", () => store.cycleAttempt(1));
  const vis = btn("Vis", 194, 28, "Show the signal as dots and dashes", () => { flags.showMorse = !flags.showMorse; refresh(); });
  const txt = mk("div", "hudtxt typ"); place(txt, 226, 4, 128, 14); txt.setAttribute("aria-live", "off");
  hud.append(lamp, canvas, replay, att, vis, txt);
  root.append(inbox, hud);

  const refresh = (): void => {
    const s = store.state;
    s.order.forEach((id, i) => {
      const rx = s.rx.get(id); if (!rx) return;
      let b = chips.get(id);
      if (!b) {
        b = mk("button", "sbtn chip"); b.type = "button"; place(b, 0, i * 16, 66, 14); sliceVars(b, "btn");
        b.addEventListener("click", () => store.selectRx(id)); inbox.append(b); chips.set(id, b);
      }
      const mark = rx.resolved ? (rx.resolved.decision === "accept" ? "+" : "x") : rx.unread ? "!" : " ";
      setText(b, `${mark}#${id} ${rx.from}`);
      b.setAttribute("aria-label", `Message ${id} from ${rx.from}${rx.unread ? ", new" : ""}${rx.resolved ? `, ${rx.resolved.decision === "accept" ? "accepted" : "rejected"}` : ""}`);
      b.setAttribute("aria-pressed", String(s.activeRx === id));
      setClass(b, "on", s.activeRx === id);
    });
    const rx = store.activeView();
    const n = rx?.attempts.length ?? 0;
    const idx = rx ? Math.max(0, rx.attempts.findIndex((a) => a.attempt === s.activeAttempt)) : 0;
    setText(att, `A${n === 0 ? 0 : idx + 1}/${n}`);
    att.disabled = n < 2;
    replay.disabled = n === 0;
    vis.setAttribute("aria-pressed", String(flags.showMorse));
    setClass(vis, "on", flags.showMorse);
  };
  ctx.scope.on(["rx", "view", "ui"], refresh);
  refresh();

  const g = canvas.getContext("2d");
  const ring = new Uint8Array(80);
  let head = 0, lastTone = false, lastTxt = "";
  return {
    frame: (now) => {
      void now;
      const on = morse.toneOn();
      ring[head] = on ? 1 : 0; head = (head + 1) % ring.length;
      if (on !== lastTone) { lastTone = on; setFrame(lamp, "lamp", on ? 1 : 0); }
      let t = "";
      if (flags.showMorse) {
        const rx = store.activeView(), a = rx?.attempts.find((x) => x.attempt === store.state.activeAttempt);
        t = a ? a.tokens.replaceAll("_", " ").replaceAll("/", " / ") : "";
        txt.title = t;
      } else if (!audio.supported) t = "NO AUDIO: USE VIS";
      else if (audio.needsGesture) t = "PRESS ANY KEY FOR SOUND";
      if (t !== lastTxt) { lastTxt = t; setText(txt, t); setClass(txt, "prompt", !flags.showMorse); }
      if (!g) return;
      g.fillStyle = "#0c0a18"; g.fillRect(0, 0, 80, 14);
      g.fillStyle = on ? "#6fe39a" : "#535c82";
      for (let i = 0; i < 80; i++) { const v = ring[(head + i) % 80] as number; if (v) g.fillRect(i, 3, 1, 8); else g.fillRect(i, 7, 1, 1); }
    },
  };
}
