---
schema_version: 1
id: task-2026-11-04-desk-ui-stage4
status: completed
owner: claude-desktop-session
goal_confirmed_at: 2026-11-04T15:16:01.7260304Z
started_at: 2026-11-04T15:16:01.7260304Z
updated_at: 2026-11-04T15:49:05.2879582Z
base_commit: 2d3d804d5bcfde5c9272595a323ee4a5bc333c17
owned_paths:
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/i18n
  - packages/radio-ui/tools/art/desk.ts
  - packages/radio-ui/tools/art/portrait.ts
  - packages/radio-ui/assets
  - packages/radio-ui/test
  - docs/specs/desk-ui
  - memory/plans/2026-11-04-desk-ui-stage4.md
  - memory/tasks/active/2026-11-04-desk-ui-stage4.md
plan: memory/plans/2026-11-04-desk-ui-stage4.md
handoff: null
---

# Task: desk-ui-stage4

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-04: "trong luc cho fix tiep tuc voi stage tiep theo"
- Outcome and acceptance criteria: Desk UI Stage 4: boat controls + P5 drawers/emergency, Daily Orders and Manual, crew at the door with Transcript and en/vi dialogue
- In scope / out of scope: in = src/desk (index, docs, dialogue, papers kinds), crew/doc sprites, crewMember() in portrait.ts, strings, tests, evidence. Out = G2 day key, rations, timer; citations (G3); default UI switch (T5.4); sim-core.
- Material assumptions and risks: crew portraits are recoloured variants of the operator build (all wear glasses); the player stays unnamed ("Radio operator").

## Architecture linkage

Desk dispatches only existing Actions (setMode, steerSpeed, toggleSilence, report, openAuthTable, openDrawer, resolve, repeat). Dialogue reacts to observed store state (rx count, decisions without correctness, auth results, HF/DF fix, depth charges, emergency) and is chosen with derive(cosmeticSeed, "desk-dialogue"). scene/drawers.ts and scene/emergency.ts are reused unchanged.

## Progress and decisions

- Branch desk-ui-stage4 is stacked on desk-ui-stage3 (PR #21, open).
- Reference sheets (orders, manual) start in the drawer and keep their place in desk.v1; validation rejects marks on them and the drawer place for message sheets.
- The Transcript captures keys only while a line is shown, so typing never leaks into the copy.

## Verification

- Command/check: npx tsc --noEmit; npx vitest run (radio-ui, sim-core x6); npm run build; git diff desk-ui-stage3 for sim-core, scene, store.ts, controller.ts; git grep truthOf/innerHTML in src/desk and src/i18n; scripts/check-repo.ps1
- Result: radio-ui passed (150/150), tsc 0, build 0, protected paths unchanged, 0 matches, check-repo passed. sim-core: 1 intermittent failure of the fast-check property "every forgery at every Intel level carries >=1 verifiable tell" in 1 of ~17 runs (random seeds); sim-core is unchanged since 81e2471, so this is pre-existing and out of this task's scope (D1); counterexample not captured in 12 further runs.
- Evidence/reason: docs/specs/desk-ui/evidence/stage4-*.png

## Runtime and codebase-health verification

- Runtime/user-flow exercise: headless Edge on ?ui=desk&seed=12: watch-start scene (Brandt · Captain) with the portrait at the door; letter keys advance lines and create no copy; holding Space skips a scene; first signal brings Hahn · Messenger; lever to dive, + twice and silence reach the sim (banner "dive", silence on); Auth drawer opens over the desk; Orders and Manual come out of the drawer, Orders page 3 lists KDK/USE/UOK/UWF with their fists; reload keeps the documents on the desk and replays no dialogue; lang=vi capture.
- Health/readiness/log/error inspection: no console errors or exceptions; no horizontal scroll.
- Integration/dependency/config/migration check: no dependency change; manifest regenerated (54 sprites); portrait.png byte-identical.
- Remaining issue or reason not verified: physical mouse/touch; screen reader through the Transcript; the sim-core flake above.

## Security, observability, risk, and rollback

- Security impact: none; text only through textContent; storage validated.
- Observability impact: none new.
- Residual risk: dialogue frequency could feel busy in long watches (only first signal, not every signal, speaks).
- Rollback: revert the Stage 4 commit; node tools/art/generate.ts.
- Next safe action: operator review; then Stage 5 (full-watch verification, default switch, docs) or investigate the sim-core property flake in its own task.
