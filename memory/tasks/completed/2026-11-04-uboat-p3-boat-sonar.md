---
schema_version: 1
id: task-2026-11-04-uboat-p3-boat-sonar
status: completed
owner: claude
goal_confirmed_at: 2026-11-04T00:15:46.5965232Z
started_at: 2026-11-04T00:15:46.5965232Z
updated_at: 2026-11-04T00:17:29.7873962Z
base_commit: 70c934e024501492afb2ebc03f3a8845f39cc645
owned_paths:
  - packages/sim-core
plan: null
handoff: null
---

# Task: uboat-p3-boat-sonar

## User-confirmed goal

- Confirmation reference: User approval in chat: continue coding after new repo (P3 proposed in prior reply)
- Outcome and acceptance criteria: Deterministic sonar (SNR/TL/NL, blade-rate classification, ASDIC ping events) and boat FSM (surface/periscope/dive, radio feedback) in packages/sim-core with passing tests; no UI.
- In scope / out of scope: In scope: sonar.ts, boat.ts, new bus events, balance.json sonar/boat sections. Out of scope: campaign loop/vertical slice wiring, UI, save/load.
- Material assumptions and risks: Depth-charge pattern depth is a fixed config value (100 m) until the escort model supplies one; balance values are untuned placeholders.

## Architecture linkage

SonarField.tick -> ASDIC_PING on Event Bus -> Boat (consumes, emits BRIDGE_ALERT/BOAT_*); Boat.radio() -> exposure/SNR penalty consumed by detection.ts and morse SNR. boat.ts imports only balance + events.

## Progress and decisions

## Verification

- Command/check: `npx tsc --noEmit`, `npx vitest run` (packages/sim-core); `./scripts/check-repo.ps1`
- Result: `passed`
- Evidence/reason: tsc exit 0; vitest 6 files / 59 tests passed.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: headless; covered by tests (mode FSM transitions, ASDIC->Bridge alert, depth-charge damage/sinking, SNR/bearing math).
- Health/readiness/log/error inspection: no services started.
- Integration/dependency/config/migration check: no new dependencies; balance.ts types extended.
- Remaining issue or reason not verified: `not verified`: tension/fun and balance of noise/ASDIC numbers; Boat.radio() not yet wired into detection/morse by a campaign loop.

## Security, observability, risk, and rollback

- Security impact: none (pure sim, no I/O).
- Observability impact: new events BOAT_MODE/BOAT_DAMAGED/BOAT_SUNK/BRIDGE_ALERT/ASDIC_PING in the replay log.
- Residual risk: untuned balance; sunk boat does not yet trigger KEYBOOK_LOST/Intel jump (campaign layer).
- Rollback: revert the P3 commit (additive).
- Next safe action: vertical slice campaign loop wiring Boat.radio() -> detection/morse and BOAT_SUNK -> keybook/Intel.
