# Agent workflow guide

`memory/` is the shared operational ledger. Records use constrained YAML frontmatter so agents, reviewers, and CI can validate ownership/status without parsing chat history.

## Lifecycle

```text
Request → private analysis → explicit goal confirmation
        → active task + owned paths → recon → plan when required
        → implementation → static/test/runtime/codebase-health verification
        → completed task
          ├→ blocked with evidence and next decision
          └→ handoff → receiving agent repeats preflight
```

## Record contracts

| Record | Location/schema | Required use |
|---|---|---|
| Task | `memory/tasks/`, `task.schema.json` | Every repository mutation |
| Plan | `memory/plans/`, `plan.schema.json` | Multi-file/layer, API/data/security/network/migration/deploy |
| Handoff | `memory/session-handoffs/`, `handoff.schema.json` | Every cross-agent/session transfer |
| Coordination | Active task `owned_paths` | Prevent overlapping concurrent edits |
| Diagnostic evidence | `memory/logs/` | Sanitized facts only; raw logs remain ignored |

## Mandatory gates

1. Confirm exact outcome, acceptance criteria, scope, and material risk with the user.
2. Create an active task, record base commit/owner/owned paths, and check for overlap.
3. Create a plan before any boundary-sensitive change.
4. Implement the smallest coherent solution; update records after decisions/failures.
5. After three materially identical failures, change hypothesis/instrumentation or escalate—never retry forever.
6. Verify static, unit/integration, runtime/user flow, health/log/error, dependency/config/migration, and touched codebase health at the highest practical layer.
7. Record `passed`, `failed`, or `not verified`; a green suite alone is not completion.
8. Complete or hand off with rollback and next exact action. Never label a blocked/partial/proposed change done.

## CI behavior

- Every PR/push changes a non-deleted task record; PR body links the changed path.
- A verified Dependabot-only dependency update has a narrowly scoped exception.
- CI validates record schemas/links, active path conflicts, exact version targets, Action pins, runtime example behavior, container labels/access control, SBOM generation, and security scans.
- On the current private personal GitHub plan, checks report direct-push failures after mutation; server-side prevention requires GitHub Pro/organization rulesets.

## Memory safety

Never store prompts, chain-of-thought, credentials, `.env` values, authorization headers, raw production logs, personal/customer data, or private keys. Keep only sanitized evidence required to repeat, audit, or safely continue work.
