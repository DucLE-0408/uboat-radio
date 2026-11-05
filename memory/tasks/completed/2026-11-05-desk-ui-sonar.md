---
schema_version: 1
id: task-2026-11-05-desk-ui-sonar
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T06:00:00.0000000Z
started_at: 2026-11-05T06:00:00.0000000Z
updated_at: 2026-11-05T06:00:00.0000000Z
base_commit: 4171bf23052d7f56ff733136c949379953e124c4
owned_paths:
  - packages/sim-core
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/scene
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/scene
  - packages/radio-ui/src/store.ts
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test/g5-helm.test.ts
  - packages/radio-ui/test/g4-menu.test.ts
  - packages/radio-ui/src/menu
  - docs/specs/desk-ui-g5
  - docs/specs/desk-ui
  - docs/architecture.md
  - memory/plans/2026-11-05-desk-ui-sonar.md
  - memory/tasks/completed/2026-11-05-desk-ui-sonar.md
plan: memory/plans/2026-11-05-desk-ui-sonar.md
handoff: null
---

# Task: desk-ui-sonar

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "cải thiện màn hình sonar và các cơ chế liên quan", then after the package proposal (items 1 to 7) and the Pencil question: "ok, toàn quyền"
- Outcome and acceptance criteria: the sonar uses the weather's sea state and the ASDIC lock weakens in rough seas (weather module only); the drawer shows a bearing trace, signal bands, listening conditions with advice, an ASDIC banner and i18n strings; no range anywhere (D3); night watch and module-off watches bit-identical; `SIM_VERSION` bumped with refreshed digests
- In scope / out of scope: in = sim-core sea link, `asdicSeaFactor`, `detectRangeKm`, store history and ASDIC time, drawer redesign inside the existing drawer style, strings, tests, docs; out = range estimation (TMA), thermocline, active sonar; no Pencil design existed, so no new design direction was introduced
- Material assumptions and risks: the ASDIC banner shows no bearing (kept D3 with the log; the proposal had mentioned an estimated bearing, dropped here); balance numbers untuned; old saves refused (SIM_VERSION 3); CI not run (waived)

## Architecture linkage

`weather.at(t).sea` -> `Watch.seaNow` -> `SonarField.observe` (hydrophone and scan) and `SonarField.tick(..., seaState)` (ASDIC factor) -> `SONAR_CONTACT` / `ASDIC_PING`; `Watch.listen()` -> `Store.setListen` (history) and `ASDIC_PING` -> `Store.asdicAt`; drawer reads the store, `conditions()` (own speed, reported sea) and `detectRangeKm`.

## Progress and decisions

- Decision: keep the ASDIC banner free of bearing and range so the existing D3 choice for the log stays intact.
- Decision: the conditions readout uses the reported sea state, falling back to the default, so the UI never reads the true weather.
- Found: the invariants test greps sources for `.range`; a string key `sonar.cond.range` tripped it, so the key is `sonar.cond.reach`.
- Found: the night digest is unchanged while the Endless digest changed, as expected; digests and `SIM_VERSION` updated together.

## Verification

- Command/check: `tsc --noEmit` (both); `vitest run` (both); `vite build`; `python3 scripts/validate_repo.py`; Playwright Chromium on `vite preview`
- Result: `passed`
- Evidence/reason: sim-core 158/158 (4 new: detection range, sea link with and without the module, ASDIC factor), radio-ui 206/206 (5 new: signal bands, conditions, history bounds, ASDIC time).

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Endless seed 24, sonar drawer after 12 s at speed 60: listening conditions "Own noise 45 dB · sea 59 dB (state 1) · A merchant is audible to ~29 km · HEARING: GOOD", a contact row with signal "faint", the bearing trace filled with a scatter along one bearing; screenshot `docs/specs/desk-ui/evidence/g5-sonar-drawer.png`.
- Health/readiness/log/error inspection: no console errors or page errors.
- Integration/dependency/config/migration check: no dependency change; `asdicSeaFactor` exported; old saves handled by the existing menu rule.
- Remaining issue or reason not verified: the ASDIC banner and the cavitation advice were `not verified` on screen (unit-tested); the mobile flow layout of the new elements and the Vietnamese strings were not seen on screen; the trace looks wide for faint contacts (noisy bearings, as modelled); CI not run (waived); `check-repo.ps1` not run (no pwsh).

## Security, observability, risk, and rollback

- Security impact: none; the UI reads reported weather and own state only.
- Observability impact: none new.
- Residual risk: low to medium; the sonar behaviour in storms changes and is untuned.
- Rollback: revert the PR (this returns `SIM_VERSION` to 2).
- Next safe action: playtest hearing in storms and the ASDIC factor; look at the mobile layout.
