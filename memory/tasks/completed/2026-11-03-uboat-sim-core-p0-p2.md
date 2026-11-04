---
schema_version: 1
id: task-2026-11-03-uboat-sim-core-p0-p2
status: completed
owner: claude
goal_confirmed_at: 2026-11-03T18:03:55.8327299Z
started_at: 2026-11-03T18:03:55.8327299Z
updated_at: 2026-11-03T18:10:42.6515938Z
base_commit: f2f582ccf1d91bd42016cb6e9d89abf9c806f1b6
owned_paths:
  - packages/sim-core
  - docs/architecture.md
plan: null
handoff: null
---

# Task: uboat-sim-core-p0-p2

## User-confirmed goal

- Confirmation reference: User approval in chat: build game from repo template, P0-P2 first
- Outcome and acceptance criteria: Headless deterministic TypeScript sim core (rng, Enigma M4, morse channel, message generator, auth, Intel ladder, HF/DF) with passing tests; no UI.
- In scope / out of scope: In scope: packages/sim-core P0-P2 (rng, enigma, morse, messages/forgeries, auth, intel, detection, event bus). Out of scope: boat FSM, sonar, UI, save/load, networking, repo rename/history clear.
- Material assumptions and risks: User later clarified the template may be restructured and UI/UX is built by Claude (UI deferred to P4+). Dev deps pinned: typescript 7.0.2, vitest 5.1.0, fast-check 4.10.2 (install with --ignore-scripts).

## Architecture linkage

Seeded RNG → Enigma/Morse/Message generators → auth + Intel + HF/DF detector → Event Bus (append-only log) → future presentation/network subscribers. No DB/network in this task; see docs/architecture.md.

## Progress and decisions

- Enigma verified against 2 independent historical vectors (AAAAA->BDZGO; U-264 message) before further work.
- Forgery invariant enforced by construction (>=1 tell always) and by property tests (5000 runs); verifier flags only injected tells and never flags genuine traffic (3000 runs).
- Core has no DOM/Node globals (manual UTF-8 in FNV-1a).

## Verification

- Command/check: `npx tsc --noEmit` and `npx vitest run` in packages/sim-core; `./scripts/check-repo.ps1`
- Result: `passed`
- Evidence/reason: tsc exit 0; vitest 5 files / 43 tests passed; check-repo exit 0.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: headless core only; exercised through tests (HF/DF 3h simulated chain FIX->ESCORT->DEPTH_CHARGE, noisy morse decode, challenge-reply ledger). Vertical-slice integration not yet built.
- Health/readiness/log/error inspection: no services/processes started; none required.
- Integration/dependency/config/migration check: npm install reported 0 vulnerabilities; balance.json typed via src/balance.ts.
- Remaining issue or reason not verified: Balance values (hazard, intel thresholds) are untuned placeholders; `not verified` for fun/tension (needs playtest). Cross-implementation Enigma check beyond the 2 vectors not done. Event-log MessagePack serialization deferred to P6.

## Security, observability, risk, and rollback

- Security impact: FNV-1a/mulberry32 are NOT cryptographic; fine for single-player, must be replaced by HMAC/HKDF server-side before multiplayer.
- Observability impact: EventBus keeps an append-only log (basis for replay); no logging/metrics yet.
- Residual risk: balance untuned; auth/Intel/detection not yet wired together by a campaign loop.
- Rollback: delete packages/sim-core (additive, no existing files modified).
- Next safe action: P3 boat FSM + sonar, then vertical slice wiring (one night watch).
