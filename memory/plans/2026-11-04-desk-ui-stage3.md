---
schema_version: 1
id: plan-2026-11-04-desk-ui-stage3
task: memory/tasks/completed/2026-11-04-desk-ui-stage3.md
status: completed
owner: claude-desktop-session
base_commit: e6cc107
---

# Plan: desk-ui-stage3

## Confirmed scope and acceptance criterion

- In: docs/specs/desk-ui Stage 3. T3.1 machine G1 (pull out / push in, P5 keyboard and lampboard reused, lamps follow the decode reveal). T3.2 Echo stamper (TRUE/FALSE switch, READY lamp, arm press -> exactly one `actions.resolve` for the selected Input; the Echo mark is derived from `MSG_RESOLVED` state, never stored). T3.3 drawer with blue/red stamps, pen, clip; door hand-over; trash with rules. T3.4 Mission ticks from real actions for the selected message.
- Out: people/dialogue at the door (T4.1), boat controls and drawers (T4.2), Daily Orders/Manual (T4.3), citations/penalties (G3), sim-core.
- Acceptance criterion: a full message can be printed, typed, decoded, Echo-stamped, red-stamped, signed, clipped and handed over at `?ui=desk`; the command log gets exactly one resolve per stamped message; marks, clips and hand-over survive reload; the trash refuses mission papers with the rule; tests/tsc/build/check-repo pass; sim-core diff empty.

## Topology and blast radius

src/desk: papers.ts (state, clip, marks), rules.ts (G1 stamping rules, trash, hand-over check), echo.ts (exactly-once press), tools/stamper/machine DOM; tools/art/desk.ts new sprites. Reuses scene/machine.ts unchanged. Calls only existing Actions (resolve, repeat) and Store.selectRx/cycleAttempt (UI state).

## Contracts, dependencies, and failure modes

- Echo mark source of truth = `rx.resolved` (store, rebuilt from the event log); desk.v1 never stores it.
- A press while unresolved calls resolve once and locks; a refusal leaves no mark (the controller already reports it).
- desk.v1 grows marks/state/clip fields, validated field by field; old v1 layouts without them still load.
- Hand-over requires the Echo mark (prevents an undeliverable bundle); other rule breaks are reported, not blocked (penalties are G3).

## Ordered implementation

1. papers.ts + rules.ts + echo.ts with tests. 2. Sprites. 3. Machine pull-out + lamp reveal. 4. Stamper, drawer tools, door, trash. 5. Mission ticks. 6. Edge run of a full message, reload, evidence, records.

## Security, reliability, and observability controls

textContent only; storage validated; no dependency; no Command other than resolve/repeat.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc, invariants | exit 0 |
| Unit/integration | papers/rules/echo tests, full suites | pass |
| Runtime/user flow | Edge: full message to hand-over, command log has one resolve, reload keeps marks, trash refusal | eval output + screenshots |
| Operations | check-repo, sim-core diff | pass, empty |

## Rollout, rollback triggers, and rollback steps

Opt-in `?ui=desk`. Rollback: revert the Stage 3 commits; regenerate sprites.
