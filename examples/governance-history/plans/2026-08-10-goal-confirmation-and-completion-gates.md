# Plan: goal-confirmation-and-completion-gates

## Scope

- In: mandatory user goal confirmation, persistent execution semantics, runtime/codebase-health completion gate, task template, workflow guide, and PR evidence checklist.
- Out: GitHub Actions runtime changes, external release, template version promotion, and application-specific health checks.
- Acceptance criterion: agents cannot start implementation before explicit goal confirmation and cannot claim completion based on tests alone without relevant runtime and post-change codebase-health evidence.

## Topology and blast radius

`AGENTS.md` provides binding behavior → `docs/agent-workflow.md` explains record flow → `memory/tasks/task-template.md` captures evidence → PR template makes review visible.

## Steps

1. Add an explicit goal-confirmation preflight gate with concise user-facing confirmation and private internal reasoning boundary.
2. Require persistent execution until achieved or genuinely blocked, with evidence rather than premature status claims.
3. Expand closure to require highest-practical-layer runtime/user-flow verification and post-change codebase health assessment.
4. Extend task/PR evidence fields and run documentation/diff checks.

## Security and reliability controls

- Do not require agents to disclose chain-of-thought; only objective, criteria, scope, assumptions, and risks are communicated.
- Do not permit a green unit test to mask broken startup, integration, configuration, dependency, migration, or user-flow behavior.

## Verification

- Validate required gate language in `AGENTS.md`, workflow guide, task template, and PR template.
- Run `git diff --check` and inspect the final diff.

## Rollback

Revert the logical change. No runtime data, external system, release artifact, or secret is modified.
