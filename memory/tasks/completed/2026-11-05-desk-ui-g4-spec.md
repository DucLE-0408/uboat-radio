---
schema_version: 1
id: task-2026-11-05-desk-ui-g4-spec
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T00:12:58.0000000Z
started_at: 2026-11-05T00:12:58.0000000Z
updated_at: 2026-11-05T00:12:58.0000000Z
base_commit: 92f892f3436e7262a38aab7da276936aa74505cc
owned_paths:
  - docs/specs/desk-ui-g4
  - docs/specs/desk-ui/tasks.md
  - memory/tasks/completed/2026-11-05-desk-ui-g4-spec.md
plan: null
handoff: null
---

# Task: desk-ui-g4-spec

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "ok tiếp với G4 đi"; the standing handoff rule from G3 applies: G4 (Endless, encrypt and send, Private Message, Roster) needs its own spec and operator approval before any sim-core change
- Outcome and acceptance criteria: a DRAFT spec for G4 with requirements, design (sim-core change table, open questions with proposed defaults) and tasks with an approval gate S0; documentation only
- In scope / out of scope: in = `docs/specs/desk-ui-g4/*` and a status note in `docs/specs/desk-ui/tasks.md`; out = any `packages/sim-core` or UI change
- Material assumptions and risks: the spec proposes a save version bump (v3 with `opts`), new commands (`send`, `leave`) and events; all numbers in design section 8 are proposals; the "UI direction" question (AGENTS section 2.7) is flagged for the operator

## Architecture linkage

Menu options -> `Watch(seed, opts)` -> endless generator and module switches -> `MSG_RX`; desk Outbox -> `send` command -> sim check with the day key -> `SEND_RESULT`; sim `PRIVATE_MSG`/`ROSTER_CHANGE` -> desk papers. Save v3 = seed + opts + commandLog.

## Progress and decisions

- Wrote requirements R1 to R8, design (architecture, sim-core change table, endless pacing, modules, sending, PM and roster, save, 10 open questions) and tasks (gate S0, stages 1 to 5).
- Decision: sim emits only `topic` and `tone` for Private Messages and keeps all text on the desk side, so replay and D4 stay simple. Decision: score stays on the desk as in G3.

## Verification

- Command/check: `python3 scripts/validate_repo.py`; `git diff origin/main --stat`; read-through against `packages/sim-core/src` (`watch.ts` commands and timers, `messages.ts` forgery invariant, `traffic.ts` `decipherCopy`) and the G3 spec
- Result: `passed`
- Evidence/reason: validator passed; diff is documentation only; D8 and D10 are stated as invariants and mapped to tests in the tasks.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: not applicable (documentation only).
- Health/readiness/log/error inspection: not applicable.
- Integration/dependency/config/migration check: no code, dependency or config change.
- Remaining issue or reason not verified: spec content not reviewed by the operator; all thresholds, names and difficulty values are proposals.

## Security, observability, risk, and rollback

- Security impact: none now; the spec notes that `send` carries ciphertext the sim really checks (no client-reported facts) and bounds message size and queue.
- Observability impact: none now.
- Residual risk: G4 changes the save format and adds an unbounded generator; gate S0 blocks implementation until approved.
- Rollback: revert the docs commit.
- Next safe action: operator reviews `docs/specs/desk-ui-g4/` and answers design section 8; do not touch sim-core before that.
