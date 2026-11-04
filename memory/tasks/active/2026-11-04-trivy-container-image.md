---
schema_version: 1
id: task-2026-11-04-trivy-container-image
status: in-progress
owner: claude
goal_confirmed_at: 2026-11-04T04:04:03.0000000Z
started_at: 2026-11-04T04:04:03.0000000Z
updated_at: 2026-11-04T04:04:03.0000000Z
base_commit: 3dc008144986557912735c57b42b023d9216583e
owned_paths:
  - .github/workflows/supply-chain.yml
  - memory/tasks/active/2026-11-04-trivy-container-image.md
plan: null
handoff: null
---

# Task: trivy-container-image

## User-confirmed goal

- Confirmation reference: user: 'mở PR riêng sửa Trivy' (after the assistant offered it)
- Outcome and acceptance criteria: Make the Supply-chain security workflow's Trivy scans run again: filesystem-and-sbom and example-image must get past the Trivy installation that fails with exit code 6
- In scope / out of scope: In scope: replace the two aquasecurity/trivy-action steps in .github/workflows/supply-chain.yml with docker run of the official Trivy image pinned by digest, same flags (scanners vuln,secret,misconfig; HIGH,CRITICAL; ignore-unfixed; exit-code 1). Out of scope: changing what is scanned or the severity policy, the SBOM step, dependency updates, any application code.
- Material assumptions and risks: root cause is inferred, not reproduced. The job log shows install.sh dying with exit 6 about 0.1 s after 'found version', and the script's next action is a curl download of the release tarball (curl exit 6 = could not resolve host). The same jobs' Docker Hub pulls succeed (the example image build step passed), so the fix moves Trivy to a registry the runners already reach. Trivy then downloads its vulnerability DB at run time from its own hosts; whether the runners can reach them is unverified until CI runs. anchore/sbom-action also downloads syft from GitHub releases and may hit the same problem; it was skipped in the failing runs, so unknown.

## Architecture linkage

Client/input → API/handler → service → DB/cache/queue/external dependency → logs/metrics/traces.

## Progress and decisions

- Evidence: runs 41769995116 (#9), the #8 runs and the last three pushes to main all fail at the Trivy installation (`bash ./trivy/contrib/install.sh -b ... -c setup-trivy v0.70.0` exit 6). trivy-action v0.36.0 is the newest tag and pins setup-trivy v0.2.6, whose newer v0.3.1 uses the same install.sh ref, so bumping actions would not change the download.
- Digest: Docker Hub `aquasec/trivy:0.70.0` index `sha256:be1190afcb28352bfddc4ddeb71470835d16462af68d310f9f4bca710961a41e` (read from the Docker Hub tags API, last_updated 2026-04-17).

## Verification

- Command/check: YAML parse of .github/workflows/supply-chain.yml; `python3 -I scripts/validate_repo.py`
- Result: `passed`
- Evidence/reason: workflow parses (jobs filesystem-and-sbom, example-image; env TRIVY_IMAGE); repository governance validation passed.
- Command/check: running the new docker commands locally
- Result: `not verified`
- Evidence/reason: the cloud sandbox has the Docker CLI but no running daemon. Flags are standard Trivy CLI flags but were not executed here.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: passed for the goal: the pull request's CI run (run 41770942639) executed the new steps. `filesystem-and-sbom` succeeded end to end (Trivy filesystem scan, SPDX SBOM, artifact upload). `example-image` now runs the Trivy image scan (the vulnerability DB downloaded fine) and exits 1 because of real HIGH/CRITICAL findings in the pinned base image.
- Health/readiness/log/error inspection: example-image log lists fixable HIGH/CRITICAL CVEs in Debian 13 packages of `python:3.13-slim@sha256:9662417a...` (util-linux/mount/login CVE-2026-5361x, openssl CVE-2026-14456/84782, perl-base CVE-2026-13221 and others, with fixed versions available). That is a genuine finding, not a tooling failure.
- Integration/dependency/config/migration check: the image digest was read from Docker Hub; no new GitHub Action is introduced and one pinned action (aquasecurity/trivy-action) is removed.
- Remaining issue or reason not verified: example-image stays red until the example image's base image digest is bumped to a build with those fixes; that is a dependency change outside this task's scope and needs the user's approval (AGENTS.md section 2.4). Suppressing or relaxing the scan to get green is not done.

## Security, observability, risk, and rollback

- Security impact: scanner image is pinned by immutable digest from the official aquasec namespace; the workspace is mounted read-only for the filesystem scan; the image scan mounts the Docker socket into the Trivy container on an ephemeral runner (same trust as the previous action running on the host); no secrets are used.
- Observability impact: scan output now comes from `docker run` step logs instead of the action wrapper; exit code semantics are unchanged (exit-code 1 on HIGH/CRITICAL).
- Residual risk: digest needs manual bumping (documented in the workflow comment); example-image is red because of real findings in the example image's base layer.
- Rollback: revert this commit to restore the aquasecurity/trivy-action steps.
- Next safe action: with the user's approval, bump `PYTHON_IMAGE` in examples/fastapi/Dockerfile to a newer digest-pinned python:3.13-slim and re-run the scan.
