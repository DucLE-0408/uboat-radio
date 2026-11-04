---
schema_version: 1
id: plan-2026-11-04-desk-ui-stage1
task: memory/tasks/completed/2026-11-04-desk-ui-stage1.md
status: completed
owner: claude-desktop-session
base_commit: dccfcce
---

# Plan: desk-ui-stage1

## Confirmed scope and acceptance criterion

- In: docs/specs/desk-ui Stage 1 (T1.1-T1.4): `src/i18n` (en/vi, `t()`, key-parity test, language in Settings), VT323 Vietnamese subset (hash + OFL), `src/desk` mounted by `?ui=desk` on a 640x360 integer-scaled frame reusing the P5 boat cutaway, an art slice (desk top, left column, boat controls panel, Teletyper, Echo Stamper, one two-sided Input sheet) and screenshots.
- Out: paper drag model, Teletyper printing, machine, stamping, dialogue (Stage 2+); any sim-core change; changing the default UI.
- Acceptance criterion: `?ui=desk` renders the slice at 1280x720 and 1920x1080 with no console errors; `?ui=desk&lang=vi` shows Vietnamese glyphs; P5 and classic unchanged; tsc, vitest (both packages), build and check-repo pass; `git diff packages/sim-core` empty.

## Topology and blast radius

main.ts picks the view (classic / scene / desk). Desk reuses Ctx (store, controller actions, audio) and `scene/boat.ts`. New files only, plus small edits: main.ts view switch, settings.ts (`ui` adds "desk", new `lang`), menu settings UI, tools/art/generate.ts (desk sprites), manifest.

## Contracts, dependencies, and failure modes

- No new dependency. Font copied from the official @fontsource/vt323@5.3.0 tarball (npm integrity verified by npm pack).
- Settings parsing stays field-by-field; unknown `lang` falls back to `en`.
- Missing sprites: same `no-sprites` fallback as P5.

## Ordered implementation

1. i18n module + tables + test; Settings `lang` and `ui: "desk"`.
2. Font subset + manifest FONTS entry + CSS `:lang(vi)` font swap.
3. tools/art/desk.ts sprites; regenerate manifest.
4. src/desk mount + CSS; main.ts switch.
5. Tests, typecheck, build, check-repo; Edge screenshots; evidence in docs/specs/desk-ui/evidence.

## Security, reliability, and observability controls

Text only through textContent; URL `lang` allowlisted; asset load failures go to diag codes as in P5.

## Verification matrix

| Layer | Check | Expected evidence |
|---|---|---|
| Static | tsc --noEmit, invariants test | exit 0 |
| Unit/integration | vitest radio-ui + sim-core, i18n parity, settings parse | all pass |
| Runtime/user flow | Edge headless `?ui=desk` en/vi at 1280/1920, P5 default still loads | screenshots, clean console |
| Operations | check-repo.ps1, git diff packages/sim-core | pass, empty |

## Rollout, rollback triggers, and rollback steps

Opt-in via `?ui=desk` only. Rollback: revert the commit; regenerate sprites with `node tools/art/generate.ts`.
