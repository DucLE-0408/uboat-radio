---
schema_version: 1
id: task-2026-11-04-desk-ui-spec
status: completed
owner: claude-desktop-session
goal_confirmed_at: 2026-11-04T10:45:59.5438457Z
started_at: 2026-11-04T10:45:59.5438457Z
updated_at: 2026-11-04T12:41:31.4172684Z
base_commit: 1feac6fa80ad31d10c46e194fc80c53e95f4c355
owned_paths:
  - docs/specs/desk-ui
  - memory/tasks/active/2026-11-04-desk-ui-spec.md
plan: null
handoff: null
---

# Task: desk-ui-spec

## U## User-confirmed goal

- Confirmation reference: operator chat 2026-11-04: "okey bắt đầu đi" after the goal confirmation (spec only, DRAFT)
- Outcome and acceptance criteria: three DRAFT files docs/specs/desk-ui/{requirements,design,tasks}.md for a False-Echo-style paperwork desk (?ui=desk) in the P5 art style; EARS requirements, two-sided paper model, UI action -> existing Command mapping, inferred vs verified marked, open decisions listed.
- In scope / out of scope: in = spec documents. Out = code, sim-core change, landing change, art.
- Material assumptions and risks: False Echo mechanics come from operator screenshots and strings in the demo's data file; several rules are inferred.

## Architecture linkage

Desk UI is a new presentation layer in packages/radio-ui reusing the P5 controller/store/session/audio; decisions still flow through Watch.dispatch (resolve on Echo stamp).

## Progress and decisions

- Operator answers recorded: desktop-only, keep noise and Morse audio, rotor set by mouse wheel per Daily Orders, add plugboard, scoring +1/-1 (negative allowed), citations 3 -> danger / position exposed, 5 -> executed, en+vi, layout after the reference, new build in P5 style.
- Phasing chosen by the assistant (operator: "hãy quyết định thông minh"): G1 playable desk (presentation only), G2 real machine + day key + score, G3 sim-core spec (citations, paper tells, plugboard), G4 Endless/encoding/notes/roster.
- Operator approved via cards: D2 amendment (UI may call dayEnigma, decipherCopy, Enigma with the session seed); Desk becomes default after G1; Vietnamese subset of the same OFL font; score unit Ration / Khau phan.
- Operator approved the three spec files on 2026-11-04 ("Duyệt, làm Stage 1").

## Verification

- Command/check: scripts/check-repo.ps1
- Result: passed (run after writing the spec)
- Evidence/reason: documents only; no code changed

## Runtime and codebase-health verification

- Runtime/user-flow exercise: not applicable (documentation only).
- Health/readiness/log/error inspection: not applicable.
- Integration/dependency/config/migration check: no dependency or config change.
- Remaining issue or reason not verified: Vietnamese glyph coverage of the bundled fonts is checked in the Stage 1 task.

## Security, observability, risk, and rollback

- Security impact: none.
- Observability impact: none.
- Residual risk: inferred reference rules may be wrong; large art/content workload.
- Rollback: delete docs/specs/desk-ui.
- Next safe action: Stage 1 task (desk-ui-stage1).
