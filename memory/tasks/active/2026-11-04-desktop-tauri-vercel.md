---
schema_version: 1
id: task-2026-11-04-desktop-tauri-vercel
status: in-progress
owner: claude
goal_confirmed_at: 2026-11-04T04:50:00.0000000Z
started_at: 2026-11-04T04:50:00.0000000Z
updated_at: 2026-11-04T04:50:00.0000000Z
base_commit: 2c75f4440b5693123aec910a9399d23f264a8ce0
owned_paths:
  - packages/desktop
  - packages/radio-ui/vite.config.ts
  - packages/radio-ui/src/main.ts
  - vercel.json
  - .gitignore
  - packages/radio-ui/README.md
  - .github/workflows/desktop-windows.yml
  - docs/architecture.md
  - memory/tasks/active/2026-11-04-desktop-tauri-vercel.md
plan: null
handoff: null
---

# Task: desktop-tauri-vercel

## User-confirmed goal

- Confirmation reference: user: "lam file .exe bang Tauri di trien khai len vercel di" then "xac nhan, bat dau lam" after the goal confirmation message
- Outcome and acceptance criteria: (1) Windows installer (.exe, NSIS) of the radio room built with Tauri 2 by a GitHub Actions job on windows-latest and uploaded as an artifact, offline, wrapping packages/radio-ui/dist; (2) the web/PWA build deployed to Vercel as a preview with security headers and no-cache sw.js; CI stays green; no sim-core change.
- In scope / out of scope: In scope: packages/desktop (Tauri project, tight CSP, no shell/fs plugins, no remote URLs), Windows build workflow, vercel.json, docs, one PR. Out of scope: code signing, macOS/Linux bundles, auto-update, versioning/release/tag, custom domain, production Vercel promotion without user approval, secrets/env vars.
- Material assumptions and risks: Linux sandbox cannot build or run a Windows exe (not verified locally; CI build only); new dependencies approved by the user: @tauri-apps/cli 2.12.4 (npm), tauri 2.12.5 and tauri-build 2.7.4 (crates), MIT/Apache-2.0; NSIS toolchain is downloaded by the Tauri bundler at build time; unsigned exe triggers SmartScreen; Vercel deploy is an external publication limited to a preview.

## Architecture linkage

Player -> Tauri window (WebView2) -> radio-ui static bundle (custom protocol, no network) -> localStorage; Browser -> Vercel static host -> same bundle + service worker.

## Progress and decisions

- Added packages/desktop (Tauri 2.12.5 / tauri-build 2.7.4 / CLI 2.12.4, exact pins, lockfiles), per-user NSIS target, embedded WebView2 bootstrapper, CSP limited to self, no plugins/capabilities; icons generated from the PWA icon (placeholders).
- radio-ui: `--mode tauri` build omits the service worker plugin and registration. Found and fixed an existing bug from PR 11: a duplicate registerServiceWorker call sat inside the frame() loop and ran every animation frame; removed.
- Workflow desktop-windows.yml (windows-latest, lockfile installs, typecheck+tests, tauri build --locked, SHA-256, artifact 14 days). Actions pinned by SHA.
- vercel.json at repo root (build radio-ui, output dist, security headers, no-cache sw.js). Vercel: project uboat-radio created in the user's team after the user granted the GitHub App access; deployment dpl_ARNpEYziFdox4Deph3fZ42iMbQAw (commit c3a741c, Node 22.x) READY, but with target production because the project was not git-linked at creation; Vercel Authentication stays ON. Headers on / and /sw.js were checked against the live response.

## Verification

- Command/check: `npx tsc --noEmit`, `npm test` (radio-ui); `npx vite build` and `--mode tauri` (sw.js present / absent)
- Result: `passed`
- Evidence/reason: tsc clean; 108/108 tests; default build emits sw.js, tauri mode does not.
- Command/check: `cargo check`, `npx tauri build --no-bundle` on Linux
- Result: `passed`
- Evidence/reason: config and CSP accepted by tauri-build/generate_context; 3.4 MB release binary.
- Command/check: release binary under Xvfb + screenshot
- Result: `passed`
- Evidence/reason: window opened, full radio room rendered from the embedded bundle (WebKitGTK, not WebView2).
- Command/check: `python3 -I scripts/validate_repo.py`
- Result: `passed`
- Evidence/reason: governance validation passed with the active task.
- Command/check: Windows NSIS build (CI) ; launch of the installed exe on Windows; Vercel deployment content and headers; Trivy on the new lockfiles
- Result: `passed` for the CI build (installer job green, 3.1 MB artifact), Trivy (filesystem-and-sbom green) and the Vercel / and /sw.js response headers; `not verified` for launching the exe on real Windows and for PWA install from the Vercel URL
- Evidence/reason: Actions run 41778531551; Vercel deployment READY with CSP, nosniff, X-Frame-Options, Referrer-Policy, COOP, Permissions-Policy, HSTS and no-cache sw.js observed.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Linux Xvfb run of the release binary (see above); Windows run not verified.
- Health/readiness/log/error inspection: app log only had libEGL/DRI3 warnings from Xvfb; no errors.
- Integration/dependency/config/migration check: new deps limited to packages/desktop (MIT/Apache-2.0); radio-ui and sim-core dependencies unchanged; sim-core untouched.
- Remaining issue or reason not verified: Windows build/launch, SmartScreen, Vercel preview, Trivy result on Cargo.lock.

## Security, observability, risk, and rollback

- Security impact: no IPC/plugins/capabilities, CSP self-only, exact pins, unsigned installer, hash published with artifact; Vercel headers added.
- Observability impact: none new; ?diag=1 unchanged; CI artifact + checksum.
- Residual risk: unsigned exe, placeholder icons, CI downloads the NSIS toolchain at build time, Windows launch unproven until CI.
- Rollback: revert the PR (removes packages/desktop, workflow, vercel.json; the duplicate-registration fix is independent and safe to keep); delete the Vercel project.
- Next safe action: user authorizes commit/push + draft PR; CI builds the installer; then Vercel preview.
