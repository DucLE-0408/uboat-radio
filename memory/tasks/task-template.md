---
schema_version: 1
id: {{TASK_ID}}
status: in-progress
owner: {{OWNER}}
goal_confirmed_at: {{GOAL_CONFIRMED_AT}}
started_at: {{STARTED_AT}}
updated_at: {{UPDATED_AT}}
base_commit: {{BASE_COMMIT}}
owned_paths:
{{OWNED_PATHS}}
plan: {{PLAN_PATH}}
handoff: null
---

# Task: {{TASK_NAME}}

## User-confirmed goal

- Confirmation reference: {{CONFIRMATION_REFERENCE}}
- Outcome and acceptance criteria: {{GOAL}}
- In scope / out of scope:
- Material assumptions and risks:

## Architecture linkage

Client/input → API/handler → service → DB/cache/queue/external dependency → logs/metrics/traces.

## Progress and decisions

## Verification

- Command/check:
- Result: `passed | failed | not verified`
- Evidence/reason:

## Runtime and codebase-health verification

- Runtime/user-flow exercise:
- Health/readiness/log/error inspection:
- Integration/dependency/config/migration check:
- Remaining issue or reason not verified:

## Security, observability, risk, and rollback

- Security impact:
- Observability impact:
- Residual risk:
- Rollback:
- Next safe action:
