import { describe, expect, it } from "vitest";
import { Watch } from "../src/watch";
import { defaultOptions } from "../src/options";
import { fnv1a } from "../src/rng";
import { BALANCE } from "../src/balance";
import { SIM_VERSION } from "../src/simversion";

/** A scripted run: it steers, changes speed, dives and surfaces, and transmits, so most rules contribute to the log. */
function digest(seed: number, opts?: ReturnType<typeof defaultOptions>): string {
  const w = new Watch(seed, BALANCE, opts);
  const script: [number, () => void][] = [
    [60, () => w.dispatch({ kind: "speed", kn: 8 })], [120, () => w.dispatch({ kind: "heading", deg: 70 })],
    [600, () => w.dispatch({ kind: "transmit", seconds: 40 })], [900, () => w.dispatch({ kind: "mode", mode: "periscope" })],
    [1200, () => w.dispatch({ kind: "mode", mode: "dive" })], [1500, () => w.dispatch({ kind: "heading", deg: 200 })], [2400, () => w.dispatch({ kind: "mode", mode: "surface" })], [4200, () => w.dispatch({ kind: "heading", deg: 20 })],
  ];
  for (const [t, f] of script) { w.runUntil(t); f(); }
  w.runUntil(7200); // long enough for the first radar patrol (it starts after 30 minutes)
  return fnv1a(JSON.stringify(w.bus.getLog())).toString(16);
}

describe("sim version guard", () => {
  // If these fail you changed what a saved game replays into. Bump SIM_VERSION (src/simversion.ts), then update the digests.
  const GOLDEN = { sim: 5, night: "60dcf0c", endless: "45dd281a" };
  it("the replay digests match the declared SIM_VERSION", () => {
    expect({ sim: SIM_VERSION, night: digest(1), endless: digest(24, defaultOptions("endless")) }).toEqual(GOLDEN);
  });
});
