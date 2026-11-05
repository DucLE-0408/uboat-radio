---
schema_version: 1
id: task-2026-11-05-desk-ui-g7-spec
status: in-progress
owner: claude
goal_confirmed_at: 2026-11-05T09:54:41.6476161Z
started_at: 2026-11-05T09:54:41.6476161Z
updated_at: 2026-11-05T10:05:00.0000000Z
base_commit: 126dbbc1d958c42dc631c20db5dd312f6b25d2a9
owned_paths:
  - docs/specs/desk-ui-g7
  - docs/specs/desk-ui-g8
  - docs/specs/README.md
plan: null
handoff: null
---

# Task: desk-ui-g7-spec

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: layout described over several messages, '1. typo (slip) 2. yes (papers pulled from compartments)'; spec first, no code until the spec is approved
- Outcome and acceptance criteria: Write the G7 spec (requirements, design, tasks; docs only, no code) for the desk cabinets: left three-compartment pull-out cabinet, separate Orders cabinet, one stamp with two ink pads (one stamp per dip), and three stowable machines on the right (Echo stamper, Teletyper, Enigma).
- In scope: three Vietnamese spec files (`requirements.md`, `design.md`, `tasks.md`) plus `reference.md` and one README index row in `docs/specs/`. Out of scope: any code, sprites, sim-core, and the Schluesselzettel paper details.
- Material assumptions and risks: assumption: "sender verify clip" is the sender verification slip; papers sit in the compartments and are pulled out. Six open questions are listed in design section 8 and block gate S0. The base branch is `desk-papers-slip-encode` (PR 47), because G7 builds on the slip and encode sheet.

## Architecture linkage

Documentation only: no runtime path is touched. The spec describes a UI-only change inside `packages/radio-ui/src/desk` (state in `PaperModel` and `desk.v1`, no sim-core command or event).

## Progress and decisions

- Spec written 2026-11-05 from the operator's messages and reference images; status CHO DUYET.
- The operator answered the six open questions the same day; the answers are folded into G7 (trash rule, mouse-held stamp and clip, Echo-less handover fails the task, controls panel relocated). The relocation and the WWII map, ruler and dividers became a separate draft spec `docs/specs/desk-ui-g8/` because it needs a sim-core gate (map data, SIM_VERSION). Next: the operator approves gate S0 of both specs; no code before that.

## Verification

- Command/check: `scripts/check-repo.ps1`
- Result: `passed`
- Evidence/reason: see the completion run recorded below.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: not applicable (documentation only).
- Health/readiness/log/error inspection: not applicable.
- Integration/dependency/config/migration check: no dependency, config or code change.
- Remaining issue or reason not verified: the spec's claims about existing code (geometry, `applyTool`, `desk.v1`) come from reading the current source; they are not exercised. The layout is a draft sketch, not a final screenshot.

## Security, observability, risk, and rollback

- Security impact: none.
- Observability impact: none.
- Residual risk: the spec is a plan; implementation may change positions once real screenshots exist.
- Rollback: revert the commit.
- Next safe action: operator reviews `docs/specs/desk-ui-g7/` and answers design section 8; then gate S0 and Stage 1.
