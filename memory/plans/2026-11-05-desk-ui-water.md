---
schema_version: 1
id: plan-2026-11-05-desk-ui-water
task: memory/tasks/completed/2026-11-05-desk-ui-water.md
status: completed
owner: claude-cloud-session
base_commit: ee50493
---

# Plan: desk-ui-water

## Confirmed scope and acceptance criterion

- In: water field, thermocline effects on hearing and ASDIC, thermometer events, chart publication, module option, store, Helm overlay and reading, sonar drawer line, menu label, strings, tests, docs, `SIM_VERSION` 5. Out: battery, sound speed detail, currents, seasons.
- Acceptance criterion: below the layer surface ships are muffled and ASDIC is weaker, the thermometer reports noisy readings at the estimated position, the Helm overlay shows the climatology and the readings, module off and the night watch are unchanged, replay is bit-exact.

## Topology and blast radius

sim-core (water, sonar, options, events, watch, balance, index, simversion, tests), radio-ui (store, desk/helm, desk/water, scene/drawers, menu, strings, tests), docs.

## Contracts, dependencies, and failure modes

New event and module key (missing reads as on); optional arguments on `SonarField.observe` and `tick`; the version bump refuses old saves.

## Ordered implementation

1. Balance, `water.ts`, module option, event. 2. Sonar arguments, `checkWater`, `belowLayer`, tests, digest. 3. Store, Helm overlay and button, readout, sonar drawer line, menu, strings. 4. Docs.

## Security, reliability, and observability controls

Pure function of seed and position; the UI sees only noisy readings and the climatology.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit | vitest both | pass |
| Runtime/user flow | Playwright Endless seed 24 | TEMP overlay, reading line and drawer line, no console errors |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
