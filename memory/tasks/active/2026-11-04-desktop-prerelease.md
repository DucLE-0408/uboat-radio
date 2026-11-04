---
schema_version: 1
id: task-2026-11-04-desktop-prerelease
status: in-progress
owner: claude
goal_confirmed_at: 2026-11-04T07:40:00.0000000Z
started_at: 2026-11-04T07:40:00.0000000Z
updated_at: 2026-11-04T07:40:00.0000000Z
base_commit: 183d6ac44b81afde77d590c57a88817d4ad6b748
owned_paths:
  - .github/workflows/desktop-windows.yml
  - memory/tasks/active/2026-11-04-desktop-prerelease.md
plan: null
handoff: null
---

# Task: desktop-prerelease

## User-confirmed goal

- Confirmation reference: user: "tao pre-release" (goal confirmation message, tag desktop-preview-YYYYMMDD, not touching VERSION) and "xac nhan, lam menu va tao pre-release"
- Outcome and acceptance criteria: a GitHub pre-release with the Windows installer (.exe) and SHA256SUMS.txt exists for the current main, created by a manual, tag-validated workflow run (no manual download of artifacts); the landing page's releases link then points at something real.
- In scope / out of scope: In scope: a manual `release_tag` input and a `prerelease` job in desktop-windows.yml (write scope only on that job, main only, checksum verified, tag pattern validated), one dispatch of that workflow on main with tag desktop-preview-20261104. Out of scope: VERSION or any tag matching the vMAJOR.MINOR.FEATURE.BUILD scheme, signing, marking the release latest/stable, auto-publishing on every push.
- Material assumptions and risks: the installer is unsigned and unverified on real Windows; a pre-release is public once created (the repo is public or not as configured) and is the first publication of the binary; a mistaken release can be deleted but tags/URLs may have been cached; the release is created from the installer built in the same run so the artifact matches the target commit.

## Architecture linkage

workflow_dispatch(main, release_tag) -> installer job (windows-latest) -> artifact -> prerelease job (ubuntu, contents: write) -> sha256 check -> gh release create --prerelease on the same commit.

## Progress and decisions

- Tag must match desktop-preview-YYYYMMDD (validated before use; passed through env, never interpolated into the script).
- actions/download-artifact pinned to v5.0.0 (634f93cb2916e3fdff6788551b99b062d0335ce0), compatible with upload-artifact v4.
- SHA256SUMS.txt is written by PowerShell (CRLF), so the CR is stripped before sha256sum --check.

## Verification

- Command/check: python3 -I scripts/validate_repo.py; YAML parse of the workflow
- Result: `passed`
- Evidence/reason: validator passed; workflow parses with jobs installer and prerelease.
- Command/check: dispatch on main with desktop-preview-20261104; release page and asset hashes
- Result: `not verified`
- Evidence/reason: pending merge and dispatch.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: pending the dispatch run.
- Health/readiness/log/error inspection: pending.
- Integration/dependency/config/migration check: one new pinned action (download-artifact v5.0.0, MIT); no other dependency change.
- Remaining issue or reason not verified: whether the exe launches on Windows; release visibility.

## Security, observability, risk, and rollback

- Security impact: contents: write only on the prerelease job; runs only for a manual dispatch on main; tag validated; checksum verified; no secrets beyond the default token.
- Observability impact: the run log lists the files and the hash check.
- Residual risk: unsigned binary published as a pre-release.
- Rollback: delete the pre-release and its tag (gh release delete --cleanup-tag) and revert the workflow change.
- Next safe action: merge, dispatch, verify assets against the artifact digest.
