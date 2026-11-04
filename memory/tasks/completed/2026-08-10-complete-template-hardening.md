---
schema_version: 1
id: task-2026-08-10-complete-template-hardening
status: completed
owner: Codex
goal_confirmed_at: 2026-08-10T00:00:00+07:00
started_at: 2026-08-10T00:00:00+07:00
updated_at: 2026-08-10T15:48:15.0991624Z
base_commit: c655539621aafc8587ad1570711059901d9d6ec9
owned_paths:
  - AGENTS.md
  - .github/
  - docs/
  - examples/
  - memory/
  - scripts/
  - tests/
plan: memory/plans/2026-08-10-complete-template-hardening.md
handoff: null
---

# Task: complete-template-hardening

## User-confirmed goal

Implement every P0/P1/P2 gap identified in the 2026-08-10 read-only audit, verify behavior beyond superficial green checks, commit the coherent result, and push it directly to `main`.

## Acceptance criteria

- Root agent policy includes complete engineering/security/observability/release rules without self-contradiction.
- Workflow governance validates a relevant, non-deleted, machine-readable task record and protects governance-sensitive changes.
- Task/plan/handoff automation and multi-agent ownership fields are present and validated.
- Version validation checks exact markers and declared derived targets, including runtime/container smoke evidence.
- FastAPI/container example uses pinned dependencies and controlled version access.
- GitHub Actions are immutable-SHA pinned and governance/version tests execute.
- Production skeleton covers contribution, security, ownership, architecture decisions, API/data/configuration, observability, threat model, incident/postmortem, release provenance/SBOM guidance, and deterministic line endings.
- Template-internal history is separated from the operational task directories inherited by new repositories.
- Applicable syntax, schema, unit, runtime, image/static, and repository-health checks are executed and recorded.

## Scope

- In: generic repository-template governance, automation, examples, tests, CI, docs, and GitHub publication.
- Out: deploying an application, changing repository visibility/plan, purchasing GitHub features, or publishing a supported release.

## Progress and decisions

- Goal was explicitly approved by the user after the complete audit findings were presented.
- Root version remains `v0.0.0.0` because this is still a development-only template and no supported release was requested.
- Merged complete engineering, frontend, API/data/distributed-systems, security, observability, release, coordination, bounded-persistence, and trusted-policy rules into root `AGENTS.md`.
- Added constrained YAML frontmatter schemas, ownership-conflict validation, task completion/handoff/bootstrap helpers, and a canonical repository health command.
- Self-review identified that closing a planned task could leave its plan linked to the former active path; `complete-task.ps1` now validates, closes, and relinks the associated plan atomically within the same scoped operation.
- Hardened PR/push governance, exact version marker/target validation, immutable Action/base-image pins, hashed Python lock, controlled version access, SBOM generation, and filesystem/image scanning.
- Added contribution/security/ownership/issue forms plus ADR/API/data/configuration/observability/threat-model/postmortem/release skeletons.
- Moved prior template-construction records into `examples/governance-history` so they are not interpreted as operational tasks.
- Verification found and fixed three non-superficial issues: regex marker corruption, Windows PowerShell `GetRelativePath` incompatibility, and container startup failure caused by a fixed parent-depth assumption. A hanging smoke harness was also bounded with explicit curl timeouts.

## Verification

- PowerShell AST parse: passed for 9 scripts.
- `scripts/check-repo.ps1`: passed exact version targets, schemas/links, ownership conflicts, required skeleton assets, immutable Action pins, and diff whitespace.
- `tests/version-tests.ps1`: passed valid metadata, marker mismatch rejection, malformed version rejection, sync idempotency, and published-version downgrade rejection.
- `tests/workflow-tests.ps1`: passed task creation, owned paths, handoff creation, completion status, active→completed move, and linked-plan closure/relink on Windows PowerShell.
- `tests/initialize-tests.ps1`: passed derived identity replacement, guarded template-history cleanup, and post-initialization version validation.
- Python `unittest`: 5 passed covering FastAPI version/access control, frontmatter parsing, ownership overlap, and repository-local Markdown links.
- `uv lock --check`, YAML parsing, JSON parsing, compile checks, secret-prefix scan, and `git diff --check`: passed.

## Runtime and codebase-health verification

- Docker image build: passed using digest-pinned Python base and hash-locked dependencies.
- OCI labels: version `v0.0.0.0` and revision value matched build inputs.
- Container startup: passed as non-root UID `65532`.
- Live HTTP: `/health` returned 200; unauthenticated `/version` returned 404; constant-time-token-authorized `/version` returned the canonical version.
- Cleanup: no smoke-test containers remain; Docker image remains local for reproducibility/cache only.
- GitHub Actions execution for the newly added workflows remains pending until the authorized push; it will be monitored before final completion.

## Risks and next handoff

- Private personal GitHub plan cannot provide effective server-side branch protection/rulesets; repository-local gates will document and detect the limitation but cannot replace server enforcement.
- High/Critical Trivy results, if any, must be resolved from the post-push workflow rather than waived silently.
- Next action: complete/archive this task, commit/push `main`, then monitor all workflows to terminal status.
