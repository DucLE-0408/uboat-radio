---
schema_version: 1
id: plan-2026-11-05-desk-ui-seabed
task: memory/tasks/completed/2026-11-05-desk-ui-seabed.md
status: completed
owner: claude-cloud-session
base_commit: 22fb63c
---

# Plan: desk-ui-seabed

## Confirmed scope and acceptance criterion

- In: seabed, shoal warning, bottoming, chart and Helm depth display and locks. Out: depth-charge changes, currents, tides.
- Acceptance criterion: diving toward a shoal warns, then touches bottom (hull, ration, note), the Helm shows the surveyed depth and locks the dive buttons where the chart is too shallow, replay is bit-exact, and the night watch is unchanged.

## Topology and blast radius

sim-core (seabed, boat, watch, events, pm, balance), radio-ui (store, helm, desk, strings), docs.

## Contracts, dependencies, and failure modes

New events additive; the seabed rule runs only with options.

## Ordered implementation

1. Balance and `seabed.ts`. 2. Boat depth API, `checkSeabed`. 3. Tests. 4. Store, Helm, desk. 5. Runtime, docs.

## Security, reliability, and observability controls

Pure functions of the true position; no new inputs.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit | vitest both | pass |
| Runtime/user flow | Playwright: dive over a shoal | toasts, depth and ration change, screenshots |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
