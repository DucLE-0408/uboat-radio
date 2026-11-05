---
schema_version: 1
id: task-2026-11-05-desk-ui-seabed
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T03:15:45.0000000Z
started_at: 2026-11-05T03:15:45.0000000Z
updated_at: 2026-11-05T03:15:45.0000000Z
base_commit: 22fb63c7a8108650a75c2b6f769f5e76ad9ebd4e
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
  - memory/plans/2026-11-05-desk-ui-seabed.md
  - memory/tasks/completed/2026-11-05-desk-ui-seabed.md
plan: memory/plans/2026-11-05-desk-ui-seabed.md
handoff: null
---

# Task: desk-ui-seabed

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "thêm luật nước nông và độ sâu", then after the goal confirmation with proposals: "cho bạn toàn quyền nhé" (the assistant decides)
- Outcome and acceptance criteria: a seabed (depth by position, shoals), a shoal warning, bottoming (hull, way lost, forced up, ration penalty, a note), a chart and Helm that show surveyed depth from the estimated position; deterministic and replayable; night watch unchanged
- In scope / out of scope: in = sim-core seabed rule, chart publication, Helm shading and locks, desk feedback, tests, docs; out = depth-charge changes, currents, tides
- Material assumptions and risks: the seabed exists only with options; the sim never blocks a dive (the Helm disables the buttons from the chart instead); CI not run (rate limited)

## Architecture linkage

`makeSeabed(seed)` -> `Watch.checkSeabed` (true position and depth) -> `SHOAL_WARNING` / `BOAT_BOTTOMED` -> `Boat.takeDamage`, `hold`, `setTargetDepth` -> store -> desk toast and ration, Helm; the Helm reads `chartDepth(estimate)` only.

## Progress and decisions

- Decision: bottoming happens when the boat is deeper than the water, not by an auto clamp, so a careless dive has a cost; the chart-driven button lock stops the common mistake.
- Decision: a surfaced boat draws 6 m except in the last 3 km before the coast, so grounding and bottoming never charge together.
- Found: shoal slopes are gentle next to boat speed, so bottoming is about depth choice, not cliffs; documented in the addendum.
- Found: my first browser run clicked outside the chart (the shoal was beyond its edge); the clicks are now clamped inside.

## Verification

- Command/check: `tsc --noEmit` (both); `vitest run` (both); `npm run build`; `python3 scripts/validate_repo.py`; Playwright Chromium on `vite preview`
- Result: `passed`
- Evidence/reason: sim-core 136/136 (6 new in seabed.test.ts incl. determinism, depth-only-with-options, warning then bottoming once, surface pass, draft rule, replay bit-exact, no rule in the night watch), radio-ui 197/197; tsc exit 0; build OK.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Endless seed 24 from the Helm: depth readout 200 m / under keel 140 m after diving to 60 m; steering toward a charted shoal; "Shoal: the water under the keel is thin", then "Keel on the bottom!", depth rising to 50 m, rations -15, a note from the chief, and the Dive button disabled by the chart. Screenshots `docs/specs/desk-ui/evidence/g5-seabed-*.png`.
- Health/readiness/log/error inspection: console error/warning and pageerror listeners recorded none.
- Integration/dependency/config/migration check: no dependency change; save format unchanged; old Endless saves may replay differently because dives in shallow water now have consequences.
- Remaining issue or reason not verified: CI not run (rate limited, waived); `check-repo.ps1` not run (no pwsh); Vietnamese strings for the seabed not seen on screen; the surface-draft case was tested in the sim only; chart shading looks blocky at the local scale.

## Security, observability, risk, and rollback

- Security impact: none; the chart shows surveyed depth only and the sim uses true depth only to emit events.
- Observability impact: two new event types and log lines.
- Residual risk: low; shoal count and lift are balance numbers that may need tuning.
- Rollback: revert the PR.
- Next safe action: playtest shoal density and the 15 hull cost; consider depth-charge effects in shallow water and a finer chart rendering.
