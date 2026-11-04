---
schema_version: 1
id: plan-2026-11-04-desk-ui-stage4
task: memory/tasks/completed/2026-11-04-desk-ui-stage4.md
status: completed
owner: claude-desktop-session
base_commit: 2d3d804
---

# Plan: desk-ui-stage4

## Confirmed scope and acceptance criterion

- In: docs/specs/desk-ui Stage 4. T4.2 boat controls panel wired to existing Actions (mode, speed, silence, report), heading/speed/antenna readouts, buttons that open the P5 sonar/auth/log drawers, P5 emergency panel. T4.3 Daily Orders and Manual as multi-page reference sheets from the drawer (new text, en/vi; Orders use public data: worldCtx callsigns and known fists). T4.1 crew at the door (5 original portraits), Transcript with name/role and the player's lines, dialogue tables en/vi keyed by observed events, chosen with a cosmetic RNG.
- Out: G2 day key on the Orders, scoring, timers; citations (G3); default UI switch (T5.4); sim-core.
- Acceptance criterion: every boat order from the panel reaches the sim; drawers and emergency work on the desk; Orders/Manual open, page and put away; dialogue appears on watch start, first signal, hand-over, decision, auth result, DF fix, depth charge and bridge alert without revealing truth before MSG_RESOLVED; any key advances, holding Space skips; no dialogue replays on reload; tests/tsc/build/check-repo pass; sim-core diff empty.

## Topology and blast radius

src/desk: index.ts (controls, drawers, docs, door, transcript), docs.ts (pages), dialogue.ts (tables + picker), papers.ts (reference kinds, drawer place); tools/art/desk.ts (crew, docs, controls without the static lever); tools/art/portrait.ts gains crewMember() (operator pixels unchanged, checked by the asset hash test). Reuses scene/drawers.ts and scene/emergency.ts unchanged.

## Contracts, dependencies, and failure modes

- Dialogue reacts only to observed state (store), never to truth; after a decision it stays neutral about correctness (D4; correctness is shown in the summary).
- Silent rebuild: counters are initialised from the restored state, so nothing replays.
- Transcript captures keys only while open; typing resumes when it closes.

## Ordered implementation

1. T4.2 panel + drawers + emergency. 2. Art: crew, docs, controls. 3. T4.3 docs + papers kinds + tests. 4. T4.1 dialogue + transcript + tests. 5. Edge checks, evidence, records.

## Security, reliability, and observability controls

textContent only; storage validated (new kinds/place); no dependency.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc, invariants | exit 0 |
| Unit/integration | docs/dialogue parity, papers kinds, full suites | pass |
| Runtime/user flow | Edge: panel orders change boat state, drawers open, Orders/Manual paging, dialogue on start and hand-over, skip, reload without replay | eval output + screenshots |
| Operations | check-repo, sim-core diff | pass, empty |

## Rollout, rollback triggers, and rollback steps

Opt-in `?ui=desk`. Rollback: revert the Stage 4 commits; regenerate sprites.
