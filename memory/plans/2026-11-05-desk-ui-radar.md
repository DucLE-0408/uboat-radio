---
schema_version: 1
id: plan-2026-11-05-desk-ui-radar
task: memory/tasks/completed/2026-11-05-desk-ui-radar.md
status: completed
owner: claude-cloud-session
base_commit: 91904b5
---

# Plan: desk-ui-radar

## Confirmed scope and acceptance criterion

- In: radar schedule and hazard, Metox events, module option, store, desk toast, Helm line, menu label, strings, tests, docs, `SIM_VERSION` 4. Out: enemy positions, aircraft, countermeasures beyond diving.
- Acceptance criterion: the Metox warns before a patrol, a surfaced boat that ignores it can be picked up silently and an escort follows without an HF/DF fix, a boat that dives is not, module off and the night watch are unchanged, replay is bit-exact.

## Topology and blast radius

sim-core (radar, detection, options, events, watch, balance, index, tests), radio-ui (store, helm, desk, menu, strings, tests), docs.

## Contracts, dependencies, and failure modes

New events and a module key (missing reads as on); the version bump refuses old saves.

## Ordered implementation

1. Balance, `radar.ts`, module option, events. 2. `checkRadar`, tests, digest guard fix. 3. Store, desk, Helm, menu, strings. 4. Docs.

## Security, reliability, and observability controls

Pure function of seed and time; the UI never sees the pick-up.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit | vitest both | pass |
| Runtime/user flow | Playwright Endless seed 24 | Metox toast and Helm line, no console errors |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
