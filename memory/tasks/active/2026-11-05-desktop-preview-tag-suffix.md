---
schema_version: 1
id: task-2026-11-05-desktop-preview-tag-suffix
status: in-progress
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T04:35:00.0000000Z
started_at: 2026-11-05T04:35:00.0000000Z
updated_at: 2026-11-05T04:35:00.0000000Z
base_commit: 1ccab21583f0ee0ad6f000274d570b14608e7b67
owned_paths:
  - .github/workflows/desktop-windows.yml
  - memory/tasks/active/2026-11-05-desktop-preview-tag-suffix.md
plan: null
handoff: null
---

# Task: desktop-preview-tag-suffix

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "build trước 1 bản cài game hoàn chỉnh đi", then "tạo pre-release với bộ cài này" (explicit ask to publish a pre-release of the current installer)
- Outcome and acceptance criteria: a GitHub pre-release with the Windows installer and SHA256SUMS.txt for the current main (commit 1ccab21, with radar and the sonar work); the existing tags desktop-preview-20261104 and desktop-preview-20261105 are already published and must not be reused, so the release workflow must accept a suffixed tag (desktop-preview-YYYYMMDD-N) and refuse an existing tag
- In scope / out of scope: in = the tag pattern and an existing-tag check in the prerelease job of desktop-windows.yml, then one dispatch on main with tag desktop-preview-20261105-2; out = VERSION, signing, latest/stable marking, touching the two existing releases
- Material assumptions and risks: the installer is rebuilt by the tagged run from the same source commit as the earlier build-only run (not byte-identical, but the release uses the installer of its own run and verifies its checksum); unsigned and unverified on real Windows; a pre-release is public once created

## Architecture linkage

workflow_dispatch(main, release_tag) -> installer job (windows-latest) -> artifact -> prerelease job (ubuntu, contents: write): tag pattern check, existing-tag check, sha256 check, gh release create --prerelease on the same commit.

## Progress and decisions

- Decision: add an optional -N suffix rather than renaming to a future date, so tags stay honest about when they were built.
- Decision: refuse an existing tag in the workflow itself (never reuse or retag a published tag).

## Verification

- Command/check: python3 -I scripts/validate_repo.py; YAML parse of the workflow
- Result: passed before merge
- Evidence/reason: validator passed; the workflow parses with jobs installer and prerelease.
- Command/check: dispatch on main with desktop-preview-20261105-2; release assets and hashes
- Result: `not verified`
- Evidence/reason: pending merge and dispatch.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: pending the dispatch run.
- Health/readiness/log/error inspection: pending.
- Integration/dependency/config/migration check: no dependency change; no new action.
- Remaining issue or reason not verified: whether the exe launches on Windows.

## Security, observability, risk, and rollback

- Security impact: the tag is still validated by regex and passed through env; the new check only reads a ref with the default token (contents: write is already on this job).
- Observability impact: the run log states why a tag is refused.
- Residual risk: unsigned binary published as a pre-release.
- Rollback: delete the pre-release and its tag (gh release delete --cleanup-tag) and revert the workflow change.
- Next safe action: merge, dispatch, verify assets against the run's checksum, then complete this record.
