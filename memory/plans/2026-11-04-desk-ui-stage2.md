---
schema_version: 1
id: plan-2026-11-04-desk-ui-stage2
task: memory/tasks/completed/2026-11-04-desk-ui-stage2.md
status: completed
owner: claude-desktop-session
base_commit: 9901e81
---

# Plan: desk-ui-stage2

## Confirmed scope and acceptance criterion

- In: docs/specs/desk-ui Stage 2: T2.1 paper model (flip, mouse drag, keyboard pick-up/move/drop, z-order stacking, `desk.v1` with validation), T2.2 Teletyper (lamp, progressive print of `watch.copy(tokens)` at the Morse pace, Repeat button -> `actions.repeat()` with a new Input sheet per attempt, silent rebuild), T2.3 Output sheet (your copy while typing, plain text by group after decode, damaged groups marked).
- Out: machine keyboard and lampboard (T3.1), stamps/clip/hand over/trash (Stage 3), Daily Orders, Manual, dialogue (Stage 4), sim-core.
- Acceptance criterion: papers can be dragged, flipped and moved by keyboard; positions survive reload; a second attempt prints a new Input sheet and keeps the old; Output shows the copy and then the decode; tests/tsc/build/check-repo pass; sim-core diff empty.

## Topology and blast radius

New files in src/desk (papers.ts, printer.ts, sheets.ts) and one sprite in tools/art/desk.ts; index.ts rewired. Only existing Actions are called (repeat). Typing still flows through the P5 keymap into the store copy.

## Contracts, dependencies, and failure modes

- `desk.v1` (localStorage, own key): untrusted; size cap, id allowlist regex, bounded integers, unknown entries dropped; a seed mismatch ignores the stored layout. Write failures are reported once through diag.
- Paper keyboard handling stops propagation only for keys it uses, so typing and game keys keep working.

## Ordered implementation

1. papers.ts + tests. 2. printer.ts + tests. 3. paper-output sprite. 4. sheets.ts + index.ts. 5. Verify in headless Edge, evidence, records.

## Security, reliability, and observability controls

textContent only; storage validated; no new dependency.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc, invariants test | exit 0 |
| Unit/integration | vitest papers/printer/i18n + full suites | pass |
| Runtime/user flow | Edge: drag via CDP mouse events, keyboard move, reload keeps layout, repeat prints a second sheet, decode fills Output | screenshots + eval output |
| Operations | check-repo, sim-core diff | pass, empty |

## Rollout, rollback triggers, and rollback steps

Still opt-in at `?ui=desk`. Rollback: revert the Stage 2 commits and regenerate sprites.
