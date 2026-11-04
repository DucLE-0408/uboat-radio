# Task: enforce-agent-workflow

- Status: `completed`
- Owner/agent: Codex
- Started: 2026-08-10T14:46:00Z
- Last updated: 2026-08-10T14:52:00Z
- Links: `memory/plans/2026-08-10-enforce-agent-workflow.md`

## Acceptance criterion

Agents cannot treat the repository memory structure as optional: implementation work must have a task record, plan-required work must have a plan, inter-session work must have a handoff, and PR validation must require a task record for engineering changes.

## Scope

- In: agent contract, workflow guide, task helper, PR template, and CI task-record enforcement.
- Out: external deployment, application source changes, version promotion, and CI runtime execution confirmation.

## Progress and decisions

- Replaced the minimal agent note with root-level mandatory workflow gates that agents discover before editing.
- Added a workflow guide defining durable records and what prevents bypass.
- Added `scripts/new-task.ps1` so task creation is a standard command rather than manual boilerplate.
- Added a read-only pull-request file-list check. Documentation, memory, GitHub metadata, README, root agent rules, and `.gitignore` are exempt; any other changed file requires a non-template task record.
- Published the workflow to `main` in commit `da75c45`.

## Verification

- Command/check: PowerShell AST parser for `scripts/version.ps1` and `scripts/new-task.ps1`.
- Result: passed; no parser errors.
- Command/check: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/version.ps1 validate`.
- Result: passed; `v0.0.0.0` correctly classified as development-only and metadata validation passed.
- Command/check: Python YAML load plus required job assertion for `.github/workflows/workflow-governance.yml`.
- Result: passed.
- Command/check: `git diff --check`.
- Result: passed; no whitespace errors.
- Not verified / reason: GitHub Actions execution is not available until a pushed pull request runs the workflow.

## Risks and next handoff

- Risk: repositories with unusual code generated only under exempt folders may need project-specific CI refinement.
- Next action: observe the first pull request that exercises the new workflow gate and refine project-specific exempt paths only when justified.
