---
schema_version: 1
id: plan-2026-11-04-desk-ui-stage5
task: memory/tasks/active/2026-11-04-desk-ui-stage5.md
status: approved
owner: claude-desktop-session
base_commit: 29ecbdf
---

# Plan: desk-ui-stage5

## Confirmed scope and acceptance criterion

- In: docs/specs/desk-ui Stage 5. T5.1 full checks; T5.2 a full watch on the desk in headless Edge (en and vi, reload mid-watch, summary at the end, console clean); T5.4 Desk becomes the default UI (Settings default `desk`; P5 stays a Settings option; P4 stays at `?ui=classic`); T5.3 docs/architecture.md desk section and records.
- Out: G2 features; sim-core.
- Acceptance criterion: a fresh player lands on the desk; a full watch reaches the summary without errors; P5 and classic still load; all checks pass.

## Topology and blast radius

settings.ts default, menu label, main.ts comment, tests, docs. Players who saved `ui: "p5"` keep P5 (their setting wins).

## Contracts, dependencies, and failure modes

Settings parsing unchanged (`desk` already valid). A small window shows the desk's desktop-only notice with a link to the radio room.

## Ordered implementation

1. Default switch + tests. 2. Full-watch run + evidence. 3. Docs + records.

## Security, reliability, and observability controls

No new inputs; no dependency.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc | exit 0 |
| Unit/integration | vitest both packages | pass |
| Runtime/user flow | Edge full watch at speed 60, reload, en/vi, default URL lands on desk, P5/classic still load | eval + screenshots |
| Operations | check-repo, sim-core diff | pass, empty |

## Rollout, rollback triggers, and rollback steps

Rollback: set the default back to `p5` in settings.ts.
