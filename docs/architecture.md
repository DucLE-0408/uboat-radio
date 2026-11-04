# Architecture

Replace every placeholder before implementation. Keep this topology current; link detailed decisions to ADRs.

```text
Client/UI
  → CDN/LB/API gateway
  → API route/authn/authz/validation
  → service/domain transaction
  → DB/cache/queue/object storage/external API
  → structured logs + metrics + traces + audit events
```

## Components and ownership

| Component | Runtime/port | Owner | Data | Dependencies | Health/readiness | SLO/runbook |
|---|---|---|---|---|---|---|

## Trust and network boundaries

Document public/private listeners, TLS termination and trust, DNS/service discovery, ingress/egress, firewall/ACL, proxy behavior, CORS/CSRF, SSRF controls, rate/resource limits, and admin/metrics exposure.

## Identity and authorization flow

Document identity provider, sessions/JWT, issuer/audience/expiry, server-side RBAC/ABAC, tenant/object ownership, service identities, least privilege, and audit events.

## Data and consistency

Document schema ownership, transactions, duplicate delivery/order, cache invalidation, retention/deletion, encryption, backups/restores, migration compatibility, and disaster recovery.

## Failure and operations model

Document timeouts, cancellation, retry/idempotency, circuit breaking, backpressure, partial failure, graceful shutdown/draining, signals, alerts, capacity, rollout, and rollback triggers.

## U-Boat Radio Operator: simulation core (`packages/sim-core`)

Headless, deterministic TypeScript core (no DOM/engine). One seeded PRNG (`rng.ts`, mulberry32 + FNV-1a, `derive(seed, ...path)` for independent streams). Modules: `enigma` (M4), `morse` (element-level noisy channel + `Fist`), `messages` (genuine traffic and forgeries with verifiable tells), `auth` (Latin squares, challenge ledger, keybook), `intel` (Allied Intel ladder 0-4), `detection` (HF/DF), `events` (Event Bus; the only coupling to presentation/network). Tunables live in `data/balance.json`. Save/load is seed + event log, not snapshots. Presentation (P4+) subscribes to the Event Bus only.

### Vertical slice: one night watch (`watch.ts`, `traffic.ts`)

`Watch` is the only module that knows all others. Each tick (fixed 1 s) runs in a fixed order: timers -> boat -> transmit/HF-DF/Intel -> sonar -> Intel sync -> end check; every subsystem has its own seeded stream (`derive(seed, name, ...)`). Player input is a `Command` (heading, speed, mode, silence, transmit, repeat, challenge, check, resolve); the save file is `seed + commandLog`, rebuilt with `replay()`. Inbound traffic goes plaintext -> Enigma M4 (day key, per-attempt indicator) -> Vierergruppen + check letter -> Morse -> channel noise at `rxSnrDb - boat.radio().snrPenaltyDb`, and the operator-side `decipher` resets rotors at every group. Transmitting (repeat requests, challenges, acks, reports) feeds `HfdfDetector` and `Intel`; BOAT_SUNK emits KEYBOOK_LOST and raises Intel. The operator helpers (`listen`, `decipher`, `assess`, `worldCtx`) are side-effect free. `truthOf` is a test hook only.

## Radio Room UI (`packages/radio-ui`, P4)

Plain TypeScript + DOM + Web Audio, bundled by `vite@8.3.5` (the only new devDependency). Dev/preview servers bind `127.0.0.1`. The package aliases `@uboat/sim-core` to the sim-core barrel and imports nothing else from it (enforced by `test/invariants.test.ts`, together with: no `truthOf`, no Intel/hazard reads, no `innerHTML`).

```text
keydown(event.code) -> input/keymap -> Controller.handle -> Session.dispatch(Command) -> Watch
rAF -> FixedStepLoop (1 s steps, capped catch-up, pause) -> Session.step -> Watch.bus (SimEvent)
Watch.bus -> Controller.onEvent -> Store.apply -> topic flush -> panels (DOM) / AudioEngine
```

- `sim/session.ts`: save = `{v, seed, tick, commands}` in `localStorage` (validated on load, bounded); restore = `replay(seed, commands, tick)`; `rebuildStore` re-derives UI state from the replayed event log and re-attributes `AUTH_RESULT` to its `check` command.
- `store.ts`: UI state derived from `SimEvent`s only. `INTEL_LEVEL` is dropped, `ASDIC_PING` range/bearing and `HFDF_FIX` counters are never stored, `MSG_RESOLVED.forged` is discarded (only correctness is kept).
- Observation reads (side-effect free): `Watch.decipher/assess/checkMatches/worldCtx/dayTable/listen`, `summary()` (only `tSec`, `txTotalSec`), `boat.state()/radio()` for the player's own mode/speed/heading/hull/antenna. Intel level and hazard are never displayed.
- Audio: one `AudioContext` created after the first user gesture; Morse timing from `schedule()` with a cosmetic RNG derived from a per-page seed (never the sim RNG), identical on replay of the same `(rxId, attempt)`; hydrophone beat = measured blade rate.
- Failure model: no Web Audio -> visual Morse; storage errors -> one notice, play continues; hidden tab -> sim auto-pauses (player resumes with Esc); refused commands show the reason (`refusal.ts`).
- Rollback: the package is additive; delete `packages/radio-ui` (sim-core is untouched).
