---
schema_version: 1
id: plan-2026-11-05-desk-ui-g4-sim
task: memory/tasks/completed/2026-11-05-desk-ui-g4-sim.md
status: completed
owner: claude-cloud-session
base_commit: 653d142
---

# Plan: desk-ui-g4-sim

## Confirmed scope and acceptance criterion

- In: spec stages 1 to 3 (T1.1 to T1.4, T2.1, T2.2, T3.1 to T3.3). Out: desk UI.
- Acceptance criterion: same seed + options + log gives the same events; modules and difficulty are independent; D8 holds on every module set; the night watch without options is unchanged.

## Topology and blast radius

sim-core new modules and optional constructor argument; events additive; radio-ui save parser and store state.

## Contracts, dependencies, and failure modes

Options validated (`parseOptions`); `send` validated; invalid saves rejected; no dependency.

## Ordered implementation

1. Options, pacing, roster, PM, send helpers. 2. Watch integration. 3. Tests. 4. Save v3 and store.

## Security, reliability, and observability controls

Bounded pending messages and sends; deterministic streams under new `derive` paths so existing streams do not move.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit/property | vitest both | pass |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
