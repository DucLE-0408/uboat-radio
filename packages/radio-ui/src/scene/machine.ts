import type { SceneCtx } from "./scope";
import { setText } from "../dom";
import { paint, place, setFrame, sliceVars } from "./px";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

const DIGITS = "1234567890";
const ROWS = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"] as const; // Enigma keyboard order
const codeOf = (ch: string): string => (/[0-9]/.test(ch) ? `Digit${ch}` : `Key${ch}`);

/** Cipher machine: nameplate, 4 rotor windows (M4 indicator), lampboard (lit by decode in stage 4), working keyboard. */
export function mountMachine(ctx: SceneCtx, root: HTMLElement): { frame(now: number): void; dispose(): void } {
  const { store, input, reveal } = ctx;
  const m = mk("section", "sc mach"); m.setAttribute("aria-label", "Cipher machine"); place(m, 424, 108, 208, 244); paint(m, "machine");
  const plate = mk("div", "plate lbl"); plate.textContent = "Funk-M4"; place(plate, 142, 5, 58, 11); m.append(plate); // on the green enamel label

  const winsBox = mk("div", "wins"); m.append(winsBox); // display: contents on desktop, a flex row in the touch layouts
  // the cream window plates are drawn in the casing sprite; only the live letters sit on top
  const wins = [30, 58, 86, 114].map((x) => { const w = mk("div", "win"); place(w, x, 26, 14, 16); w.textContent = "·"; winsBox.append(w); return w; });
  const winGroup = mk("span", "sr-only"); winsBox.append(winGroup);
  const status = mk("span", "sc"); place(status, 174, 26, 16, 22); paint(status, "status-lamp", 1); winsBox.append(status);
  const statusTxt = mk("span", "sr-only"); winsBox.append(statusTxt);

  // lampboard (decorative here; lit sequentially by decode in stage 4)
  const lampRows: [string, number, number][] = [[ROWS[0], 14, 62], [ROWS[1], 24, 80], [ROWS[2], 14, 98]];
  const lampBoard = mk("div", "sc"); lampBoard.style.inset = "0"; lampBoard.setAttribute("role", "img"); lampBoard.setAttribute("aria-label", "Lampboard showing the deciphered letters"); m.append(lampBoard);
  const lampByChar = new Map<string, HTMLElement>();
  for (const [letters, x0, y] of lampRows) [...letters].forEach((ch, k) => { const l = mk("span", "slamp"); l.dataset["ch"] = ch; place(l, x0 + k * 20, y, 14, 14); paint(l, "lamp", 0); l.textContent = ch; lampBoard.append(l); lampByChar.set(ch, l); });
  let litLamp: HTMLElement | null = null;
  /** Light the lamp of the letter being revealed (decorative; mirrors the deciphered text). */
  const light = (ch: string | null): void => {
    const next = ch === null ? null : lampByChar.get(ch) ?? null;
    if (next === litLamp) return;
    if (litLamp) { setFrame(litLamp, "lamp", 0); litLamp.classList.remove("on"); }
    if (next) { setFrame(next, "lamp", 1); next.classList.add("on"); }
    litLamp = next;
  };

  // keyboard (alphabetical DOM order so the touch layout can be a plain grid; desktop positions are absolute)
  const keysBox = mk("div", "keys"); m.append(keysBox);
  const buttons = new Map<string, HTMLButtonElement>(); // event.code -> key (for physical-key feedback)
  const addKey = (label: string, x: number, y: number, w: number, kind: "round" | "wide", code: string, aria: string, act: () => void): void => {
    const b = mk("button", `key ${kind}`); b.type = "button"; b.textContent = label; b.setAttribute("aria-label", aria); place(b, x, y, w, 16);
    if (kind === "round") paint(b, "key-round", 0); else sliceVars(b, "keywide");
    b.addEventListener("click", act); sliceVars(b, "keywide"); keysBox.append(b); buttons.set(code, b);
  };
  [...DIGITS].forEach((ch, k) => addKey(ch, 9 + k * 19, 124, 16, "round", codeOf(ch), `Key ${ch}`, () => input.handle({ t: "char", ch })));
  const pos = new Map<string, [number, number]>();
  ([["QWERTZUIO", 14, 144], ["ASDFGHJK", 24, 162], ["PYXCVBNML", 14, 180]] as const).forEach(([letters, x0, y]) => [...letters].forEach((ch, k) => pos.set(ch, [x0 + k * 20, y])));
  for (let i = 0; i < 26; i++) { const ch = String.fromCharCode(65 + i), [x, y] = pos.get(ch) as [number, number]; addKey(ch, x, y, 16, "round", codeOf(ch), `Key ${ch}`, () => input.handle({ t: "char", ch })); }
  addKey("?", 14, 202, 16, "round", "Slash", "Unreadable character (?)", () => input.handle({ t: "char", ch: "?" }));
  addKey("Space", 36, 202, 76, "wide", "Space", "Space: end the current group", () => input.handle({ t: "space" }));
  addKey("Del", 116, 202, 28, "wide", "Backspace", "Delete the last character", () => input.handle({ t: "backspace" }));
  addKey("Decode", 148, 202, 44, "wide", "Enter", "Decode your copy (Enter)", () => input.handle({ t: "confirm" }));
  buttons.get("Enter")?.classList.add("go");
  const mini = mk("div", "minicopy typ"); mini.setAttribute("aria-live", "off"); mini.setAttribute("aria-label", "Your transcription so far"); m.append(mini); // visible only in the touch layouts

  // physical key feedback: press the matching on-screen key
  const down = (ev: KeyboardEvent): void => { if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) buttons.get(ev.code)?.classList.add("down"); };
  const up = (ev: KeyboardEvent): void => { buttons.get(ev.code)?.classList.remove("down"); };
  const blur = (): void => { for (const b of buttons.values()) b.classList.remove("down"); };
  window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);

  const refresh = (): void => {
    const s = store.state, rx = store.activeView();
    const att = rx?.attempts.find((a) => a.attempt === s.activeAttempt);
    const ind = att ? att.indicator : "";
    wins.forEach((w, i) => setText(w, ind[i] ?? "·"));
    setText(winGroup, ind ? `Message indicator ${ind.split("").join(" ")}` : "No indicator yet");
    const cp = s.activeRx === null ? "" : store.copyText(s.activeRx, s.activeAttempt);
    setText(mini, cp.length === 0 ? "copy: (empty)" : `copy: ${cp.length > 28 ? "…" + cp.slice(-27) : cp}`);
    const ok = s.boat.canTransmit;
    setFrame(status, "status-lamp", ok ? 1 : 2);
    setText(statusTxt, ok ? "Transmitter ready" : s.boat.silence ? "Radio silence" : "Antenna down");
    status.title = statusTxt.textContent ?? "";
  };
  ctx.scope.on(["rx", "boat", "copy"], refresh);
  refresh();
  root.append(m);
  const plainLetters = (): string => { const a = store.activeView()?.analysis.get(store.state.activeAttempt); return a ? a.words.map((w) => w.plain).join("") : ""; };
  return {
    frame: (now) => { const i = reveal.lit(now); light(i >= 0 ? plainLetters()[i] ?? null : null); },
    dispose: () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); light(null); },
  };
}
