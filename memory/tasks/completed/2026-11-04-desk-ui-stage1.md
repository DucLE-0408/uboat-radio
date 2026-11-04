---
schema_version: 1
id: task-2026-11-04-desk-ui-stage1
status: completed
owner: claude-desktop-session
goal_confirmed_at: 2026-11-04T12:43:05.5903789Z
started_at: 2026-11-04T12:43:05.5903789Z
updated_at: 2026-11-04T12:58:19.9983515Z
base_commit: dccfcce77a37f26d2569106d91c24d03770ac9fb
owned_paths:
  - packages/radio-ui/src/desk
  - packages/radio-ui/src/i18n
  - packages/radio-ui/src/main.ts
  - packages/radio-ui/src/menu
  - packages/radio-ui/src/scene/scene.css
  - packages/radio-ui/tools/art
  - packages/radio-ui/assets
  - packages/radio-ui/test
  - docs/specs/desk-ui
  - memory/plans/2026-11-04-desk-ui-stage1.md
  - memory/tasks/active/2026-11-04-desk-ui-stage1.md
plan: memory/plans/2026-11-04-desk-ui-stage1.md
handoff: null
---

# Task: desk-ui-stage1

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-04: "Duyet, lam Stage 1" after the approved spec
- Outcome and acceptance criteria: Desk UI Stage 1 (T1.1-T1.4): i18n en/vi + VT323 Vietnamese subset, ?ui=desk mount on the 640x360 frame reusing the P5 cutaway, art slice and screenshots for review
- In scope / out of scope: in = src/i18n, src/desk, settings lang + ui "desk", font subset, tools/art/desk.ts, evidence. Out = paper drag model, Teletyper printing, machine, stamping, dialogue (Stage 2+), sim-core, default UI change.
- Material assumptions and risks: code-drawn TEMPORARY art; aesthetic match to the reference is the operator's judgement.

## Architecture linkage

main.ts picks the view (classic / P5 scene / desk). Desk reads the P5 store and reuses scene/boat.ts; no Command is sent by Stage 1 (stations are read-only). Fonts are local OFL files.

## Progress and decisions

- Operator asked to commit and open the PR for Stage 1 (2026-11-04); drag, drawers and stamping stay in Stages 2-4 as planned.
- Spec approved and committed (dccfcce). Art-pass task record brought over closed from PR #18 (identical file) so tools/art is not double-claimed.
- Silkscreen has no Vietnamese subset (@fontsource/silkscreen@5.3.0 ships latin and latin-ext only); added vt323-vietnamese-400-normal.woff2 from @fontsource/vt323@5.3.0 (sha256 84b335a5...). Desk switches its label font to VT323 in lang=vi; Silkscreen's Vietnamese-only code points borrow VT323 glyphs elsewhere.
- Mission sheet rotation removed (non-integer transform blurred the pixel art).

## Verification

- Command/check: npx tsc --noEmit; npx vitest run (radio-ui); npm run build; npx vitest run (sim-core); git diff --stat packages/sim-core; git grep truthOf/innerHTML in src/desk and src/i18n; scripts/check-repo.ps1
- Result: passed (tsc 0; 124/124; build 0; 70/70; sim-core diff empty; 0 matches; check-repo passed)
- Evidence/reason: docs/specs/desk-ui/evidence/stage1-*.png

## Runtime and codebase-health verification

- Runtime/user-flow exercise: headless Edge over CDP against vite dev: ?ui=desk at 1280x720 and 1920x1080 (en), ?lang=vi front and back, flip button, 1024x768 desktop-only notice, P5 default at 1280 unchanged.
- Health/readiness/log/error inspection: console only vite connect debug lines; no exceptions; scrollWidth equals viewport width in every capture.
- Integration/dependency/config/migration check: no dependency change; manifest regenerated (43 sprites, 3 fonts); settings parser accepts ui "desk" and lang, rejects others.
- Remaining issue or reason not verified: aesthetic fidelity vs the reference (operator judgement); menu text is still English apart from the language picker; Firefox/Safari not checked.

## Security, observability, risk, and rollback

- Security impact: none; text only through textContent; ?lang= allowlisted.
- Observability impact: asset failures reported through the existing diag codes.
- Residual risk: PR #18 also regenerates manifest.json and edits generate.ts, so merging both needs a regenerate (node tools/art/generate.ts) to resolve.
- Rollback: revert the Stage 1 commit and run node tools/art/generate.ts.
- Next safe action: Stage 2 (paper model and drag, Teletyper, Output) after the operator reviews the slice in the PR.
