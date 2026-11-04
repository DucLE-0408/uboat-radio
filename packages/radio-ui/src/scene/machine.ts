import type { Ctx } from "../ctx";
import { setText } from "../dom";
import { paint, place, setFrame, sliceVars } from "./px";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

const DIGITS = "1234567890";
const ROWS = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"] as const; // Enigma keyboard order
const codeOf = (ch: string): string => (/[0-9]/.test(ch) ? `Digit${ch}` : `Key${ch}`);

/** Cipher machine: nameplate, 4 rotor windows (M4 indicator), lampboard (lit by decode in stage 4), working keyboard. */
export function mountMachine(ctx: Ctx, root: HTMLElement): () => void {
  const { store, input } = ctx;
  const m = mk("section", "sc mach"); m.setAttribute("aria-label", "Cipher machine"); place(m, 424, 108, 208, 244); paint(m, "machine");
  const plate = mk("div", "plate lbl"); plate.textContent = "Funk-M4"; place(plate, 8, 4, 192, 14); m.append(plate);

  const wins = [45, 77, 109, 141].map((x) => { const w = mk("div", "win"); place(w, x, 22, 22, 28); w.textContent = "·"; m.append(w); return w; });
  const winGroup = mk("span", "sr-only"); m.append(winGroup);
  const status = mk("span", "sc"); place(status, 180, 26, 16, 22); paint(status, "status-lamp", 1); m.append(status);
  const statusTxt = mk("span", "sr-only"); m.append(statusTxt);

  // lampboard (decorative here; lit sequentially by decode in stage 4)
  const lampRows: [string, number, number][] = [[ROWS[0], 14, 62], [ROWS[1], 24, 80], [ROWS[2], 14, 98]];
  const lampBoard = mk("div", "sc"); lampBoard.style.inset = "0"; lampBoard.setAttribute("role", "img"); lampBoard.setAttribute("aria-label", "Lampboard showing the deciphered letters"); m.append(lampBoard);
  for (const [letters, x0, y] of lampRows) [...letters].forEach((ch, k) => { const l = mk("span", "slamp"); l.dataset["ch"] = ch; place(l, x0 + k * 20, y, 14, 14); paint(l, "lamp", 0); l.textContent = ch; lampBoard.append(l); });

  // keyboard
  const buttons = new Map<string, HTMLButtonElement>(); // event.code -> key (for physical-key feedback)
  const addKey = (label: string, x: number, y: number, w: number, kind: "round" | "wide", code: string, aria: string, act: () => void): void => {
    const b = mk("button", `key ${kind}`); b.type = "button"; b.textContent = label; b.setAttribute("aria-label", aria); place(b, x, y, w, 16);
    if (kind === "round") paint(b, "key-round", 0); else sliceVars(b, "keywide");
    b.addEventListener("click", act); m.append(b); buttons.set(code, b);
  };
  [...DIGITS].forEach((ch, k) => addKey(ch, 9 + k * 19, 124, 16, "round", codeOf(ch), `Key ${ch}`, () => input.handle({ t: "char", ch })));
  [["QWERTZUIO", 14, 144], ["ASDFGHJK", 24, 162], ["PYXCVBNML", 14, 180]].forEach(([letters, x0, y]) => [...(letters as string)].forEach((ch, k) => addKey(ch, (x0 as number) + k * 20, y as number, 16, "round", codeOf(ch), `Key ${ch}`, () => input.handle({ t: "char", ch }))));
  addKey("?", 14, 202, 16, "round", "Slash", "Unreadable character (?)", () => input.handle({ t: "char", ch: "?" }));
  addKey("Space", 36, 202, 76, "wide", "Space", "Space: end the current group", () => input.handle({ t: "space" }));
  addKey("Del", 116, 202, 28, "wide", "Backspace", "Delete the last character", () => input.handle({ t: "backspace" }));
  addKey("Decode", 148, 202, 44, "wide", "Enter", "Decode your copy (Enter)", () => input.handle({ t: "confirm" }));
  buttons.get("Enter")?.classList.add("go");

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
    const ok = s.boat.canTransmit;
    setFrame(status, "status-lamp", ok ? 1 : 2);
    setText(statusTxt, ok ? "Transmitter ready" : s.boat.silence ? "Radio silence" : "Antenna down");
    status.title = statusTxt.textContent ?? "";
  };
  store.on(["rx", "boat"], refresh);
  refresh();
  root.append(m);
  return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
}
