---
schema_version: 1
id: task-2026-11-04-fill-window-scale
status: in-progress
owner: claude
goal_confirmed_at: 2026-11-04T10:10:00.0000000Z
started_at: 2026-11-04T10:10:00.0000000Z
updated_at: 2026-11-04T10:10:00.0000000Z
base_commit: 5f7069eaa610342064b77b94bd681134497234f1
owned_paths:
  - packages/radio-ui/src/scene/px.ts
  - packages/radio-ui/test/px.test.ts
  - memory/tasks/active/2026-11-04-fill-window-scale.md
plan: null
handoff: null
---

# Task: fill-window-scale

## User-confirmed goal

- Confirmation reference: user: "game luon full screen nen can chinh lai ... man hinh game hien tai qua nho can duoc mo rong ra", after the goal confirmation with the measurement table, user: "1920x1080 (toan man hinh) 100% phai nhu nay nha"
- Outcome and acceptance criteria: the fixed 640x360 frame (desk UI and P5 room share computeScale) fills the window. Scale = exact fit (fractional, rounded down to 0.01) instead of an integer; 1920x1080 stays 100%; the scene is centred and the margin is painted with the scene slate; no scroll; layout thresholds unchanged; the menu panel is larger on big screens.
- In scope / out of scope: In scope: computeScale, fillWindow + CSS for the fixed-frame layouts, desk and scene mounting hooks, menuScale cap, tests. Out of scope: art or layout changes, Tauri window maximising, non-uniform stretching, game logic.
- Material assumptions and risks: at a window whose aspect is not 16:9 a uniform scale cannot fill 100% of the area (1920x960 gives 88%, 1440x900 gives 90%); the rest is slate margin. Fractional scales make some pixels 1 device pixel wider than others (image-rendering: pixelated); no seams were seen in screenshots. Not verified on Windows/WebView2 or with a 125-150% display scale.

## Architecture linkage

Window size -> computeScale -> --px on :root -> every sprite and text size (calc(var(--px) * n px)); fillWindow() toggles .fill-window on #app and html so the frame is centred in a viewport-sized flex box (overflow hidden), only for the desktop fixed-frame layout.

## Progress and decisions

- Measured before changing (production build, Chromium): scene area 100% at 1920x1080, 2560x1440 and 3840x2160 but 50% at 1920x960 (maximised window), 64% at 1600x900, 71% at 1440x900, 88% at 1366x768.
- The key-hint strip of the P5 scene shared the flex row and pushed the scene off-screen (found in the first run); it is now screen-reader-only in the filled window.
- Coordination: this task claims only px.ts and its test; src/scene/index.ts, src/desk/index.ts, src/menu/menu.ts and scene.css are small edits in files that other tasks or sessions (desk UI, art pass PR 16) may also touch and are not claimed to avoid overlap errors.

## Verification

- Command/check: npx tsc --noEmit; npx vitest run; npm run build (radio-ui)
- Result: `passed`
- Evidence/reason: tsc clean; 22 files, 152 tests (px.test.ts rewritten for fractional scale: exact values, never overflows, >= 99% of the limiting axis, layout thresholds).
- Command/check: Chromium on the production build, desk and P5, at 1920x1080, 1920x960, 1600x900, 1440x900, 1366x768, 2560x1440, 3840x2160, 1280x720
- Result: `passed`
- Evidence/reason: scene area 100% at 1080p, 1600x900, 1366x768 (1363x767), 2560x1440, 3840x2160, 1280x720; 88% at 1920x960 and 90% at 1440x900 (16:10, limited by aspect); no scroll in any case; console clean; screenshots at 1920x960 and 1600x900 reviewed (crisp, no seams).
- Command/check: Windows/WebView2 and a 125-150% display scale; Firefox/Safari
- Result: `not verified`
- Evidence/reason: Linux sandbox, Chromium only.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: the scripted resize matrix above.
- Health/readiness/log/error inspection: clean console.
- Integration/dependency/config/migration check: no dependency, no save or sim change.
- Remaining issue or reason not verified: see the not-verified item; aspect-limited sizes keep a slate margin.

## Security, observability, risk, and rollback

- Security impact: none (CSS and a scale function).
- Observability impact: none.
- Residual risk: uneven pixel widths at fractional scales; aspect-limited margins.
- Rollback: revert the PR (integer scale returns).
- Next safe action: user checks the installed app on the real screen; optionally add a stretch-to-fill mode or a maximised start window.
