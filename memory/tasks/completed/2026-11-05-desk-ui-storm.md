---
schema_version: 1
id: task-2026-11-05-desk-ui-storm
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T05:20:00.0000000Z
started_at: 2026-11-05T05:20:00.0000000Z
updated_at: 2026-11-05T05:20:00.0000000Z
base_commit: 21712f4b40ebef6898034acb58f76d4118896a9a
owned_paths:
  - packages/sim-core
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/i18n
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
  - memory/plans/2026-11-05-desk-ui-storm.md
  - memory/tasks/completed/2026-11-05-desk-ui-storm.md
plan: memory/plans/2026-11-05-desk-ui-storm.md
handoff: null
---

# Task: desk-ui-storm

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "thêm luật bão làm tàu chậm,", then after the proposal: "ok, toàn quyền"
- Outcome and acceptance criteria: with the weather module the sea state lowers the surfaced top speed (full factor), periscope depth half, dived none; deterministic and replayable; no weather module and the night watch bit-identical; the Helm shows the ceiling from reported values; `SIM_VERSION` bumped with refreshed digests
- In scope / out of scope: in = sea speed factor, boat hook, rarer storms, Helm line and toast, strings, tests, docs; out = changing order deadlines, sighting hazard, damage from waves
- Material assumptions and risks: balance numbers are untuned (calm to sea state 3, floor 55%, storm at force 7); saves from before are refused by the menu (SIM_VERSION 1 to 2); CI not run (waived)

## Architecture linkage

`makeWeather(seed)(t).sea` -> `seaSpeedFactor` -> `Boat.setSeaFactor` before `Boat.tick` (Watch, every tick, weather module only) -> speed ceiling; store `weather` (reported sea state) -> Helm line and storm toast.

## Progress and decisions

- Decision: storms are a consequence of sea state inside the weather module, not a separate event or module.
- Decision: wind force is drawn from `rand^2` so storms are about 13% of the time (the first exponent made force 7 and up about 20%).
- Found: the night digest did not change while the Endless digest did, which is the expected D10 evidence; both digests and `SIM_VERSION` were updated in this change.

## Verification

- Command/check: `tsc --noEmit` (both); `vitest run` (both); `vite build`; `python3 scripts/validate_repo.py`; Playwright Chromium on `vite preview`
- Result: `passed`
- Evidence/reason: sim-core 154/154 (3 new: factor shape, a rough sea slows the surfaced boat and the weather-off watch reaches full speed, dived and night watch unaffected), radio-ui 201/201; digest guard refreshed (`SIM_VERSION` 2).

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Endless seed 41 (storm at the start): the Helm readout shows "VIS ~13 km · F8 250°" and "STORM: MAX ~11 kn"; screenshot `docs/specs/desk-ui/evidence/g5-storm-helm.png`.
- Health/readiness/log/error inspection: no console errors or page errors.
- Integration/dependency/config/migration check: no dependency change; `seaSpeedFactor` exported from sim-core; incompatible old saves handled by the existing menu rule.
- Remaining issue or reason not verified: the storm toast was `not verified` on screen and the actual slowdown was not driven in the browser (covered by sim tests); Vietnamese strings not seen on screen; CI not run (waived); `check-repo.ps1` not run (no pwsh).

## Security, observability, risk, and rollback

- Security impact: none; the UI uses reported values only.
- Observability impact: none new (speed already in the boat state).
- Residual risk: medium; a surfaced boat in a long storm may miss movement-order deadlines, which is intended but untuned.
- Rollback: revert the PR (this also returns `SIM_VERSION` to 1; saves written at 2 would then be refused).
- Next safe action: playtest the storm frequency and the 55% floor; keep bumping `SIM_VERSION` with every sim change.
