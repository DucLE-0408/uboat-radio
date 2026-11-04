import { AudioEngine } from "../src/audio/engine";
import { Hydrophone } from "../src/audio/hydrophone";
import { MorsePlayer } from "../src/audio/morse";
import { Controller } from "../src/controller";
import { FixedStepLoop } from "../src/sim/loop";
import { Session } from "../src/sim/session";
import { rebuildStore, Store } from "../src/store";

/** Controller wired to a real Session/Store with inert audio (no AudioContext in node). */
export function harness(seed: number, restoreFrom?: Session): { session: Session; store: Store; ctl: Controller; played: string[]; flags: { showMorse: boolean; simSpeed: number } } {
  const store = new Store();
  const session = restoreFrom ?? Session.fresh(seed, null);
  if (restoreFrom) rebuildStore(store, restoreFrom.watch.bus.getLog(), restoreFrom.watch.commandLog(), restoreFrom.watch.tSec);
  const audio = new AudioEngine();
  const morse = new MorsePlayer(audio);
  const played: string[] = [];
  morse.play = (plan) => { played.push(`play:${plan.endSec.toFixed(2)}`); return true; };
  const flags = { showMorse: false, simSpeed: 1 };
  const ctl = new Controller(session, store, audio, morse, new Hydrophone(audio), new FixedStepLoop(), { storage: null, navigate: () => {}, cosmeticSeed: 1, ctxRef: { flags } });
  return { session, store, ctl, played, flags };
}

export function runTo(h: { ctl: Controller; session: Session }, tSec: number): void {
  while (h.session.watch.tSec < tSec && h.session.watch.endReason === null) h.ctl.stepSim();
}
