---
schema_version: 1
id: task-2026-11-04-fix-forgery-callsign-collision
status: completed
owner: claude-side-session
goal_confirmed_at: 2026-11-04T15:31:20.4296976Z
started_at: 2026-11-04T15:31:20.4296976Z
updated_at: 2026-11-04T15:34:25.8686941Z
base_commit: e6cc10784196b7e0d7b696b90b4ec11ca7e922ed
owned_paths:
  - packages/sim-core/src/messages.ts
  - packages/sim-core/test/messages.test.ts
plan: null
handoff: null
---

# Task: fix-forgery-callsign-collision

## User-confirmed goal

- Confirmation reference: Delegated task brief from parent session local_eb213d53 (operator request: capture counterexample, fix generator, add regression test, open PR)
- Outcome and acceptance criteria: Forgery generator never reuses a genuine callsign, so the forgery tell invariant property test passes deterministically.
- In scope: `generateForgery` Intel-1 callsign choice in `packages/sim-core/src/messages.ts`; regression test in `test/messages.test.ts`. Out of scope: desk UI, balance, RNG streams.
- Material assumptions and risks: Parent-session brief taken as operator confirmation. Replay impact: only Intel-1 forgeries whose drawn `U?Q` callsign (or the old `UZQ` fallback) collided with a genuine station change output; all other draws are byte-identical (no extra RNG consumption).

## Architecture linkage

Client/input → API/handler → service → DB/cache/queue/external dependency → logs/metrics/traces.

## Progress and decisions

**Root cause.** Property "every forgery carries >=1 tell" asserts (a) tells>=1, (b) verifier sees >=1, (c) every verifier-seen tell is in `truth.tells`. Failures are (c), not (b). At Intel 1 `generateForgery` swaps `from` for `U?Q` and, on collision with a genuine callsign, falls back to the fixed `"UZQ"` without re-checking. `makeCallsigns` draws `U??` uniformly, so the genuine roster contains `UZQ` (or the random `U?Q`) with probability of a few percent per seed. Then `from` is a real station whose known fist differs from the claimed sender's imitated fist, so `verifyTells` reports an un-injected `fist` tell: truth.tells lacks `fist`, the invariant check at test line 40 fails. The generator, not the test inputs, is wrong: a "callsign" forgery must use an unknown callsign (the callsign flaw is meant to be unknown-station).
**Counterexamples (deterministic scan, 601,200 combos).** seed=261327 k=0 level=1 id=36 (roster KDK,UDE,UCS,UDV,UZQ,UZT); seed=1306635 k=0..2 level=1 id=3; seed=2161887 k=0 level=1 id=6. Seen `[fist,grid,timestamp]` vs injected `[bearing,grid,timestamp]`.
**Fix.** On collision, step through the alphabet (`U?Q`) until a callsign absent from the roster (bounded 26). Regression test with the counterexamples plus a 5000-run property on Intel 1.

## Verification

- Command/check: `npx vitest run` in packages/sim-core x20 sequential runs; `npx tsc --noEmit`; new regression test run against pre-fix generator; `scripts/check-repo.ps1`.
- Result: passed
- Evidence/reason: 20/20 runs "71 passed (71)" (includes replay/determinism suites); tsc clean; regression test failed before the fix and passes after; check-repo passed.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: deterministic scan of 601,200 (seed,id,kind,level) combos found the counterexamples; fixed generator passes the 5000-run property tests.
- Health/readiness/log/error inspection: n/a (pure library); typecheck clean.
- Integration/dependency/config/migration check: no dependency, balance or RNG-stream change; saves/replays only differ for Intel-1 forgeries whose callsign previously collided with a genuine station.
- Remaining issue or reason not verified: full-scan rerun of the whole combo space after the fix not repeated beyond the property tests.

## Security, observability, risk, and rollback

- Security impact: none.
- Observability impact: none.
- Residual risk: replays recorded with a colliding Intel-1 forgery now yield a different forged callsign (previously a spurious fist tell).
- Rollback: revert the commit.
- Next safe action: review and merge the PR.
