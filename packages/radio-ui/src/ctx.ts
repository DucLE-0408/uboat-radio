// Shared wiring types so panels depend on an interface, not on the controller implementation.
import type { Watch } from "@uboat/sim-core";
import type { AudioEngine } from "./audio/engine";
import type { MorsePlayer } from "./audio/morse";
import type { Diag } from "./diag";
import type { Action } from "./input/keymap";
import type { Store } from "./store";

export type BoatOrder = "surface" | "periscope" | "dive";

export interface Actions {
  decode(): void;
  replayAudio(): void;
  repeat(): void;
  challenge(): void;
  check(): void;
  resolve(decision: "accept" | "reject"): void;
  report(seconds: number): void;
  toggleSilence(): void;
  setMode(m: BoatOrder): void;
  steerHeading(delta: number): void;
  steerSpeed(delta: number): void;
  setSpeedTo(kn: number): void;
  toggleHydrophone(contactId?: number): void;
  togglePause(): void;
  setSimSpeed(factor: number): void;
  toggleLookup(): void;
  lookupCell(row: string, col: string): void;
  dismissEmergency(): void;
  openAuthTable(): void;
  openDrawer(d: "sonar" | "log"): void;
  closeDrawer(): void;
  showView(v: "copy" | "plain"): void;
  newGame(sameSeed: boolean): void;
  /** Saves the watch and returns to the main menu (reloads the page; nothing is lost). */
  openMenu(): void;
}

export interface Ctx {
  readonly store: Store;
  /** Read-only observation helpers only (dayTable, worldCtx); the controller owns dispatch. Ground truth is never read. */
  readonly watch: Watch;
  readonly audio: AudioEngine;
  readonly morse: MorsePlayer;
  readonly actions: Actions;
  /** Routes resolved key actions (typing, lookup, ...) into the controller. */
  readonly input: { handle(a: Action): void };
  readonly diag: Diag;
  readonly seed: number;
  /** Seed of the purely cosmetic RNG streams (audio jitter, blinks, flicker); never the simulation seed. */
  readonly cosmeticSeed: number;
  readonly flags: { showMorse: boolean; simSpeed: number; reduceMotion?: boolean };
}

export interface Panel { readonly el: HTMLElement; frame?(): void }
