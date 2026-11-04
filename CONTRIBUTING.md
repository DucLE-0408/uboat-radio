# Contributing

All repository mutations follow root [AGENTS.md](AGENTS.md), including human-authored changes.

1. Confirm the goal and create an active task with `scripts/new-task.ps1`.
2. Claim owned paths and add a plan when the task crosses API/data/security/network/deployment boundaries.
3. Make one coherent change without unrelated formatting/refactors.
4. Run `scripts/check-repo.ps1` plus project-specific lint/type/build/test/runtime checks.
5. Update and complete the task record; link it in the pull request.
6. Include security, observability, compatibility, rollout, and rollback effects.

Do not include secrets, raw production logs, customer data, generated credentials, or unapproved dependency changes. Direct pushes are discouraged; the current private personal GitHub plan may not enforce branch protection, so reviewer discipline remains necessary until server-side rulesets are available.
