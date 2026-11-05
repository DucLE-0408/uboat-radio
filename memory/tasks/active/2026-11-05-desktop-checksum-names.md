---
schema_version: 1
id: task-2026-11-05-desktop-checksum-names
status: in-progress
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T04:35:00.0000000Z
started_at: 2026-11-05T04:35:00.0000000Z
updated_at: 2026-11-05T04:50:00.0000000Z
base_commit: 28905ec370a83054870753d0806db17d476ee3bc
owned_paths:
  - .github/workflows/desktop-windows.yml
  - memory/tasks/active/2026-11-05-desktop-checksum-names.md
plan: null
handoff: null
---

# Task: desktop-checksum-names

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: after I reported that the checksum file of desktop-preview-20261105-2 lists a spaced file name while GitHub serves dots, and offered to fix it with the task cleanup: "làm cả hai đi"
- Outcome and acceptance criteria: for later previews, SHA256SUMS.txt names the asset exactly as GitHub serves it, so `sha256sum --check` works on a plain download; no existing release is touched
- In scope / out of scope: in = a rename-and-rewrite step in the prerelease job of desktop-windows.yml, run after the original checksum has been verified; out = editing the published releases, signing, VERSION, a new dispatch
- Material assumptions and risks: the step is verified only by a local dry run on a mock directory; the real check happens on the next tagged dispatch (not requested now), so the record stays in-progress until then

## Architecture linkage

prerelease job: download artifact -> verify the original sums (CRLF stripped) -> rename spaces to dots, regenerate and re-check SHA256SUMS.txt -> gh release create.

## Progress and decisions

- Decision: verify the original checksum first, then regenerate for the renamed file, so the new list is not trusted blindly.
- Decision: do not edit the published release; a published asset keeps the checksum it shipped with.

## Verification

- Command/check: local dry run of the step on a mock release directory; python3 -I scripts/validate_repo.py; YAML parse
- Result: `passed` (local) / `not verified` (real run)
- Evidence/reason: the dry run produced "U-Boat.Radio.Operator_0.0.0_x64-setup.exe: OK"; validator and YAML parse pass. No tagged dispatch has been run with this change.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: pending the next tagged dispatch.
- Health/readiness/log/error inspection: pending.
- Integration/dependency/config/migration check: no dependency change; no new action.
- Remaining issue or reason not verified: the step has not run in Actions.

## Security, observability, risk, and rollback

- Security impact: none; the tag handling is unchanged, the step runs on the already verified file.
- Observability impact: the run log prints the new checksum list.
- Residual risk: low; a failure would stop the release (fail closed) before it is created.
- Rollback: revert the workflow change.
- Next safe action: on the next tagged preview, check that SHA256SUMS.txt matches the served name, then complete this record.
