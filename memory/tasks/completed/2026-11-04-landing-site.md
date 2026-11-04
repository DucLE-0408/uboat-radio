---
schema_version: 1
id: task-2026-11-04-landing-site
status: completed
owner: claude
goal_confirmed_at: 2026-11-04T07:10:00.0000000Z
started_at: 2026-11-04T07:10:00.0000000Z
updated_at: 2026-11-04T07:45:00.0000000Z
base_commit: c3a741c912833f8b5c2aaa32b5f283cedfa1d7fe
owned_paths:
  - packages/site
  - memory/tasks/completed/2026-11-04-landing-site.md
plan: null
handoff: null
---

# Task: landing-site

## User-confirmed goal

- Confirmation reference: user: "lam web index rieng" + answers (landing + download page; GitHub Release; reuse the game pixel-art style) then "xac nhan, giu Vercel Authentication, tao pre-release"
- Outcome and acceptance criteria: static landing/download page at / and the game at /play/ on the Vercel site; Play, PWA install steps, Windows .exe link (GitHub Releases, SHA-256 and SmartScreen notes); no JS, no external resources, no cookies; mobile/tablet/desktop without horizontal overflow; /play/ installs and its service worker scope is /play/; security headers kept.
- In scope / out of scope: In scope: packages/site (HTML, CSS, assembly script), vercel.json (build, output, trailingSlash, cache headers), docs, task record, one PR stacked on PR 12. Out of scope: custom domain, i18n, analytics, changing Vercel Authentication (kept ON by the user), VERSION bump, tagging. The pre-release itself is a separate step that needs the merged installer artifact.
- Material assumptions and risks: art reuses the game placeholder sprites (TEMPORARY); Silkscreen/VT323 latin subsets lack Vietnamese diacritics so some glyphs fall back to a system font; Vercel preview is behind Vercel Authentication so public visitors cannot see it; the release page link works only once a release exists.

## Architecture linkage

Visitor -> Vercel static host -> / (landing: HTML+CSS+game assets) or /play/ (radio-ui bundle + service worker, scope /play/) -> GitHub Releases (external link) for the unsigned Windows installer.

## Progress and decisions

- Coordination: this branch is stacked on PR 12 (task-2026-11-04-desktop-tauri-vercel, same owner, still in-progress on the base branch). Three files are shared and deliberately not claimed here to avoid an overlapping-claim conflict: vercel.json, .gitignore and docs/architecture.md. This task only appends/edits the landing-site parts of them; PR 12 owns their other content. Revisit when PR 12 merges.

- packages/site/public (index.html, style.css), packages/site/build.mjs (Node built-ins) assembles dist/: landing at root, radio-ui dist under play/, sprites, fonts and icon copied from radio-ui.
- vercel.json: build = radio-ui build + site assembly, output packages/site/dist, trailingSlash true (so /play/ keeps relative asset URLs), sw.js no-cache under /play/, immutable only for hashed /play/assets/, 1 h cache for unhashed /assets/.

- Closed after merge: PR 13 merged as 183d6ac. Hosted preview checked on the Vercel deployment of the branch: / and /play/sw.js responses carry the expected CSP/nosniff/DENY/HSTS headers and no-cache for sw.js; /play and /play/ return the same cached entry (so /play redirects to /play/, inferred from the cache HIT because the fetch tool follows redirects). Still not verified: PWA install from /play/ on the hosted URL, a real-browser session on the hosted URL (Vercel Authentication is ON), the Releases link target until the pre-release exists.

## Verification

- Command/check: npm run build (radio-ui) + node packages/site/build.mjs; Chromium via python http.server on the assembled dist at 360, 820 and 1440 px
- Result: `passed`
- Evidence/reason: no horizontal overflow at all three widths; 0 console errors/warnings and 0 failed requests on / and /play/; service worker scope is /play/; screenshots reviewed (desktop and mobile).
- Command/check: python3 -I scripts/validate_repo.py
- Result: `passed`
- Evidence/reason: governance validation passed.
- Command/check: Vercel deployment of this branch, header check on /, /play/, /play/sw.js, PWA install from /play/; GitHub pre-release
- Result: `not verified`
- Evidence/reason: pending push and deploy; the pre-release needs the .exe artifact of a merged build.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Chromium on the assembled dist (see above); no install test yet from the hosted URL.
- Health/readiness/log/error inspection: clean console, no failed requests.
- Integration/dependency/config/migration check: no new dependency; radio-ui and sim-core untouched; vercel.json output path changed.
- Remaining issue or reason not verified: hosted behaviour, PWA install from /play/, release link target, Vietnamese glyph fallback is cosmetic.

## Security, observability, risk, and rollback

- Security impact: static page, no script, no external origin; CSP/nosniff/frame-ancestors headers inherited; only outbound links to github.com with noopener.
- Observability impact: none added (no analytics by design).
- Residual risk: placeholder art; fonts without Vietnamese glyphs; release link dead until a release exists.
- Rollback: revert this PR (vercel.json returns to serving radio-ui at /).
- Next safe action: pre-release (task-2026-11-04-desktop-prerelease), then verify the Releases link and PWA install on the hosted URL.
