# Session handoffs

Create with `scripts/new-handoff.ps1`, then fill current objective/status, base/current commit, worktree/owned paths/files, commands/results, active processes/ports/external state, blockers/failed approaches, and next exact safe action.

The receiving agent reads the task/plan/handoff and repeats preflight when evidence is stale, ambiguous, or failed. Supersede prior handoffs explicitly; never rewrite history to hide a failed path.
