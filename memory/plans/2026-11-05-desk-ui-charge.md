---
schema_version: 1
id: plan-2026-11-05-desk-ui-charge
task: memory/tasks/completed/2026-11-05-desk-ui-charge.md
status: completed
owner: claude-cloud-session
base_commit: ba621a9
---

# Plan: desk-ui-charge

## Confirmed scope and acceptance criterion

- In: charge model, `CHARGE_EFFECT`, store, desk toast, Helm warning, tests, docs. Out: new weapons, enemy fire tuning.
- Acceptance criterion: a charge over a shallow floor bursts near the floor and hits a surfaced boat (flagged shallow), deep water is unchanged, replay is bit-exact, the night watch is unchanged.

## Topology and blast radius

sim-core (seabed, boat, watch, events, balance), radio-ui (store, helm, desk, strings), docs.

## Contracts, dependencies, and failure modes

New event additive; the model exists only with options.

## Ordered implementation

1. Balance and `chargeEffect`. 2. Boat hook and event. 3. Tests. 4. Store, desk, Helm. 5. Docs.

## Security, reliability, and observability controls

Pure function of true floor and depth; no new inputs.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit | vitest both | pass |
| Runtime/user flow | Playwright smoke | no console errors |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
