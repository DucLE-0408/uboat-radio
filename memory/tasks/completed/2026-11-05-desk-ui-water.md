---
schema_version: 1
id: task-2026-11-05-desk-ui-water
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T07:30:00.0000000Z
started_at: 2026-11-05T07:30:00.0000000Z
updated_at: 2026-11-05T07:30:00.0000000Z
base_commit: ee504931ade8826bcdf5cfb0d02c95370557e4af
owned_paths:
  - packages/sim-core
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/menu
  - packages/radio-ui/src/scene
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/menu
  - packages/radio-ui/src/scene
  - packages/radio-ui/src/store.ts
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test/g5-helm.test.ts
  - packages/radio-ui/test/g4-menu.test.ts
  - packages/radio-ui/src/menu
  - packages/radio-ui/src/scene
  - docs/specs/desk-ui-g5
  - docs/specs/desk-ui
  - docs/architecture.md
  - memory/plans/2026-11-05-desk-ui-water.md
  - memory/tasks/completed/2026-11-05-desk-ui-water.md
plan: memory/plans/2026-11-05-desk-ui-water.md
handoff: null
---

# Task: desk-ui-water

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "thêm bản đồ nhiệt độ nước", then after the proposal: "ok, toàn quyền"
- Outcome and acceptance criteria: a `water` module; a deterministic temperature field with eddies and a thermocline; below the layer the hydrophone loses 20 dB on surface ships and the ASDIC lock rate is scaled by 0.35; the boat's thermometer reports noisy readings at the estimated position; the Helm has a TEMP chart overlay (published climatology plus the boat's readings) and a reading line; the sonar drawer says where we lie against the layer; night watch and module-off watches bit-identical; `SIM_VERSION` 5 with refreshed digests
- In scope / out of scope: in = field, layer effects, thermometer events, `chartWater`, module option, store, Helm overlay and button, sonar drawer line, menu label, strings, tests, docs; out = battery, detailed sound speed, currents, seasons, time variation of the field
- Material assumptions and risks: the 20 dB and 0.35 numbers are untuned and diving below the layer may be too strong a tactic; the field has no time variation (the proposal mentioned time, dropped); no Pencil design existed so the UI stays inside the Helm style; old saves refused (`SIM_VERSION` 5); CI not run (waived)

## Architecture linkage

`makeWater(seed)` (true field) -> `Watch.belowLayer` (true position and depth) -> `SonarField.observe(extraLossDb)` and `SonarField.tick(asdicScale)`; `Watch.checkWater` -> `WATER_SAMPLE` (noisy, estimated position, own `bt` stream) -> store `waterSamples` -> Helm overlay and line, sonar drawer line; `Watch.chartWater` (climatology only) -> Helm cells.

## Progress and decisions

- Decision: the chart publishes the climatology only; the eddies are what sailing reveals through the thermometer, drawn at the dead-reckoned position.
- Decision: the test that held the sim version only needed its digests refreshed, since its script already dives; the earlier fix (7200 s) kept it honest.
- Found: the first Helm layout put the position text over the new TEMP button (a Playwright click was intercepted); the text now starts further right.
- Found: the first colour ramp was not monotone in lightness (green lighter than amber); the warm stop was lightened and a test now checks it.

## Verification

- Command/check: `tsc --noEmit` (both); `vitest run` (both); `vite build`; `python3 -I scripts/validate_repo.py`; Playwright Chromium on `vite preview`
- Result: `passed`
- Evidence/reason: sim-core 171/171 (6 new in water.test.ts: field determinism, bounds, continuity and trends, chart without eddies, loss only below the layer and only with the module, ASDIC scale, thermometer cadence and bounds, replay), radio-ui 210/210 (3 new: colour scale, layer advice, store samples); digest guard refreshed (`SIM_VERSION` 5).

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Endless seed 24: TEMP overlay on in the Helm after 25 s at speed 60 (tinted cells, legend 8 ° to 20 °, readings), readout "SEA 13.3 °C · LAYER ~55 m", the sonar drawer line "The layer is at ~60 m: below it surface ships are muffled and ASDIC is weak."; screenshot `docs/specs/desk-ui/evidence/g5-water-helm.png`.
- Health/readiness/log/error inspection: no console errors or page errors.
- Integration/dependency/config/migration check: no dependency change; options parse treats a missing `water` key as on; score labels gain a bit (10); old saves handled by the menu rule.
- Remaining issue or reason not verified: diving below the layer in the browser and the "below" message were `not verified` on screen (sim-tested); the overlay is subtle at moderate temperature differences; Vietnamese strings not seen on screen; CI not run (waived); `check-repo.ps1` not run (no pwsh).

## Security, observability, risk, and rollback

- Security impact: none; the UI only sees noisy readings and the published climatology.
- Observability impact: one new event type.
- Residual risk: medium; hiding under the layer may dominate tactics until the numbers are tuned.
- Rollback: revert the PR (this returns `SIM_VERSION` to 4).
- Next safe action: playtest the layer tactic with all detection channels on; keep bumping `SIM_VERSION`.
