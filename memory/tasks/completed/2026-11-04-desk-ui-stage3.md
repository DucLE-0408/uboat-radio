---
schema_version: 1
id: task-2026-11-04-desk-ui-stage3
status: completed
owner: claude-desktop-session
goal_confirmed_at: 2026-11-04T14:33:47.6129689Z
started_at: 2026-11-04T14:33:47.6129689Z
updated_at: 2026-11-04T14:55:53.3306795Z
base_commit: e6cc10784196b7e0d7b696b90b4ec11ca7e922ed
owned_paths:
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/i18n
  - packages/radio-ui/tools/art/desk.ts
  - packages/radio-ui/assets
  - packages/radio-ui/test
  - docs/specs/desk-ui
  - memory/plans/2026-11-04-desk-ui-stage3.md
  - memory/tasks/active/2026-11-04-desk-ui-stage3.md
plan: memory/plans/2026-11-04-desk-ui-stage3.md
handoff: null
---

# Task: desk-ui-stage3

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-04: "merge va tiep tuc stage 3"
- Outcome and acceptance criteria: Desk UI Stage 3: machine G1 pull-out, Echo stamper (exactly one resolve), stamps/pen/clip/hand-over/trash, Mission ticks
- In scope / out of scope: in = src/desk (papers, rules, echo, index), sprites, strings, tests, evidence. Out = people and dialogue at the door (T4.1), boat controls/drawers (T4.2), Daily Orders/Manual (T4.3), penalties (G3), sim-core.
- Material assumptions and risks: G1 stamping rules are fixed (Input: Echo + signature; Output: one red stamp); rule breaks are listed at hand-over, not penalised.

## Architecture linkage

Desk calls only existing Actions (resolve, repeat) and the store's UI selection (selectRx, cycleAttempt). The Echo mark is derived from rx.resolved (rebuilt from MSG_RESOLVED); regular stamps, signatures, clips and hand-over live in uboat-radio.desk.v1 (validated). scene/machine.ts is reused unchanged.

## Progress and decisions

- PR #20 merged (operator); branch desk-ui-stage3 from main e6cc107.
- The stamper acts on the selected sheet (click or focus) instead of a physical slot: same rule (Input, back side up), keyboard reachable.
- Hand-over requires the Echo mark so a bundle can never leave undecided; other rule breaks are reported in the notice.
- Saved Output sheets are recreated on reload even without copy text (stamped/handed sheets must not vanish).

## Verification

- Command/check: npx tsc --noEmit; npx vitest run (radio-ui, sim-core); npm run build; git diff packages/sim-core, scene, store.ts, controller.ts; git grep truthOf/innerHTML in src/desk and src/i18n; scripts/check-repo.ps1
- Result: passed (tsc 0; 143/143; 70/70; build 0; those paths unchanged; 0 matches; check-repo passed)
- Evidence/reason: docs/specs/desk-ui/evidence/stage3-*.png

## Runtime and codebase-health verification

- Runtime/user-flow exercise: headless Edge (CDP mouse/keys) on ?ui=desk&seed=12: type + decode; select and flip the Input; arm pressed twice -> TRUE ECHO mark, notice "already stamped", save holds exactly 1 resolve; drawer red stamp refused on the front, accepted on the back; pen signs the Input; clip puts the Output on top of the Input (+4,+4); Hand over -> "Message #1 handed to the crew", Mission 6/7 ticks (Input still printing); bin refuses the Mission sheet; reload keeps both handed sheets hidden with their marks and still 1 resolve; machine pulled out in lang=vi, lampboard lights the plain letters (X, K); P5 default unchanged.
- Health/readiness/log/error inspection: no console errors or exceptions; no horizontal scroll.
- Integration/dependency/config/migration check: no dependency change; manifest regenerated (52 sprites); desk.v1 entries from Stage 2 load with defaults (test).
- Remaining issue or reason not verified: physical mouse/touch; screen-reader flow through tools; nobody at the door yet (T4.1).

## Security, observability, risk, and rollback

- Security impact: none; storage validated field by field; text through textContent only.
- Observability impact: none new (refusals reported through the existing notice).
- Residual risk: the stamp rules shown to the player arrive with the Manual/Daily Orders (T4.3); until then they are only in the hand-over notice.
- Rollback: revert the Stage 3 commit; node tools/art/generate.ts.
- Next safe action: operator review; then Stage 4 (crew and Transcript, boat controls, Daily Orders and Manual).
