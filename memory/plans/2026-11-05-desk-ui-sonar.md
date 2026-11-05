---
schema_version: 1
id: plan-2026-11-05-desk-ui-sonar
task: memory/tasks/completed/2026-11-05-desk-ui-sonar.md
status: completed
owner: claude-cloud-session
base_commit: 4171bf2
---

# Plan: desk-ui-sonar

## Confirmed scope and acceptance criterion

- In: sea link for sonar and ASDIC, `detectRangeKm`, store history, drawer redesign in the existing style, strings, tests, docs, `SIM_VERSION` 3. Out: TMA, thermocline, active sonar.
- Acceptance criterion: weather sea state drives hearing and the ASDIC factor only with the module, the drawer shows trace, bands, conditions and banner with no range, replay stays bit-exact, the night watch is unchanged.

## Topology and blast radius

sim-core (sonar, weather, watch, balance, index, simversion, tests), radio-ui (store, scene/drawers, sonarview, css, strings, tests), docs.

## Contracts, dependencies, and failure modes

Additive balance key and exports; the optional `seaState` argument of `SonarField.tick`; the version bump refuses old saves.

## Ordered implementation

1. Balance, factor, `detectRangeKm`, Watch link. 2. Tests and digests. 3. Store history and ASDIC time. 4. Drawer, css, strings. 5. Docs.

## Security, reliability, and observability controls

Pure function of seed and time; the UI sees only reported values.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit | vitest both | pass |
| Runtime/user flow | Playwright Endless seed 24 | conditions, trace and table in the drawer, no console errors |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
