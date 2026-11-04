// Entry point: wires Session -> Store -> panels, the fixed-step render loop, keyboard and audio unlock.
import "./style.css";
import { AudioEngine } from "./audio/engine";
import { Hydrophone } from "./audio/hydrophone";
import { MorsePlayer } from "./audio/morse";
import { Controller } from "./controller";
import { mountClassic } from "./classic";
import type { Ctx } from "./ctx";
import { resolveKey, shouldPrevent } from "./input/keymap";
import { blursAfterPointer, routeKey } from "./input/modes";
import { mountScene } from "./scene";
import { FixedStepLoop } from "./sim/loop";
import { Session, type StorageLike } from "./sim/session";
import { rebuildStore, Store } from "./store";

const app = document.getElementById("app");
if (!app) throw new Error("#app missing");

// ---- boundary parsing of the URL (untrusted input) ----
const params = new URLSearchParams(location.search);
const seedParam = /^\d{1,10}$/.test(params.get("seed") ?? "") ? Number(params.get("seed")) : null;
const speedParam = Number(params.get("speed"));
const initialSpeed = Number.isFinite(speedParam) && speedParam >= 1 && speedParam <= 60 ? speedParam : 1; // >1x also used for test playthroughs

let storage: StorageLike | null = null;
try { storage = window.localStorage; } catch { storage = null; }

const randomSeed = (): number => crypto.getRandomValues(new Uint32Array(1))[0] as number; // UI boundary only, never inside the sim
const store = new Store();
let storageWarned = false;
const onStorageError = (): void => {
  if (storageWarned) return;
  storageWarned = true;
  store.notify("Browser storage is unavailable — this watch will not survive a reload.");
};

const restored = Session.restore(storage, seedParam, onStorageError);
const session = restored ?? Session.fresh(seedParam ?? randomSeed(), storage, onStorageError);
if (restored) rebuildStore(store, restored.watch.bus.getLog(), restored.watch.commandLog());

const audio = new AudioEngine();
const morse = new MorsePlayer(audio);
const hydro = new Hydrophone(audio);
const loop = new FixedStepLoop();
loop.setSpeed(initialSpeed);
const flags: Ctx["flags"] = { showMorse: !audio.supported, simSpeed: initialSpeed };

const controller = new Controller(session, store, audio, morse, hydro, loop, {
  storage,
  navigate: (q) => { location.assign(`${location.pathname}${q}`); },
  cosmeticSeed: randomSeed(), // separate stream for audio jitter (R1.2)
  ctxRef: { flags },
});
const ctx: Ctx = { store, watch: session.watch, audio, morse, actions: controller, input: controller, seed: session.seed, flags };

const ui = params.get("ui");
const view: { frame(): void } = ui === "p5" ? mountScene(ctx, app) : mountClassic(ctx, app);

controller.syncTelemetry();
store.on(["ui", "alert", "ended", "clock"], () => document.body.classList.toggle("emergency", store.state.emergency.reason !== null && store.state.ended === null));
store.mark("rx", "copy", "analysis", "challenge", "sonar", "tx", "boat", "log", "ui", "clock", "ended");
store.flush();

// ---- input ----
window.addEventListener("keydown", (ev) => {
  audio.unlock(); // any key counts as the user gesture that enables sound (R2.2)
  if (ev.repeat && ev.code !== "Backspace") return;
  const t = ev.target as HTMLElement | null;
  const route = routeKey(ev.code, t ? { tag: t.tagName, editable: t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable } : null);
  if (route === "control") return; // Tab navigation and button activation stay with the browser (R3.5)
  const action = resolveKey(ev, { emergency: store.state.emergency.reason !== null, lookup: store.state.lookup.active });
  if (shouldPrevent(action) && action) { ev.preventDefault(); controller.handle(action); store.flush(); }
});
window.addEventListener("pointerdown", () => audio.unlock());
// After a MOUSE click the button must not keep focus, or Enter/Space would re-press it instead of decoding/spacing.
// Keyboard activation has detail === 0 and keeps focus (accessibility).
document.addEventListener("click", (ev) => { const t = ev.target as HTMLElement | null; if (blursAfterPointer(ev.detail) && t?.closest("button")) (t.closest("button") as HTMLElement).blur(); });

// A hidden tab freezes the sim; the player resumes explicitly (design s9).
document.addEventListener("visibilitychange", () => { if (document.hidden) controller.autoPause(); });
window.addEventListener("pagehide", () => session.save());

// ---- render loop: rAF only feeds the fixed-step accumulator ----
let last = performance.now();
const frame = (now: number): void => {
  const steps = loop.advance(now - last);
  last = now;
  for (let i = 0; i < steps && store.state.ended === null; i++) controller.stepSim();
  controller.frame();
  store.flush();
  view.frame();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
