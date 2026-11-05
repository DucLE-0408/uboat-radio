---
schema_version: 1
id: task-2026-11-05-desk-ui-charge
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T03:45:00.0000000Z
started_at: 2026-11-05T03:45:00.0000000Z
updated_at: 2026-11-05T03:45:00.0000000Z
base_commit: ba621a92b01dba23afe4ccf33bf21a34182dc1d4
owned_paths:
  - packages/sim-core
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/store.ts
  - packages/radio-ui/src/i18n
  - packages/radio-ui/test/g5-helm.test.ts
  - docs/specs/desk-ui-g5
  - docs/specs/desk-ui
  - docs/architecture.md
  - memory/plans/2026-11-05-desk-ui-charge.md
  - memory/tasks/completed/2026-11-05-desk-ui-charge.md
plan: memory/plans/2026-11-05-desk-ui-charge.md
handoff: null
---

# Task: desk-ui-charge

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "cho nước nông ảnh hưởng đến depth charge", then after the goal confirmation: "cho bạn toàn quyền nhé" (the assistant decides)
- Outcome and acceptance criteria: with options, charges burst relative to the true floor (never below 10 m, 5 m above the floor, 100 m in deep water), reflect 1.5x near the floor, emit `CHARGE_EFFECT`; the desk toasts a shallow hit and the Helm warns while a threat is live over charted shallows; deterministic and replayable; night watch bit-identical
- In scope / out of scope: in = sim-core charge model, event, store, desk toast, Helm line, strings, tests, docs; out = new weapons, escort tactics, tuning of enemy fire rates
- Material assumptions and risks: model only with options; CI not run (rate limited, waived)

## Architecture linkage

`chargeEffect(floor, depth)` -> `Boat.takeDepthCharge` (via `setChargeModel` from `Watch`, true position) -> `CHARGE_EFFECT` / `BOAT_DAMAGED` -> store `shallowHitAt` -> desk toast; Helm reads `chartDepth(estimate)` and `tx` threat only.

## Progress and decisions

- Decision: injected through a callback so `boat.ts` keeps importing no other sim module.
- Found: the first hookup ran before `this.boat` existed (TS2565, Endless tests failed); moved after `new Boat`.
- Found: an injected `DEPTH_CHARGE` is not in the command log, so the replay test injects it into both watches after an exact replay of the sailing.

## Verification

- Command/check: `tsc --noEmit` (both); `vitest run` (both); `vite build`; `python3 scripts/validate_repo.py`; Playwright smoke on `vite preview`
- Result: `passed` for static, unit and build
- Evidence/reason: sim-core 142/142 (6 new in charge.test.ts: unit, shallow hit, deep miss, replay, night watch), radio-ui 198/198 (1 new store test)

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Endless seed 24 opens, Helm readout shows seabed and keel, no console error or pageerror. The shallow-hit toast and Helm warning were `not verified` in the browser: it needs a hostile charge near the coast and the app has no injection hook. Covered by sim and store tests.
- Health/readiness/log/error inspection: console listeners recorded none.
- Integration/dependency/config/migration check: no dependency change; save format unchanged; Endless saves with charges in shallow water now replay differently.
- Remaining issue or reason not verified: CI not run (waived); `check-repo.ps1` not run (no pwsh); Vietnamese strings not seen on screen.

## Security, observability, risk, and rollback

- Security impact: none; true floor used only inside the sim.
- Observability impact: one new event type and a log line.
- Residual risk: low to medium; 1.5x and the 5 m margin are balance numbers, a shallow coast is now lethal to a surfaced boat.
- Rollback: revert the PR.
- Next safe action: playtest the coast approach with escorts.
