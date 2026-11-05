---
schema_version: 1
id: task-2026-11-05-desk-ui-g4-sim
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T00:20:00.0000000Z
started_at: 2026-11-05T00:20:00.0000000Z
updated_at: 2026-11-05T01:26:41.0000000Z
base_commit: 653d1429fab02d2dfe610901b088fb2d9475ec92
owned_paths:
  - packages/sim-core
  - packages/radio-ui/src/sim/session.ts
  - packages/radio-ui/src/store.ts
  - packages/radio-ui/src/scene/summary.ts
  - packages/radio-ui/src/panels/summary.ts
  - packages/radio-ui/test/g4-save.test.ts
  - docs/specs/desk-ui-g4
  - memory/plans/2026-11-05-desk-ui-g4-sim.md
  - memory/tasks/completed/2026-11-05-desk-ui-g4-sim.md
plan: memory/plans/2026-11-05-desk-ui-g4-sim.md
handoff: null
---

# Task: desk-ui-g4-sim

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05 answering all ten open questions of the G4 spec (difficulty values agreed; modules independent of difficulty; Endless ends only by sinking or leaving; no extra reply types; wrong sends are cited; roster absence and UI at the assistant's discretion; PM pacing, names and save v3 agreed); spec marked approved, gate S0 open
- Outcome and acceptance criteria: G4 stages 1 to 3 in sim-core plus save v3 in radio-ui: options and modules, Endless generator, `leave`, roster, Private Message rules, encipher and `send`; deterministic and replayable; the night watch without options unchanged
- In scope / out of scope: in = sim-core, save parsing, store state for the new events, summary text; out = desk UI (stage 4), menu, high scores
- Material assumptions and risks: in Endless the fifth citation does not execute (operator: "chỉ khi chìm hoặc chủ động dừng thôi"), it stays at severe; save v3 is written only when options exist; CI not run (rate limited)

## Architecture linkage

`WatchOptions` -> `Watch(seed, balance, opts)` -> endless generator, module switches -> `MSG_RX`; `send` command -> day-key check -> `SEND_RESULT` (+ `badSend` citation); citations and long transmissions -> `PRIVATE_MSG`; hull damage -> `ROSTER_CHANGE`. Save v3 = seed + opts + commandLog.

## Progress and decisions

- sim-core: options.ts, endless.ts, roster.ts, pm.ts, send.ts, `encipherGroups`, events (`MSG_LOST`, `SEND_RESULT`, `PRIVATE_MSG`, `ROSTER_CHANGE`, `WATCH_END left`, `TX send`, `MSG_RX.reply`), Watch commands `send` and `leave`, `replay(..., opts)`.
- Decision: all G4 features exist only when options are given, so no-options watches are bit-identical to before (existing suites unchanged and passing). Decision: the sim emits who, tone and topic for private notes; the words belong to the desk. Decision: a position reply is two map-cell letters of the boat's own position, an acknowledgement is ACK plus the sender callsign, both padded with X (letters only, so the machine can carry them).

## Verification

- Command/check: `tsc --noEmit` (sim-core, radio-ui); `vitest run` (both); `npm run build`; `python3 scripts/validate_repo.py`
- Result: `passed`
- Evidence/reason: sim-core 112/112 (17 new in g4.test.ts, incl. replay bit-exact, D8 on 4 module sets x 3 difficulties x 25 seeds, send correct/wrong/idempotent/refused, PM spacing and cap, roster absence), radio-ui 181/181 (4 new in g4-save.test.ts); tsc exit 0; build OK.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: not applicable to this stage (no UI sends options or `send` yet); save round-trip and replay are covered by tests.
- Health/readiness/log/error inspection: all earlier sim-core (95) and radio-ui suites pass unchanged.
- Integration/dependency/config/migration check: no dependency change; `balance.json` gained sections only; v2 saves load unchanged.
- Remaining issue or reason not verified: CI not run (rate limited, waived); `check-repo.ps1` not run (no pwsh); desk UI (stage 4) and final verification (stage 5) not done.

## Security, observability, risk, and rollback

- Security impact: `send` carries ciphertext the sim really deciphers; boundary validation (letters, groups of 4, length, pending sends); options validated at the save boundary.
- Observability impact: four new event types and log lines.
- Residual risk: medium until the desk uses it; Endless pacing numbers are in balance.json.
- Rollback: revert the PR; v2 saves are unaffected, v3 saves would be rejected by the old parser.
- Next safe action: stage 4, the desk UI (menu Endless screen, module-aware desk, Outbox, Private and Roster sheets, summary and high scores).
