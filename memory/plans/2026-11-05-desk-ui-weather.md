---
schema_version: 1
id: plan-2026-11-05-desk-ui-weather
task: memory/tasks/completed/2026-11-05-desk-ui-weather.md
status: completed
owner: claude-cloud-session
base_commit: 3150bac
---

# Plan: desk-ui-weather

## Confirmed scope and acceptance criterion

- In: weather module and model, bridge reports, sighting hazard, store, desk toast, Helm fog and line, menu, tests, docs. Out: storms slowing the boat, `simVersion` in saves.
- Acceptance criterion: reports follow the model with noise, a surfaced boat in clear air is sighted and escorted without an HF/DF fix, a submerged boat is not, module off and night watch are bit-identical, replay is bit-exact.

## Topology and blast radius

sim-core (weather, detection, options, watch, events, balance), radio-ui (store, helm, desk, menu, strings), docs.

## Contracts, dependencies, and failure modes

New events additive; the model exists only with options and the module.

## Ordered implementation

1. Balance, `weather.ts`, module option. 2. `visualContact`, `checkWeather`, events. 3. Tests. 4. Store, desk, Helm, menu. 5. Docs.

## Security, reliability, and observability controls

Pure function of seed and time; separate RNG streams; the UI sees only noisy reports.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit | vitest both | pass |
| Runtime/user flow | Playwright Endless run | weather readout, no console errors |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
