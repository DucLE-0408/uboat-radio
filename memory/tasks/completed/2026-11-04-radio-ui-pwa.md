---
schema_version: 1
id: task-2026-11-04-radio-ui-pwa
status: completed
owner: claude
goal_confirmed_at: 2026-11-04T04:08:41.0000000Z
started_at: 2026-11-04T04:08:41.0000000Z
updated_at: 2026-11-04T04:13:56.0000000Z
base_commit: 0fdc4e2588f980effda7ddd6929c178eb1430334
owned_paths:
  - packages/radio-ui
  - docs/architecture.md
  - memory/tasks/active/2026-11-04-radio-ui-pwa.md
plan: null
handoff: null
---

# Task: radio-ui-pwa

## User-confirmed goal

- Confirmation reference: user: 'build thanh app luon chay tren cac nen OS nhu windows' + choices 'PWA cai duoc' and 'PR rieng xep chong tren PR 9, chua phat hanh'
- Outcome and acceptance criteria: Make the radio room installable and runnable offline as an app on Windows/macOS/Linux/Android through a PWA: manifest, icons, build-time service worker, relative base; no new dependency; no release
- In scope / out of scope: In scope: web app manifest, generated placeholder icons (original, marked TEMPORARY), a build-time service worker emitted by an in-repo Vite plugin (no dependency), relative `base`, service-worker registration in production only, install/run instructions, tests and browser verification (installability via CDP, offline reload). Out of scope: Electron/Tauri wrappers, code signing, installers (.exe/.msi), CI release workflow, tagging/publishing, VERSION bump, any sim-core change.
- Material assumptions and risks: the cloud sandbox is Linux, so a real Windows install and run is NOT verified; only Chromium-level installability (CDP getInstallabilityErrors) and offline behaviour are. A PWA install needs a secure origin (https or localhost) and cannot be launched by double-clicking index.html (browsers block module scripts on file://). Stacked on PR 9 (P5, unmerged).

## Architecture linkage

Client/input → API/handler → service → DB/cache/queue/external dependency → logs/metrics/traces.

## Progress and decisions

- User chose the PWA route (no new dependency) and a separate PR stacked on PR 9; no release.
- Implemented: public/manifest.webmanifest, icons (tools/art/icons.ts, 3 PNGs, listed TEMPORARY in assets/manifest.json), tools/pwa/sw-template.ts, in-repo Vite plugin emitting sw.js, base "./", src/pwa.ts registration (production + secure origin), update notice, `pwa` diag kind, README with Windows/macOS/Linux/Android install steps, docs/architecture.md section.
- Bug found by the browser run: with `Vary: Origin` the CORS module/CSS requests missed the cache offline (assets failed with ERR_FAILED). Fixed with `ignoreVary: true` and a test.
- Known design limit: cache-first shell means an update becomes active the launch after it was downloaded; the player gets a notice when it is ready.

## User-confirmed goal

- Confirmation reference: see front matter and above.
- Outcome and acceptance criteria: installable, offline-capable PWA of the radio room; build runs from any folder; no new dependency; no release.
- In scope / out of scope: see above.
- Material assumptions and risks: Linux sandbox only; real Windows install not verified.

## Architecture linkage

Browser (Edge/Chrome) -> manifest + service worker (cache-first app shell) -> existing radio-ui bundle -> localStorage (save v2, transcripts) -> no server, no network after first load.

## Verification

- Command/check: `npx tsc --noEmit` (radio-ui, sim-core); `npx vitest run` (radio-ui, sim-core); `npx vite build`
- Result: `passed`
- Evidence/reason: tsc clean in both; radio-ui 108/108 (new test/pwa.test.ts: generator, safe fetch policy, manifest, icon sizes, HTML shell, registration policy, diag code); sim-core 70/70; production build emits sw.js with 11 precache entries.
- Command/check: Chromium against `vite preview` (127.0.0.1:4173) and a plain `python -m http.server` at /dist/ (sub-path)
- Result: `passed`
- Evidence/reason: service worker activated and controlling after reload; `Page.getInstallabilityErrors` = []; `Page.getAppManifest` without errors; only the page origin contacted; offline reload (network disabled) loads the game and accepts typing, 0 failed requests, 0 console issues; update flow: rebuilt app installs a new cache and takes over after all tabs close; full mobile touch playthrough (type, decode, challenge, auth pickers, check, sonar/log tabs, pause) passes on the production build.
- Command/check: `grep -rn truthOf packages/radio-ui/src`; `git diff --stat origin/p5-radio-room-presentation -- packages/sim-core`; `python3 -I scripts/validate_repo.py`
- Result: `passed`
- Evidence/reason: no truthOf; no sim-core changes; governance validation passed.
- Command/check: install and run on a real Windows/macOS/Android device; Edge/Chrome install UI; Safari
- Result: `not verified`
- Evidence/reason: Linux cloud sandbox, headless Chromium only. Installability was asserted through Chrome DevTools Protocol, not by installing.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: see the Chromium checks above (online, offline, sub-path, update, mobile touch).
- Health/readiness/log/error inspection: console had 0 errors or warnings in all runs; no failed requests; `?diag=1` has a `pwa` line (empty when registration succeeds).
- Integration/dependency/config/migration check: no new dependency (typescript, vite, vitest unchanged); base "./" affects only URL generation; dev server unchanged (service worker not registered in dev); sim-core untouched.
- Remaining issue or reason not verified: real-device installs; the placeholder icons are TEMPORARY art; native installers and signing are out of scope; double-clicking dist/index.html does not work (browsers block module scripts on file://), documented in the README.

## Security, observability, risk, and rollback

- Security impact: worker scope is the app folder; only same-origin GET responses are cached; cross-origin and non-GET requests are never intercepted; CSP gained `manifest-src 'self'` and `worker-src 'self'`; no external hosts in the shell (test); no secrets.
- Observability impact: diag gained a `pwa` kind (short codes `SW_REGISTER_FAILED`, `SW_INSECURE_CONTEXT`); the player sees a notice when an update is ready.
- Residual risk: a bad cached build is only replaced after the next launch; clearing site data removes the saved watch; cache name changes only when the file list or HTML changes (asset content is covered by hashed file names).
- Rollback: revert this branch's commits (removes manifest, icons, worker plugin, registration; base returns to "/"); installed copies keep their cached build until the user removes the app or clears site data.
- Next safe action: user review; then decide on Electron or Tauri wrappers (new dependencies need approval) and real-device testing.
