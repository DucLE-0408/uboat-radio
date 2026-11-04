---
schema_version: 1
id: task-2026-11-04-desk-ui-stage2
status: completed
owner: claude-desktop-session
goal_confirmed_at: 2026-11-04T13:09:17.5183345Z
started_at: 2026-11-04T13:09:17.5183345Z
updated_at: 2026-11-04T13:24:32.2925104Z
base_commit: 9901e812921dd020ac03d60f9c56fa7d29245cc8
owned_paths:
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/i18n
  - packages/radio-ui/tools/art/desk.ts
  - packages/radio-ui/assets
  - packages/radio-ui/test
  - docs/specs/desk-ui
  - memory/plans/2026-11-04-desk-ui-stage2.md
  - memory/tasks/active/2026-11-04-desk-ui-stage2.md
plan: memory/plans/2026-11-04-desk-ui-stage2.md
handoff: null
---

# Task: desk-ui-stage2

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-04: "tiep tuc voi stage 2" after the Stage 1 PR
- Outcome and acceptance criteria: Desk UI Stage 2: paper model (drag, flip, keyboard, stacking, desk.v1), Teletyper progressive print + repeat, Output sheet
- In scope / out of scope: in = src/desk papers/printer/sheets, Output sprite, strings, tests, evidence. Out = machine keyboard (T3.1), stamps/clip/hand over/trash (Stage 3), Orders/Manual/dialogue (Stage 4), sim-core.
- Material assumptions and risks: print pacing uses the token position within the Morse plan duration, an approximation of the audio timing.

## Architecture linkage

Desk reads the P5 store; the only Action it calls in Stage 2 is repeat. Layout state lives in localStorage key uboat-radio.desk.v1 (validated, per seed), never in the save or command log.

## Progress and decisions

- Closed the merged p5-art-remaining task (PR #18) so tools/art is not claimed by a finished task.
- Branch desk-ui-stage2 is stacked on desk-ui-spec (PR #19).
- Attempts are 0-based in the sim; sheets show them 1-based with the message number ("Input #1 · 2") so sheets of different messages are told apart.
- Pointer interaction does not focus a sheet (preventDefault on pointerdown), so Enter after a drag still decodes instead of picking the sheet up.

## Verification

- Command/check: npx tsc --noEmit; npx vitest run (radio-ui, sim-core); npm run build; git diff packages/sim-core; git grep truthOf/innerHTML in src/desk and src/i18n; scripts/check-repo.ps1
- Result: passed (tsc 0; 132/132; 70/70; build 0; sim-core diff empty; 0 matches; check-repo passed)
- Evidence/reason: docs/specs/desk-ui/evidence/stage2-*.png

## Runtime and codebase-health verification

- Runtime/user-flow exercise: headless Edge (CDP input events) on ?ui=desk&seed=12: Input prints progressively (printing class, lamp blinks); mouse drag moved the sheet 262,150 -> 132,180; typing created the Output sheet; keyboard Enter, Right x2, Down, Enter moved Mission by (8,4); reload kept every position and printed restored sheets at once; Enter decoded (plain groups, damaged 0); Repeat printed a new sheet in:1:1 and kept in:1:0; lang=vi capture.
- Health/readiness/log/error inspection: no console errors or exceptions; no horizontal scroll.
- Integration/dependency/config/migration check: no dependency change; manifest regenerated (45 sprites); existing sprites byte-identical.
- Remaining issue or reason not verified: print pacing vs audible Morse only approximate; real mouse/touch on a physical device; screen-reader announcement wording.

## Security, observability, risk, and rollback

- Security impact: none; storage parsed with size cap, id allowlist and bounded integers; text only through textContent.
- Observability impact: DESK_SAVE_FAILED diag code when storage rejects a write.
- Residual risk: many messages stack many sheets until Stage 3 lets the player hand them over or file them.
- Rollback: revert the Stage 2 commit; node tools/art/generate.ts.
- Next safe action: operator review; then Stage 3 (machine G1, Echo stamper, stamps/sign/clip/hand over, Mission ticks).
