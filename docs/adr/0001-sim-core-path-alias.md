# ADR-0001: Resolve `@uboat/sim-core` through a path alias to its barrel

- Status: `accepted`
- Date: 2026-11-04
- Owners: radio-ui maintainers
- Supersedes / superseded by: none

## Context and constraints

`packages/sim-core` has no `exports`, `main` or build step, and the repository has no root workspace manifest. The radio UI must import the simulation only through its public barrel (`src/index.ts`) and must not change sim-core (balance, RNG, algorithms and the 1 s step are frozen). No new runtime or dev dependency is allowed.

## Decision

`packages/radio-ui` maps `@uboat/sim-core` to `../sim-core/src/index.ts` with `compilerOptions.paths` in `tsconfig.json` and `resolve.alias` in `vite.config.ts` (vitest reuses it). `test/invariants.test.ts` enforces that every import of the package is exactly `"@uboat/sim-core"` (no deep paths), that `truthOf`, Intel/hazard fields, contact ranges, `innerHTML` and `eval` never appear in UI sources.

## Alternatives considered

- Root npm workspaces plus `main`/`exports` in sim-core: cleaner for publishing, but edits sim-core's manifest and adds root tooling nobody asked for.
- `file:../sim-core` dependency: needs a build or `main`, same objection.
- Deep relative imports: breaks the barrel rule.

## Security, reliability, networking, and operational consequences

No new supply-chain surface. Type checking and bundling see sim-core sources directly, so a sim-core API change surfaces as a radio-ui compile error. Both packages stay independently type-checkable.

## Migration and rollback

If sim-core is later published or built, replace the alias with a normal dependency; imports do not change. Rollback: delete the alias entries.

## Verification and signals

`npx tsc --noEmit` in both packages, `npx vitest run` in both packages, the invariants test, and `git diff --stat -- packages/sim-core` staying empty.
