# @uboat/sim-core: the simulation

Headless, deterministic TypeScript (strict). No DOM, no engine, no network. The UI and any other client subscribe to its **events**; nothing reaches back into it except the player's commands.

## Determinism

- One seeded PRNG (`rng.ts`); every feature draws from its own named stream, `derive(seed, "name", ...)`, so adding a feature does not move another's numbers.
- A fixed one-second step. Time-dependent models (weather, radar patrols, water) are pure functions of the seed and the time or position, so no RNG state advances with them.
- A save is **seed + options + command log**. The watch is rebuilt by replaying it, and the event log is identical bit for bit.
- Without options (the plain night watch) none of the newer rules exist: its events do not change (the night digest in `test/simversion.test.ts` stays the same).

## Layout

| File | Role |
|---|---|
| `watch.ts` | the watch: tick order, commands, events; ties everything together |
| `boat.ts`, `seabed.ts`, `water.ts`, `weather.ts`, `radar.ts` | the boat, the sea floor, water temperature and thermocline, weather, enemy radar |
| `sonar.ts`, `detection.ts` | hydrophone and ASDIC, HF/DF and visual or radar contacts leading to an escort |
| `enigma.ts`, `morse.ts`, `auth.ts`, `messages.ts`, `intel.ts` | the radio room: cipher, noisy Morse, authentication, forgeries with verifiable tells, Allied Intel |
| `paper.ts`, `endless.ts`, `pm.ts`, `roster.ts`, `send.ts`, `options.ts` | the desk: paperwork rules, Endless pacing, private messages, crew, replies, modules |
| `events.ts` | the event bus: the only coupling to presentation |
| `simversion.ts` | `SIM_VERSION`, the behaviour version of saves |
| `data/balance.json`, `balance.ts` | every tunable number, with its type |

## Rules that matter

- **D1′/D3**: the UI gets measurements and published charts, never the true position, enemy, hazard or true weather and water.
- **D8**: a forged message always has at least one verifiable tell.
- **D10**: without options the night watch is bit-identical to before.
- **D9**: everything a client shows can be rebuilt from seed, options and commands.

## Changing behaviour: bump `SIM_VERSION`

Any change that makes an existing save replay into a different game (a rule, a balance number, an RNG stream, an event shape) must bump `SIM_VERSION` in the same change. `test/simversion.test.ts` replays two scripted watches (night and Endless, 7200 s with commands) and compares event-log digests with the declared version, so a missed bump fails the test; the fix is to bump the version and update the digests. A new rule must also be reachable by that script, or extend the script.

## Run

```bash
npm ci
npm run typecheck
npm test            # vitest
```
