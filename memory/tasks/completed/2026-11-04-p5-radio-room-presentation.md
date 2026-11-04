---
schema_version: 1
id: task-2026-11-04-p5-radio-room-presentation
status: completed
owner: claude
goal_confirmed_at: 2026-11-04T02:43:33.0000000Z
started_at: 2026-11-04T02:43:33.0000000Z
updated_at: 2026-11-04T03:47:05.0000000Z
base_commit: fde3170e50a4c8316e175c3c6d58ba234201c42f
owned_paths:
  - packages/radio-ui
  - docs/specs/p5-radio-room-presentation
  - docs/specs/p4-radio-ui
  - docs/architecture.md
plan: null
handoff: null
---

# Task: p5-radio-room-presentation

## User-confirmed goal

- Confirmation reference: user: answers 1-7 to the P5 scope proposal (scope as proposed; local commits allowed; placeholder art by assistant; verify fonts; no VERSION bump; classic UI fallback then remove; CodeGraph init requested)
- Outcome and acceptance criteria: P5 pixel-art presentation of the radio room per the user reference screenshot; stage 1 = three spec files for review; later stages per docs/specs/p5-radio-room-presentation/tasks.md; gameplay and sim-core unchanged
- In scope / out of scope: In scope: P5 spec (3 files), presentation layer in packages/radio-ui, placeholder pixel assets + manifest, tests, docs. Out of scope: packages/sim-core changes, new runtime dependencies, VERSION bump, push/tag/publish without authorization, final commissioned art.
- Material assumptions and risks: branch p5-radio-room-presentation stacked on PR #8 (unmerged); local commits allowed, no push until authorized; art is assistant-made placeholder and visual completion is not claimed; CodeGraph install was blocked by the permission classifier so structural queries fall back to text search; Supply-chain CI (Trivy setup) is red on main independent of this work.

## Architecture linkage

Client/input → API/handler → service → DB/cache/queue/external dependency → logs/metrics/traces.

## Progress and decisions

- Recon: PR #8 open draft (head fde3170), VERSION v0.0.0.0, no tags or releases, vite 8.3.5 MIT / typescript 7.0.2 Apache-2.0 / vitest 5.1.0 MIT (needs Node >= 22.12).
- Fonts verified from registry tarballs (not dependencies): @fontsource/silkscreen 5.3.0 and @fontsource/vt323 5.3.0, OFL-1.1; sha256 silkscreen-latin-400 e6c72ea4702249202bcdd79d3343057e4e25ef1f04e3fcffd8602ab53b40b4cc, vt323-latin-400 8ddbebcc1048154132e1d78eb9b1f7850bca1b7d857035ccf1cb4318ebc615b6.
- Stage 1 done and approved by the user.
- Stage 2 done (pending user review): assets (17 TEMPORARY sprites via tools/art/generate.ts, 2 OFL fonts, manifest + test), scene shell with integer --px scale, banner/portrait/gauges/telegram/command dock/SECRET paper/cipher machine with working keyboard (mouse/touch + event.code), input/modes.ts, classic UI split into classic.ts. The scene is opt-in via ?ui=p5 until stage 5 flips the default.
- Findings: classic CSS leaked into scene classes (.banner, .lamp, .grp, .tell) -> renamed to s* classes; Node strip-types needs explicit .ts import extensions and no parameter properties; `border` shorthand resets border-image.
- Stage 3 done: loop stats + diag.ts (?diag=1), save v2 (untilTick, bounded) with v1 migration, separate validated transcript persistence (debounced, pagehide flush), silent rebuild (finishReplay), AUTH_RESULT correlation tests, refusal feedback lists observed facts only, scene toast. Verified in Chromium: refusal toast, reload restores copy, legacy v1 migrates to v2, corrupt/hostile storage ignored without crash, classic regression playthrough (mode B, emergency + reload) clean.
- Stage 4 done: scene gameplay complete behind ?ui=p5: inbox + receiver HUD (tone lamp, waveform, replay, attempt, visual Morse, sound prompt), decode lamp reveal + COPY/PLAIN paper, auth drawer with inert background + focus restore, alert plates (HF/DF, escort, depth charges), pause label, SubscriptionScope for cleanup, audio silenced on pause/end/unmount. Browser findings: Alt+L bug (lookup mutated in place) fixed; `display:flex` overrode `hidden` so alert plates were always visible (earlier evidence discarded, rule added, re-verified: 0 plates at start; HF/DF and escort plates appear after heavy transmitting on seed 7). Not verified in browser: depth-charge plate (store unit-tested only), audible sound, emergency layout (stage 5).
- Stage 6 done: docs/architecture.md P5 section, ADR-0001, final full-watch run on the P5 default, task closed.
- Stage 5 done: layered boat cutaway (mode sinks the boat behind a water layer, screw speed, damage and alarm overlays, flicker), 6-frame operator (idle, blink, listening, writing, alert, hurt) with decorRng (own cosmetic seed), sonar + event-log + auth drawers (modal on desktop/tablet, tabs on mobile), BRIDGE ALERT panel (inert stations, alarm lighting, Esc), P5 summary, layout modes desktop/tablet/mobile with flow CSS and touch targets >= 44px, P5 default with ?ui=classic fallback. Browser-verified: 8 viewports 320-1920 (no horizontal scroll, 0 buttons < 44px on touch layouts), mobile touch-only play (type, decode, challenge, pickers, check, tabs, pause), tablet drawers, emergency (key D dives), sonar drawer + hydrophone listen, summary. Bugs found and fixed: desktop-size scene made mobile browsers widen the layout viewport (layout now decided on the empty scene), long nowrap labels forced 382px min width, CSS reset specificity broke portrait/drawer positioning (:where), position:absolute buttons in pickers, body height pinned to 100% blocked page scroll, `hidden` overridden by display rules. Known: a dismissed alert reappears after reload while its 25 s window is still open; sonar/escort/depth-charge visuals unverified for depth charge; audio unheard.
- Not done in stage 2 by design: decode lamp readout and plaintext display (stage 4), responsive layouts (stage 5), diag/save v2 (stage 3).

## Verification

- Command/check: `cd packages/radio-ui && npx tsc --noEmit`; `cd packages/sim-core && npx tsc --noEmit`
- Result: `passed`
- Evidence/reason: both exit 0 (TypeScript 7.0.2, strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes).
- Command/check: `npx vitest run` in packages/radio-ui and packages/sim-core
- Result: `passed`
- Evidence/reason: radio-ui 100/100 in 15 files (loop, diag, session v2 and migration, transcripts, store, auth correlation, silent rebuild, controller with a real Watch, keymap, modes, refusal, audio plan, reveal, pose/decor/layout, assets manifest, scale, static invariants); sim-core 70/70.
- Command/check: `npx vite build` in packages/radio-ui
- Result: `passed`
- Evidence/reason: bundle builds; only vite 8.3.5 added as dependency (typescript 7.0.2 and vitest 5.1.0 already pinned).
- Command/check: `grep -rn truthOf packages/radio-ui/src packages/radio-ui/index.html`; `git diff --stat 3dc0081..HEAD -- packages/sim-core`
- Result: `passed`
- Evidence/reason: no matches (exit 1); no sim-core changes in the P5 commits.
- Command/check: `python3 -I scripts/validate_repo.py`
- Result: `passed`
- Evidence/reason: repository governance validation passed. `scripts/check-repo.ps1` itself was not run (no PowerShell in the cloud): not verified.
- Command/check: audio heard by a person; visual match with the reference image; tension/fun; Firefox/Safari; real touch devices; Alt+key shortcuts on Mac/Edge; depth-charge alert plate in a browser
- Result: `not verified`
- Evidence/reason: no human listener or player in this session; headless Chromium only; the depth-charge plate is unit-tested in the reducer but no browser run reached it.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: Chromium full 30-minute watch on the P5 default (seed 42, speed 40): receive, Morse tone lamp activity after the first gesture, copy by keyboard, decode with lamp reveal and PLAIN view, repeat requests, challenge, auth drawer lookup (focus trapped, background inert, focus restored), check (AUTH OK), pause/resume, reload restore (inbox, copy), refused orders while silent and while diving, sonar drawer and hydrophone Listen, reject of the forged order, summary (2 of 2 correct). Second run accepted the forged order: ASDIC, BRIDGE ALERT panel, boat alarm lighting, portrait alert frame, key D dive, dismiss. Mobile 390x844 touch-only run (tabs, tap keys, decode, pickers, check, sonar/log tabs, pause). Tablet 1024x768 drawers. Eight viewports 320-1920: no horizontal scroll, no touch-layout button under 44 px.
- Health/readiness/log/error inspection: console had 0 errors or warnings in every run; `?diag=1` after the full watch: tick 1800, frame p50/p95/max 16.7/16.7/16.8 ms (headless), 0 catch-up clamps, no asset, audio or save error codes. Corrupt and hostile localStorage (bad save, HTML in transcript) ignored without crash or injection.
- Integration/dependency/config/migration check: no new dependency; v1 to v2 save migration tested in unit and browser; `?ui=classic` still mounts without errors; sim-core untouched; ADR-0001 records the path alias.
- Remaining issue or reason not verified: see the `not verified` check above. Known limits: sprites are TEMPORARY placeholders (visual completion not claimed); a dismissed alert reappears after reload while its 25 s window is open; the fixed mobile tab bar covers the last keyboard row until the page is scrolled; Morse noise often forces several repeat requests and forged traffic usually shows NO MATCH (sim balance, unchanged); no CI workflow runs the radio-ui tests (Node >= 22.12 needed).

## Security, observability, risk, and rollback

- Security impact: saved data and URL parameters validated and bounded; player text only through textContent; no innerHTML/eval (static test); CSP meta; dev servers bind 127.0.0.1; fonts and sprites local; no external requests; the UI never reads ground truth, Intel, hazard or true range.
- Observability impact: client-side `diag.ts` only (memory, short codes and timings, no message or transcript text, no network).
- Residual risk: placeholder art quality and legibility of dense panels need a human review; audio untested by ear; Alt-key collisions on some OS/browsers; the Supply-chain workflow (Trivy setup) is red on main independent of this work.
- Rollback: see docs/architecture.md (P5 section): remove scene/assets/tools and the two storage keys, switch the default back to mountClassic or use ?ui=classic; sim-core and command format unchanged.
- Next safe action: user review of stages 2-5 screenshots and the final report; authorise push and a pull request if wanted; then replace TEMPORARY assets.
