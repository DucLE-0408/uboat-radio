---
schema_version: 1
id: task-2026-11-05-desk-ui-weather
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T04:20:00.0000000Z
started_at: 2026-11-05T04:20:00.0000000Z
updated_at: 2026-11-05T04:20:00.0000000Z
base_commit: 3150bac68bb97cf76ec7ba7e88d363b7f3f50349
owned_paths:
  - packages/sim-core
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/store.ts
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test/g5-helm.test.ts
  - packages/radio-ui/test/g4-menu.test.ts
  - packages/radio-ui/src/menu
  - docs/specs/desk-ui-g5
  - docs/specs/desk-ui
  - docs/architecture.md
  - memory/plans/2026-11-05-desk-ui-weather.md
  - memory/tasks/completed/2026-11-05-desk-ui-weather.md
plan: memory/plans/2026-11-05-desk-ui-weather.md
handoff: null
---

# Task: desk-ui-weather

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "thêm luật thời tiết ảnh hưởng tầm nhìn"; after the proposal and the Steam-release note: "ok, toàn quyền"
- Outcome and acceptance criteria: a `weather` module; visibility/wind as a pure function of seed and time; noisy bridge reports; a visual sighting hazard (surface 1, periscope 0.25, deep 0; zero in fog) that dispatches an escort and charges without an HF/DF fix; desk toast; Helm fog and weather line; deterministic and replayable; night watch and module-off watches bit-identical
- In scope / out of scope: in = sim-core weather, events, module option, store, desk, Helm, menu label and strings, tests, docs; out = storms slowing the boat, sea-state effects on the periscope, `simVersion` in saves (separate task proposed for Steam)
- Material assumptions and risks: new sighting hazard changes difficulty (balance numbers in `balance.json`); old Endless saves replay differently; scores saved under 7-bit labels no longer match; CI not run (waived)

## Architecture linkage

`makeWeather(seed)(t)` -> `Watch.checkWeather` (own `sight`/`wxreport` streams) -> `WEATHER_REPORT` / `SIGHTED` + `HfdfDetector.visualContact` (escort and charge chain) -> store `weather`, `sightedAt` -> desk toast, Helm fog and line (reported values only).

## Progress and decisions

- Decision: weather reaches the player as bridge reports, not as `WEATHER` paper traffic (that kind is never injected and would pull in the whole decode/authenticate flow).
- Decision: fog gives zero sighting hazard, so weather is a trade-off rather than a pure penalty.
- Found: with the module on by default, long surfaced sim tests were sighted and escorted; those tests now run with `weather: false`.
- Found: a "submerged is not sighted" test must allow the sighting while still diving (cooldown masks later ones), so it checks depth and time.

## Verification

- Command/check: `tsc --noEmit` (both); `vitest run` (both); `vite build`; `python3 scripts/validate_repo.py`; Playwright Chromium on `vite preview`
- Result: `passed`
- Evidence/reason: sim-core 150/150 (8 new in weather.test.ts: determinism, bounds, continuity, clearness, options parse, report cadence, sighting then escort and charges with no HF/DF, submerged, module off and night watch, replay bit-exact), radio-ui 199/199 (1 new store test, score label updated to 8 bits).

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Endless seed 24 at speed 60 for 120 s: Helm readout shows "VIS ~10 km · F1 270°" changing to "VIS ~4 km", "VIS ~9 km · F9 290°" over the run, fog tint on the chart; screenshot `docs/specs/desk-ui/evidence/g5-weather-helm.png`.
- Health/readiness/log/error inspection: console error/warning and pageerror listeners recorded none.
- Integration/dependency/config/migration check: no dependency change; options parse treats a missing `weather` key as on; score label gains a bit.
- Remaining issue or reason not verified: the sighting toast was `not verified` in the browser (none occurred in the 2 h of simulated time; covered by sim and store tests); fog tint is subtle at moderate visibility; Vietnamese strings not seen on screen; CI not run (waived); `check-repo.ps1` not run (no pwsh).

## Security, observability, risk, and rollback

- Security impact: none; the UI only receives noisy reported values.
- Observability impact: two new event types and a log line.
- Residual risk: medium; sighting frequency (0.0002/s at full clarity, about once per 80 min surfaced) is an untuned balance number and may need playtest.
- Rollback: revert the PR.
- Next safe action: playtest sighting rate; add `simVersion` and a balance hash to saves before the first supported release.
