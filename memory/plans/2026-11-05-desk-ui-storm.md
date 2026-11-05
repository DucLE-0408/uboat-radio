---
schema_version: 1
id: plan-2026-11-05-desk-ui-storm
task: memory/tasks/completed/2026-11-05-desk-ui-storm.md
status: completed
owner: claude-cloud-session
base_commit: 21712f4
---

# Plan: desk-ui-storm

## Confirmed scope and acceptance criterion

- In: sea speed factor, boat hook, rarer storms, Helm line and toast, strings, tests, docs, `SIM_VERSION` 2. Out: order deadlines, sighting hazard, wave damage.
- Acceptance criterion: a rough sea lowers the surfaced top speed (periscope half, dived none), the weather-off and night watches keep full speed, replay is bit-exact, the Helm shows the reported ceiling.

## Topology and blast radius

sim-core (weather, boat, watch, balance, simversion, index, tests), radio-ui (helm, desk, strings), docs.

## Contracts, dependencies, and failure modes

Additive balance keys; exported `seaSpeedFactor`; the version bump refuses old saves.

## Ordered implementation

1. Balance, `seaSpeedFactor`, `Boat.setSeaFactor`, Watch hook. 2. Tests and digests. 3. Helm line and toast, strings. 4. Docs.

## Security, reliability, and observability controls

Pure function of seed and time; the UI sees only reported values.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit | vitest both | pass |
| Runtime/user flow | Playwright Endless seed 41 | storm line on the Helm, no console errors |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
