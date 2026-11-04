---
schema_version: 1
id: task-2026-11-04-p5-radio-room-presentation
status: in-progress
owner: claude
goal_confirmed_at: 2026-11-04T02:43:33.0000000Z
started_at: 2026-11-04T02:43:33.0000000Z
updated_at: 2026-11-04T02:43:33.0000000Z
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
- Not done in stage 2 by design: decode lamp readout and plaintext display (stage 4), responsive layouts (stage 5), diag/save v2 (stage 3).

## Verification

- Command/check:
- Result: `passed | failed | not verified`
- Evidence/reason:

## Runtime and codebase-health verification

- Runtime/user-flow exercise:
- Health/readiness/log/error inspection:
- Integration/dependency/config/migration check:
- Remaining issue or reason not verified:

## Security, observability, risk, and rollback

- Security impact:
- Observability impact:
- Residual risk:
- Rollback:
- Next safe action:
