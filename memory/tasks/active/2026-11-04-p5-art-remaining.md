---
schema_version: 1
id: task-2026-11-04-p5-art-remaining
status: blocked
owner: claude-desktop-session
goal_confirmed_at: 2026-11-04T09:11:56.2618157Z
started_at: 2026-11-04T09:11:56.2618157Z
updated_at: 2026-11-04T09:11:56.2618157Z
base_commit: 1feac6fa80ad31d10c46e194fc80c53e95f4c355
owned_paths:
  - packages/radio-ui/tools/art
  - packages/radio-ui/assets
  - packages/radio-ui/public/icons
  - packages/radio-ui/src/menu/menu.css
  - packages/site/public
  - memory/tasks/active/2026-11-04-p5-art-remaining.md
plan: null
handoff: null
---

# Task: p5-art-remaining

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-04: "upgrade các art còn lại" after the scope proposal (menu, app icons, landing page)
- Outcome and acceptance criteria: menu art, PWA/app icons and landing page follow the approved art direction (slate / dusty rose / green-black / moonlit blue, brass accents, no uniform dither); logic untouched; tests, tsc, build, check-repo pass; menu captured at 1280/390 and the landing at 1280/390 with no horizontal scroll.
- In scope / out of scope: in = tools/art/menu.ts and icons.ts, menu.css, site style.css/index.html tokens, regenerated sprites and manifest. Out = gameplay, sim-core, menu logic, new animation, new dependencies.
- Material assumptions and risks: art stays TEMPORARY and code-drawn; fidelity to the reference is the operator's call.

## Architecture linkage

Presentation only: tools/art generator -> assets/sprites + manifest -> menu CSS vars; packages/site build copies the radio-ui sprites, so the landing banner follows automatically.

## Progress and decisions

- Menu backdrop redrawn as a night sea (12 flat sky bands, moon, dash-built moon path, brighter moonlit boat), slate panel with mauve rails, brass plates and icons on slate, sealed letter on clean paper.
- App icons redrawn on the night palette (PWA icons regenerated).
- Menu CSS and landing tokens moved off purple/dusk.
- Landing index art (operator follow-up: "upgrade cả art của index", same acceptance): added a game screenshot showcase (site/public/assets/desk.png, a real capture, not generated) and a 7-icon pixel sheet (tools/art/site.ts -> site-icons.png) for the cards; build.mjs copies the sheet.

## Verification

- Command/check: npx vitest run; npx tsc --noEmit; npm run build; check-repo.ps1
- Result: passed (vitest 120/120, tsc 0, build 0, check-repo pass)
- Evidence/reason: docs/specs/p5-radio-room-presentation/evidence/artpass2-*.png

## Runtime and codebase-health verification

- Runtime/user-flow exercise: headless Edge (CDP) on vite dev and the built landing: menu 1280/390, help card, landing 1280/390; no horizontal scroll, no button under 44 px.
- Health/readiness/log/error inspection: not separately inspected beyond the above.
- Integration/dependency/config/migration check: no dependency change.
- Remaining issue or reason not verified: help/settings cards only checked for colour tokens, not every state; mobile menu screenshot not reviewed visually beyond metrics.

## Security, observability, risk, and rollback

- Security impact: none.
- Observability impact: none.
- Residual risk: art remains TEMPORARY.
- Rollback: revert the PR; regenerate with node tools/art/generate.ts.
- Next safe action: operator review.
