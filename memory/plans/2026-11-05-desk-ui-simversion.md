---
schema_version: 1
id: plan-2026-11-05-desk-ui-simversion
task: memory/tasks/completed/2026-11-05-desk-ui-simversion.md
status: completed
owner: claude-cloud-session
base_commit: a0f74c5
---

# Plan: desk-ui-simversion

## Confirmed scope and acceptance criterion

- In: `SIM_VERSION`, save field, restore and menu handling, digest guard test, docs. Out: migration, balance hash, cloud saves.
- Acceptance criterion: a different-version save is not replayed or rewritten and the menu explains it; a save without the field loads; sim behaviour changes without a bump fail a test.

## Topology and blast radius

sim-core (`simversion.ts`, index, test), radio-ui (`sim/session.ts`, `menu/model.ts`, `menu/menu.ts`, tests), docs.

## Contracts, dependencies, and failure modes

Additive save field; unknown or malformed `sim` is rejected at parse.

## Ordered implementation

1. `SIM_VERSION` and digest test. 2. Save field, `isCompatible`, restore. 3. Menu. 4. Tests. 5. Docs.

## Security, reliability, and observability controls

The field is a bounded integer validated at the storage boundary; an incompatible save is never rewritten.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc both | exit 0 |
| Unit | vitest both | pass |
| Runtime/user flow | Playwright menu with a sim 99 save | Continue disabled, note shown, save kept |
| Operations | validate_repo | pass |

## Rollout, rollback triggers, and rollback steps

Rollback: revert the PR.
