---
schema_version: 1
id: task-2026-11-04-desk-ui-g3-spec
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-04T16:20:00.0000000Z
started_at: 2026-11-04T16:20:00.0000000Z
updated_at: 2026-11-04T16:32:38.0000000Z
base_commit: bb1185b0289e2f1ad726a53bc3ad8ee627f26505
owned_paths:
  - docs/specs/desk-ui-g3
  - docs/specs/desk-ui/tasks.md
  - memory/tasks/completed/2026-11-04-desk-ui-g3-spec.md
plan: null
handoff: null
---

# Task: desk-ui-g3-spec

## User-confirmed goal

- Confirmation reference: operator handoff 2026-11-04: "G3 needs its own sim-core spec ... Write it as docs/specs/desk-ui-g3/ (requirements, design, tasks), DRAFT. Stop and ask the operator to approve before any sim-core change."
- Outcome and acceptance criteria: a DRAFT spec for G3 (citations and consequences, paper tells, plugboard) with requirements, design, tasks and open questions; no code change
- In scope / out of scope: in = `docs/specs/desk-ui-g3/*`, a status note in `docs/specs/desk-ui/tasks.md`. Out = any `packages/sim-core` or UI change, G4.
- Material assumptions and risks: the spec proposes sim-core changes (commands, events, save version) that need operator approval; defaults in the open questions are proposals only.

## Architecture linkage

Desk facts -> Actions -> `Watch.dispatch` command -> rule table (data) -> citation ledger -> `CITATION`/`CONSEQUENCE` events -> store -> desk. Replay from seed + command log (D9).

## Progress and decisions

- Wrote requirements (R1 to R9), design (sim-core change table, rule scoring, paper tells, plugboard, sim-time deadlines, save compatibility, 7 open questions) and tasks (gate S0, stages 1 to 5).
- Decision: consequences live in the sim; the UI only reports observed facts. Timeout moves to sim-time so replay stays bit-exact.

## Verification

- Command/check: `python3 scripts/validate_repo.py`; `git diff origin/main --stat`; read-through of cross-references to `docs/specs/desk-ui` and the existing `messages.ts` tell invariant
- Result: `passed`
- Evidence/reason: validator passed; diff limited to docs; invariant text matches `messages.ts` (at least one verifiable tell, bearing only beyond min range).

## Runtime and codebase-health verification

- Runtime/user-flow exercise: not applicable (documentation only).
- Health/readiness/log/error inspection: not applicable.
- Integration/dependency/config/migration check: no code, dependency or config change.
- Remaining issue or reason not verified: spec content is unreviewed by the operator; sim-core names and thresholds are proposals.

## Security, observability, risk, and rollback

- Security impact: none now; the spec flags client-reported facts as the anti-cheat limit.
- Observability impact: none now.
- Residual risk: scope of G3 sim-core change is large; approval gate S0 blocks implementation.
- Rollback: revert the docs commit.
- Next safe action: operator reviews `docs/specs/desk-ui-g3/` and answers design section 8; do not touch sim-core before that.
