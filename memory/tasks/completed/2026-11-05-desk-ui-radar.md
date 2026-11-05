---
schema_version: 1
id: task-2026-11-05-desk-ui-radar
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T06:40:00.0000000Z
started_at: 2026-11-05T06:40:00.0000000Z
updated_at: 2026-11-05T06:40:00.0000000Z
base_commit: 91904b56b7d97be498439ee1a83790abc09c76cc
owned_paths:
  - packages/sim-core
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/menu
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/menu
  - packages/radio-ui/src/store.ts
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test/g5-helm.test.ts
  - packages/radio-ui/test/g4-menu.test.ts
  - packages/radio-ui/src/menu
  - docs/specs/desk-ui-g5
  - docs/specs/desk-ui
  - docs/architecture.md
  - memory/plans/2026-11-05-desk-ui-radar.md
  - memory/tasks/completed/2026-11-05-desk-ui-radar.md
plan: memory/plans/2026-11-05-desk-ui-radar.md
handoff: null
---

# Task: desk-ui-radar

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "thêm luật phát hiện bằng radar của địch", then after the proposal: "ok, toàn quyền"
- Outcome and acceptance criteria: a `radar` module; patrol windows as a pure function of seed and time; a pick-up hazard (surface 1, periscope 0.3, deep 0) scaled by sea clutter and a growing enemy, which dispatches an escort and charges without an HF/DF fix and without telling the player; the Metox warns (85%) and clears; desk toasts and a Helm line; deterministic and replayable; night watch and module-off watches bit-identical; `SIM_VERSION` 4 with refreshed digests
- In scope / out of scope: in = radar schedule, hazard, Metox events, module option, store, desk toast, Helm line, menu label, strings, tests, docs; out = positions or paths of enemy ships, aircraft, radar-absorbing measures
- Material assumptions and risks: balance numbers untuned (window cadence, hazard 0.003, era +25%/h, cap x2.5); radar with HF/DF and sightings makes the surface dangerous, so Endless may need tuning; old saves refused (`SIM_VERSION` 4); CI not run (waived)

## Architecture linkage

`makeRadar(seed)(t)` -> `Watch.checkRadar` (own `radarhit` stream) -> `RADAR_WARNING` / `RADAR_CLEAR` / `RADAR_DETECTED` + `HfdfDetector.visualContact` (escort and charge chain) -> store `radarWarnAt/ClearAt` -> desk toast and Helm line; `RADAR_DETECTED` is not consumed by the store.

## Progress and decisions

- Decision: pick-up is silent for the player (only the escort shows), so the Metox is the whole counter-play.
- Decision: the schedule is a pure function of time (like the weather), so no RNG state advances during the watch.
- Found: the version guard test ran only 1800 s and did not notice this behaviour change (the first patrol starts at 1800 s); it now runs 7200 s with more commands, and the digest and `SIM_VERSION` were updated.
- Found: with a high hazard a long window outlasts the 300 s escort cooldown and picks the boat up twice, so tests assert at least one pick-up.

## Verification

- Command/check: `tsc --noEmit` (both); `vitest run` (both); `vite build`; `python3 scripts/validate_repo.py`; Playwright Chromium on `vite preview`
- Result: `passed`
- Evidence/reason: sim-core 165/165 (7 new in radar.test.ts: schedule determinism and bounds, factors, warning then clear then pick-up with escort and no HF/DF, heeding the warning, an unreliable Metox, module off and night watch, replay), radio-ui 207/207 (1 new store test, score labels now 9 bits).

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Endless seed 24 at speed 60: the toast "METOX: enemy radar on the air! Dive now." and the Helm line "METOX: RADAR ACTIVE. DIVE"; screenshot `docs/specs/desk-ui/evidence/g5-radar-helm.png`.
- Health/readiness/log/error inspection: no console errors or page errors.
- Integration/dependency/config/migration check: no dependency change; options parse treats a missing `radar` key as on; score labels gain a bit; old saves handled by the menu rule.
- Remaining issue or reason not verified: the "radar has gone quiet" toast and an actual pick-up while playing were `not verified` on screen (sim-tested); Vietnamese strings not seen on screen; CI not run (waived); `check-repo.ps1` not run (no pwsh).

## Security, observability, risk, and rollback

- Security impact: none; the UI never receives the pick-up.
- Observability impact: three new event types and two log lines.
- Residual risk: medium; difficulty of long Endless watches is untuned.
- Rollback: revert the PR (this returns `SIM_VERSION` to 3).
- Next safe action: playtest the surface danger with all three detection channels on; keep bumping `SIM_VERSION`.
