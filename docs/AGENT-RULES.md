# Agent governance reference

The executable repository contract is [root `AGENTS.md`](../AGENTS.md). It is deliberately placed at repository root so coding agents discover it before implementation.

Project-specific extensions may strengthen these rules, but may not:

- create a second version source of truth;
- waive task/plan/handoff records for implementation work;
- weaken approval gates for destructive, production, secret, data-migration, or third-party outbound actions;
- treat skipped verification as a passing result.

Use [the detailed workflow guide](agent-workflow.md) for the required record lifecycle.
