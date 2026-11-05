---
schema_version: 1
id: task-2026-11-05-desktop-checksum-names
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T04:35:00.0000000Z
started_at: 2026-11-05T04:35:00.0000000Z
updated_at: 2026-11-05T07:40:00.0000000Z
base_commit: 28905ec370a83054870753d0806db17d476ee3bc
owned_paths:
  - .github/workflows/desktop-windows.yml
  - memory/tasks/completed/2026-11-05-desktop-checksum-names.md
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
- Result: `passed`
- Evidence/reason: local dry run on a mock directory printed "U-Boat.Radio.Operator_0.0.0_x64-setup.exe: OK". Real run: workflow run 41986566729 on commit 1a68929, tag desktop-preview-20261105-3: step "Name the asset the way GitHub will serve it" succeeded; jobs installer and prerelease succeeded; the release is a pre-release (not draft), tag ref 1a68929, assets installer exe (3,353,054 bytes) and SHA256SUMS.txt; downloaded through the REST API, `sha256sum --check SHA256SUMS.txt` printed "U-Boat.Radio.Operator_0.0.0_x64-setup.exe: OK" (hash 22fd40ce...bbd8).

## Runtime and codebase-health verification

- Runtime/user-flow exercise: the tagged dispatch above created the release and its assets were downloaded and checked.
- Health/readiness/log/error inspection: job and step conclusions read through the Actions API.
- Integration/dependency/config/migration check: no dependency change; no new action.
- Remaining issue or reason not verified: whether the exe launches on Windows (unsigned, never run on a real machine); the three earlier previews keep their spaced checksum names.

## Security, observability, risk, and rollback

- Security impact: none; the tag handling is unchanged, the step runs on the already verified file.
- Observability impact: the run log prints the new checksum list.
- Residual risk: low; a failure would stop the release (fail closed) before it is created.
- Rollback: revert the workflow change.
- Next safe action: none for this task.
