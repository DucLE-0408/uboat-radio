# Plan: enforce-agent-workflow

## Scope

- In: root agent contract, task/plan/handoff lifecycle guide, task helper, PR template, and CI task-record gate.
- Out: application-specific build/test commands, runtime behavior, release publication, and external deployment.
- Acceptance criterion: a coding agent discovers a mandatory workflow before implementation, and PR validation rejects engineering changes without a task record.

## Topology and blast radius

`AGENTS.md` governs agents → `memory/` preserves durable context → `scripts/new-task.ps1` reduces workflow friction → PR template and GitHub Action provide reviewer/CI enforcement.

## Steps

1. Replace the minimal root agent note with mandatory, self-checkable gates.
2. Add a human-readable workflow guide and create-task helper.
3. Require task/plan/handoff links in the PR template.
4. Add CI validation for a task record when engineering files change.
5. Parse scripts, validate version metadata, review the diff, then record evidence in the task.

## Security and reliability controls

- Memory records forbid secrets, raw logs, PII, prompt content, and chain-of-thought.
- CI reads only pull-request filenames; it does not expose repository contents or credentials.
- GitHub Actions use read-only repository and pull-request permissions.

## Verification

- PowerShell parser accepts the helper and version scripts.
- Version metadata validation passes.
- `git diff --check` reports no whitespace defects.

## Rollback

Revert this logical commit; no data migration, external service, or release artifact is affected.
