---
schema_version: 1
id: plan-2026-08-10-complete-template-hardening
task: memory/tasks/completed/2026-08-10-complete-template-hardening.md
status: completed
owner: Codex
base_commit: c655539621aafc8587ad1570711059901d9d6ec9
---

# Plan: complete-template-hardening

## Topology and blast radius

Agent request → root policy → machine-readable task/plan/handoff → local repository validator → pull-request governance → version/build/runtime checks → reviewer/release evidence.

The change affects repository consumers created from the template, GitHub Actions, PowerShell/Python automation, FastAPI example behavior, container metadata, and governance documentation. It does not modify a production runtime or external data store.

## Ordered implementation

1. Merge complete global engineering controls into root `AGENTS.md`; resolve trusted-policy and persistence/retry semantics.
2. Introduce record schemas, coordination ownership, task completion/handoff helpers, and a single repository-health check.
3. Replace filename-only workflow enforcement with task-record content/link validation and governance-sensitive path handling.
4. Harden exact version propagation/validation, add tests, pin Actions/dependencies, and secure the FastAPI/container reference.
5. Add missing contribution/security/architecture/API/data/configuration/observability/release skeletons and deterministic Git attributes.
6. Move template-building history into examples so new repositories begin with clean active/completed operational directories.
7. Run syntax, YAML/schema, version mutation tests, FastAPI runtime smoke, container/static checks, security scans available locally, and diff/repository-health review.
8. Update the task evidence, commit one coherent change, push `main`, and verify remote synchronization plus Actions state.

## Security and reliability controls

- No secrets or production data are introduced.
- Outbound actions are limited to the explicitly authorized GitHub push.
- Runtime example denies detailed version access unless a constant-time token check succeeds.
- CI dependencies and Python packages use immutable pins.
- Direct-push enforcement limitation is documented truthfully when GitHub plan cannot enforce branch protection.

## Rollback

Revert the resulting commit on `main`. No migration or external service state requires rollback; GitHub repository settings remain unchanged.
