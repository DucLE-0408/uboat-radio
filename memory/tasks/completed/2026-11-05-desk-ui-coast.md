---
schema_version: 1
id: task-2026-11-05-desk-ui-coast
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T02:45:30.0000000Z
started_at: 2026-11-05T02:45:30.0000000Z
updated_at: 2026-11-05T02:45:30.0000000Z
base_commit: 88b478f5fdee1b6c7b103b3b9b9cd1a8392129ee
owned_paths:
  - packages/sim-core
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/store.ts
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test/g4-desk.test.ts
  - packages/radio-ui/test/g5-helm.test.ts
  - docs/specs/desk-ui-g5
  - docs/specs/desk-ui
  - docs/architecture.md
  - memory/plans/2026-11-05-desk-ui-coast.md
  - memory/tasks/completed/2026-11-05-desk-ui-coast.md
plan: memory/plans/2026-11-05-desk-ui-coast.md
handoff: null
---

# Task: desk-ui-coast

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "thêm luật va chạm đất liền", then after the goal confirmation with proposals and three questions: "cho bạn toàn quyền quyết định" (the assistant decides)
- Outcome and acceptance criteria: a land collision rule: warning near the coast, running aground (held at the shore, hull damage, Intel, note, ration penalty), deterministic and replayable, night watch unchanged
- In scope / out of scope: in = sim-core coast rule, Endless start near the coast, Orders and ordered-cell margins, desk and Helm feedback, tests, docs; out = shallow-water or depth rules, other land than the east coast
- Material assumptions and risks: the plain night watch has no coast rule because the coast is over 1000 km away; Endless now starts 40 km off the coast (Endless only); `Intel.mark` now sits 5 points above the threshold (also affects citation marks); CI not run (rate limited)

## Architecture linkage

`Watch.checkCoast` (true position vs `coastKm`) -> `COAST_WARNING` / `BOAT_GROUNDED` -> `Boat.hold` and `Boat.takeDamage` -> store -> desk toast and ration, Helm coast line.

## Progress and decisions

- Decision: hold the boat but keep its ordered speed, so turning away frees it without re-ordering speed.
- Decision: one grounding per episode (ends 1 km off) so pushing against the shore does not drain the hull every second.
- Found: `Intel.mark` set the score exactly at the threshold, so decay dropped the level again within minutes; it now adds 5 points of margin.
- Found: my first test script ran at a sim speed the app does not offer (240); the boat did not move; reran at 60.

## Verification

- Command/check: `tsc --noEmit` (both); `vitest run` (both); `npm run build`; `python3 scripts/validate_repo.py`; Playwright Chromium on `vite preview`
- Result: `passed`
- Evidence/reason: sim-core 130/130 (7 new in coast.test.ts incl. warn, aground, no extra damage while pushing, second grounding, sinking, replay bit-exact, no rule in the night watch, items and cells at sea on 120 seeds), radio-ui 196/196; tsc exit 0; build OK.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Endless from the Helm, sailing east at full speed: the chart showed the coast 40 km away and counting down, "Shallow water ahead" at ~12 km, then "Aground!", the boat stopped at the shore with the coast line red, rations dropped by 20, and a private note from the chief arrived; turning away freed the boat. Screenshot `docs/specs/desk-ui/evidence/g5-coast-aground-1280.png`.
- Health/readiness/log/error inspection: console error/warning and pageerror listeners recorded none.
- Integration/dependency/config/migration check: no dependency change; save format unchanged; Endless saves made before this change replay with the new start position (their commands, not their positions, are stored), so an old Endless save may differ from how it was played.
- Remaining issue or reason not verified: CI not run (rate limited, waived); `check-repo.ps1` not run (no pwsh); the Vietnamese strings for the coast were not seen on screen; hull damage reaching zero was checked in the sim test, not in the browser.

## Security, observability, risk, and rollback

- Security impact: none; the chart still shows only the estimate, the warning uses the true distance only as an event.
- Observability impact: two new event types and log lines.
- Residual risk: low; old Endless saves may replay differently (new start position).
- Rollback: revert the PR.
- Next safe action: playtest the coast margin and the 40 km start; consider shallow-water rules.
