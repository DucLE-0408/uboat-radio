# Multi-agent coordination

Active task frontmatter is the coordination ledger. Every agent declares `owner`, `base_commit`, `owned_paths`, and `updated_at` before editing.

- Paths overlap when they are identical or one is a parent of another. `scripts/check-repo.ps1` fails on overlapping active claims.
- An agent must not take another agent's path silently. Coordinate, update ownership, and create a handoff first.
- `updated_at` is a heartbeat, not a lock expiry. Stale ownership requires human/agent confirmation before takeover.
- Record active background processes, ports, remote state, and current commit in handoffs.
- Git remains the source of truth for code; memory records describe intent and operational continuity.
