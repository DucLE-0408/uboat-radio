---
schema_version: 1
id: plan-2026-11-05-desk-ui-coast
task: memory/tasks/completed/2026-11-05-desk-ui-coast.md
status: completed
owner: claude-cloud-session
base_commit: 88b478f
---

# Plan: desk-ui-coast

## Confirmed scope and acceptance criterion

- In: coast rule with options, Endless start near the coast, margins, desk and Helm feedback. Out: shallow-water rules.
- Acceptance criterion: sailing east in Endless warns, runs the boat aground at the shore with hull damage, Intel and a note, the rule replays bit for bit, and the night watch is unchanged.

## Topology and blast radius

sim-core (balance, boat, messages, paper, intel, watch, events, pm), radio-ui (store, helm, desk, strings), docs.

## Contracts, dependencies, and failure modes

New events additive; the start position changes only for watches with options.

## Ordered implementation

1. Balance and geometry. 2. Boat hold and damage, `checkCoast`. 3. Tests. 4. Store, Helm, desk. 5. Runtime, docs.

## Security, reliability, and observability controls

Pure functions of the true position; no new inputs.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit | vitest both | pass |
| Runtime/user flow | Playwright: sail to the coast | toasts, hull and ration change, screenshot |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
