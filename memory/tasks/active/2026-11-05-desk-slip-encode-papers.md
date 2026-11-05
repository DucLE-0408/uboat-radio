---
schema_version: 1
id: task-2026-11-05-desk-slip-encode-papers
status: in-progress
owner: claude
goal_confirmed_at: 2026-11-05T07:55:30.1998123Z
started_at: 2026-11-05T07:55:30.1998123Z
updated_at: 2026-11-05T08:10:00.0000000Z
base_commit: 50632511c4df754b6ca351c6e21b711a9493b2a0
owned_paths:
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/i18n
  - packages/radio-ui/assets
  - packages/radio-ui/tools/art
  - packages/radio-ui/test/desk-slip-encode.test.ts
plan: null
handoff: null
---

# Task: desk-slip-encode-papers

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: goal and scope confirmed ('okey dung roi do'); sim-core unchanged assumed
- Outcome and acceptance criteria: Add the sender-ID verification slip and the encode-output sheet as real desk papers (modelled on the reference game's VERIFICATION MESSAGE SLIP and ENCODING MESSAGE OUTPUT), and keep the existing decode Output sheet; desk UI only, no sim-core change.
- In scope: two new paper kinds on the desk (`slip`, `encode`) with sprites, i18n (en, vi), persistence in desk.v1, tests. Out of scope: sim-core, game rules, dependencies, a new UI direction, restyling the decode Output sheet (the operator did not ask for a change; it already exists).
- Material assumptions and risks: assumption: the slip shows the deciphered Sender ID (same value as the Input back) and states no verdict, so no tell is revealed; slip and encode are desk-only papers the sim does not track, so binning one is refused locally with no sim citation. Sprites are TEMPORARY placeholder art like the rest of the desk.

## Architecture linkage

Store (rx attempts, `a.paper.senderIdCipher`, `watch.replyRequest`, `sendResults`) -> desk/index.ts builders `slip` and `encode` (presentation only; decisions still go through `actions`) -> PaperModel (ids `slip:<rx>:<attempt>`, `enc:<rx>:0`) -> desk.v1 localStorage layout (parseLayout whitelist). No network, DB or sim-core boundary is crossed.

## Progress and decisions

- Art: `paperSlip` (80x44) and `paperEncode` (112x104), two frames each, added to `tools/art/desk.ts`; `node tools/art/generate.ts` regenerated the manifest (only the two new sprites and their manifest entries changed).
- Slip appears once the Input has finished printing (or when a saved layout holds it) and only when the message has paper data (signatures module). Encode appears when the message has a reply request (Endless Outbox); the Outbox field stays the keyboard, the sheet shows request, start positions, cipher groups and the result.
- Both are stampable, signable, clippable (same message only) and travel with a clipped bundle on hand-over; neither is a hand-over requirement (rules unchanged).

## Verification

- Command/check: `npx tsc --noEmit` in packages/radio-ui
- Result: `passed`
- Evidence/reason: exit 0.
- Command/check: `npx vitest run` in packages/radio-ui (includes new test/desk-slip-encode.test.ts, 5 tests)
- Result: `passed`
- Evidence/reason: 32 files, 215 tests passed.
- Command/check: `npx vitest run` in packages/sim-core (replay/determinism unaffected, no sim-core change)
- Result: `passed`
- Evidence/reason: exit 0.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Vite dev server, New Game: Input printed, slip appeared, showed `(machine off)`, then the deciphered id after power on, flipped to its back, survived a reload. Endless (Teletyper off): Input, slip and encode sheet appeared; typing the reply in the Outbox showed cipher `XRMN RXTF` both in the Outbox and on the encode sheet.
- Health/readiness/log/error inspection: no console or server errors were read; not formally inspected (not verified).
- Integration/dependency/config/migration check: no dependency, config or sim-core change; desk.v1 layout stays backward compatible (new id prefixes only). A temporary `.claude/launch.json` used for the preview was removed.
- Remaining issue or reason not verified: Vietnamese layout of the two sheets and the 1920px/mobile layouts were not checked on screen; stamping and hand-over of the new sheets was covered by unit tests, not exercised in the browser; the encode sheet's spawn position change (150,244) was not seen on a fresh game.

## Security, observability, risk, and rollback

- Security impact: none; stored ids are validated against a strict regex, no new untrusted input path.
- Observability impact: none.
- Residual risk: the encode sheet can overlap the Input at first sight (draggable); the slip is hidden under the pulled-out cipher machine like other sheets.
- Rollback: revert the branch commit(s); saved desk.v1 layouts holding `slip:`/`enc:` ids are dropped by older builds because their id check rejects them.
- Next safe action: operator review of the screenshots, then commit and PR on branch desk-papers-slip-encode (not committed yet).
