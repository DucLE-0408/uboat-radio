## What changed

## Required workflow records

- User-confirmed goal/acceptance criterion: `<task record path and confirmation reference>`
- Active/completed task record: `memory/tasks/...`
- Plan, if required by `AGENTS.md`: `memory/plans/...` or `not required — <reason>`
- Handoff, if multiple agents/sessions: `memory/session-handoffs/...` or `not required — <reason>`

## Why

## System linkage

- [ ] Client/UI impact identified
- [ ] API contract and backend/service impact identified
- [ ] Data/cache/queue/external dependency impact identified
- [ ] Logs/metrics/traces and operational impact identified

## Verification

- [ ] Tests/build/lint/type-check run or gap explained
- [ ] `pwsh -File scripts/version.ps1 validate` run if version/release wiring changed
- [ ] Security review: authz, validation, secrets, network timeouts/retries, resource limits
- [ ] Task record updated with actual commands, results, and remaining verification gaps
- [ ] Runtime/user-flow and post-change codebase-health verification executed or explicitly marked not verified

## Rollback and risk

## Version change (if applicable)

- Canonical `VERSION`:
- Change class and rationale:
- Migration/compatibility notes:
