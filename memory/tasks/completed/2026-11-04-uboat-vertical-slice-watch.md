---
schema_version: 1
id: task-2026-11-04-uboat-vertical-slice-watch
status: completed
owner: claude
goal_confirmed_at: 2026-11-04T01:27:58.2181461Z
started_at: 2026-11-04T01:27:58.2181461Z
updated_at: 2026-11-04T01:31:55.5309323Z
base_commit: 1ea9f951ffa9cf86135f7b86dbe9fd0aead581d0
owned_paths:
  - packages/sim-core/src/watch.ts
  - packages/sim-core/src/traffic.ts
  - packages/sim-core/src/events.ts
  - packages/sim-core/src/index.ts
  - packages/sim-core/data/balance.json
  - packages/sim-core/src/balance.ts
  - packages/sim-core/test/watch.test.ts
  - docs/architecture.md
plan: null
handoff: null
---

# Task: uboat-vertical-slice-watch

## User-confirmed goal

- Confirmation reference: user: "Làm vertical slice" in reply to the scope listed in the prior turn (one night watch: 1 noisy Morse message, 1 challenge-reply session, 1 sonar contact, 1 Intel-2 forgery)
- Outcome and acceptance criteria: Headless deterministic night-watch loop (`Watch`) in packages/sim-core wiring Boat.radio() to HF/DF + Intel + Morse noise and BOAT_SUNK to keybook/Intel; save/load = seed + command log; tests cover the four slice elements, determinism and replay.
- In scope / out of scope: In scope: watch.ts, traffic.ts (Enigma+Morse+check-letter pipeline), new bus events, `watch` balance section, tests, architecture doc. Out of scope: any UI (P4/P5), NPC boats/campaign across nights, MessagePack serialization, balance tuning.
- Material assumptions and risks: Scenario starts at Allied Intel score 45 (level 2) so the scripted forgery is Intel-2; a repeat request uses a fresh indicator and feeds Intel via the repeated request pattern; accepting a forgery spawns one escort (simplified ambush); balance values are untuned.

## Architecture linkage

Command (player) -> Watch.dispatch -> Boat / transmit queue -> HfdfDetector + Intel -> Event Bus -> Boat (BRIDGE_ALERT, damage) / presentation. Inbound: scenario timer -> messages generator -> traffic.ts (Enigma M4, Vierergruppen, check letter, Morse) -> applyNoise(SNR - boat.radio().snrPenaltyDb) -> MSG_RX. BOAT_SUNK -> KEYBOOK_LOST + Intel.codebookLost -> WATCH_END. boat.ts still imports only balance + events.

## Progress and decisions

- Found and fixed during testing: sender's check letter was computed over unpadded plaintext while the receiver deciphers the padded text, so even noiseless copies failed the check. Both sides now use the padded plaintext (`trueCheckLetter`).
- Resync: the operator's decipher resets rotors at each Vierergruppe start, so damage stays inside the damaged group.
- Observation helpers (listen/decipher/assess/worldCtx) use stateless RNG or none, so they never perturb the sim (tested).
- Submerged boat misses traffic; delivery retries every 10 s until the antenna is up.

## Verification

- Command/check: `npx tsc --noEmit` and `npx vitest run` in packages/sim-core; `./scripts/check-repo.ps1`
- Result: `passed`
- Evidence/reason: tsc exit 0; vitest 7 files / 70 tests passed (11 new in watch.test.ts). Measured over 200 seeds: about 51% of first Morse copies are clean at the default 34 dB SNR.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: headless; tests drive a scripted operator through copy -> decipher -> check letter -> repeat -> challenge -> check -> accept/reject, sonar contact, HF/DF chain, dive/surface radio gating, sinking, replay equality.
- Health/readiness/log/error inspection: no services started.
- Integration/dependency/config/migration check: no new dependencies; balance.ts and the event union extended additively.
- Remaining issue or reason not verified: `not verified`: whether the watch is tense and fun (never played by a human), and balance of noise, hazard, Intel start score and ambush numbers. Only the Intel-2 forgery path is scripted; levels 0/1/3/4 are covered by the earlier generator tests, not by Watch.

## Security, observability, risk, and rollback

- Security impact: none (pure sim, no I/O). `truthOf` exposes ground truth and is marked TEST/DEBUG ONLY; presentation must not call it.
- Observability impact: new events SONAR_CONTACT, MSG_RX, TX, CHALLENGE_SENT, CHALLENGE_REPLY, MSG_RESOLVED, WATCH_END appear in the replayable log.
- Residual risk: untuned balance; one-night scenario only; day fixed at 1.
- Rollback: revert the vertical-slice commit (additive).
- Next safe action: P4 Radio Room UI over the Event Bus (raw keycode input, Morse audio from `schedule`), then playtest and tune.
