# Engineering memory

This folder preserves durable project context across sessions and agents. It is not a dumping ground for raw conversation or secrets.

- `tasks/`: a concise record of active and completed scoped work.
- `session-handoffs/`: current-state briefings for another agent/session.
- `logs/`: sanitized evidence needed to diagnose or audit decisions; raw logs are ignored.
- `plans/`: reviewed plans, ADR-like decisions, rollout/rollback plans, and verification checklists.
- `coordination/`: multi-agent ownership and overlap rules.
- `schemas/`: machine-readable frontmatter contracts validated by `scripts/check-repo.ps1`.

Use UTC or ISO 8601 timestamps in filenames: `YYYY-MM-DD-short-name.md`. Link records rather than duplicating their contents.
