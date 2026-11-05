---
schema_version: 1
id: task-2026-11-05-desk-ui-simversion
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T04:50:00.0000000Z
started_at: 2026-11-05T04:50:00.0000000Z
updated_at: 2026-11-05T04:50:00.0000000Z
base_commit: a0f74c5ce2cac1d61b3e3bbab736a71ebaf093e2
owned_paths:
  - packages/sim-core
  - packages/radio-ui/src/sim
  - packages/radio-ui/test
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/store.ts
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test/g5-helm.test.ts
  - packages/radio-ui/test/g4-menu.test.ts
  - packages/radio-ui/src/menu
  - docs/specs/desk-ui-g5
  - docs/specs/desk-ui
  - docs/architecture.md
  - memory/plans/2026-11-05-desk-ui-simversion.md
  - memory/tasks/completed/2026-11-05-desk-ui-simversion.md
plan: memory/plans/2026-11-05-desk-ui-simversion.md
handoff: null
---

# Task: desk-ui-simversion

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: the Steam-release note and my proposal to add `simVersion` and a balance hash to saves; then "thêm simVersion vào save đi"
- Outcome and acceptance criteria: the save records the sim behaviour version; a save from a different version is neither replayed nor rewritten and the menu says so; a save without the field still loads; a test fails when sim behaviour changes without a version bump
- In scope / out of scope: in = `SIM_VERSION`, save field, restore and menu handling, golden-digest test, docs; out = save migration across versions, a separate balance hash (the digest test covers balance), Steam cloud saves
- Material assumptions and risks: saves from before this change carry no `sim` and are read as current (they may already replay differently from earlier sim changes; unknowable); the digests need updating on every deliberate sim change; CI not run (waived)

## Architecture linkage

`SIM_VERSION` (sim-core) -> `Session.toSave` writes `sim` -> `parseSave` validates it -> `isCompatible` gates `Session.restore` and `describeSave` (menu Continue and note).

## Progress and decisions

- Decision: a golden digest of two scripted replays replaces a hand-maintained balance hash: it also catches rule and RNG changes, not only numbers.
- Decision: an incompatible save is kept untouched until a new watch replaces it, so nothing is lost silently and a future tool could still read it.
- Decision: a missing `sim` is read as current, because rejecting it would discard every development save.

## Verification

- Command/check: `tsc --noEmit` (both); `vitest run` (both); `vite build`; `python3 scripts/validate_repo.py`; Playwright Chromium on `vite preview`
- Result: `passed`
- Evidence/reason: sim-core 151/151 (1 new digest guard, stable across two runs), radio-ui 201/201 (2 new: describeSave flag, restore of incompatible, legacy and malformed `sim`); two old tests updated for the new field.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: a seeded save with `sim: 99` in localStorage: Continue is disabled, the note says the save is from another game version, the save stays intact; screenshot `docs/specs/desk-ui/evidence/save-incompatible.png`.
- Health/readiness/log/error inspection: no console errors or page errors.
- Integration/dependency/config/migration check: no dependency change; the save key and `v` stay the same (the field is additive).
- Remaining issue or reason not verified: continuing a normal save in the browser after reload was covered by unit tests, not re-run in the browser; CI not run (waived); `check-repo.ps1` not run (no pwsh); the menu strings are English only, as the menu is today.

## Security, observability, risk, and rollback

- Security impact: low; `sim` is validated as a bounded integer at the storage boundary.
- Observability impact: none.
- Residual risk: low; a forgotten bump is caught by the digest test, but the digests must be refreshed by hand.
- Rollback: revert the PR; saves written with `sim` still parse in the old code only if it ignores unknown fields (it rejects none, so they load).
- Next safe action: bump `SIM_VERSION` with every sim change from now on; consider a Vietnamese string for the menu note.
