---
schema_version: 1
id: task-2026-11-05-docs-refresh
status: completed
owner: claude-cloud-session
goal_confirmed_at: 2026-11-05T07:45:00.0000000Z
started_at: 2026-11-05T07:45:00.0000000Z
updated_at: 2026-11-05T07:50:00.0000000Z
base_commit: 1a689291d7f419f49eb8b16b55ec5cbdb20c6be2
owned_paths:
  - README.md
  - docs/architecture.md
  - docs/specs/README.md
  - docs/change-logs/CHANGELOG.md
  - packages/sim-core/README.md
  - packages/radio-ui/README.md
  - packages/desktop/README.md
  - tests/initialize-tests.ps1
  - memory/tasks/completed/2026-11-05-docs-refresh.md
plan: null
handoff: null
---

# Task: desktop-checksum-names

## User-confirmed goal

- Confirmation reference: operator chat 2026-11-05: "cập nhật lại toàn bộ tài liệu trên github", then after the scope proposal: "ok, toàn quyền"
- Outcome and acceptance criteria: the repository documentation describes the game as it is now (all stages up to the water rules, SIM_VERSION 5, the Windows pre-releases) instead of the template; READMEs for the sim core, the UI and the installer; an architecture overview and a specs index; a changelog entry; no broken relative link; the repository validator passes; no change to `VERSION`
- In scope / out of scope: in = README.md, the three package READMEs (one new), docs/architecture.md (overview and table only), docs/specs/README.md (new), the changelog, and one expectation in tests/initialize-tests.ps1; out = AGENTS.md, templates and governance docs, GitHub repository settings (description, topics), release pages, the landing page text
- Material assumptions and risks: README text is English (the existing docs are English; specs stay Vietnamese); the template's initialization test expected the README to start with the replaced template name, so its expectation was changed to the "created from ..." sentence that the new README keeps; that PowerShell test could not be run here (no pwsh); CI not run on the PR (waived)

## Architecture linkage

Documentation only. The README keeps the VERSION markers that `scripts/version.ps1` and `version-targets.json` check, and the template phrase that `scripts/initialize-repo.ps1` replaces.

## Progress and decisions

- Decision: keep the template's own sections under a "template governance" heading instead of deleting them, so the derived-repository instructions and the initialization test stay meaningful.
- Decision: state only what was verified; the checksum-name behaviour was written as verified after release `desktop-preview-20261105-3` was checked (its run finished while this task was in progress), and the `desktop-checksum-names` task was completed in the same PR.
- Found: the first draft of the root README dropped the template's "Create a derived repository" section; restored before commit.
- Found: one anchor in the architecture overview did not match the generated heading slug; fixed.

## Verification

- Command/check: a script resolving every relative link in the changed Markdown files; GitHub-style anchor check for the architecture overview; `python3 -I scripts/validate_repo.py`
- Result: `passed`
- Evidence/reason: 0 broken relative links in 8 changed files; all overview anchors resolve; the validator passes (read in full).
- Command/check: tests/initialize-tests.ps1 and tests/version-tests.ps1
- Result: `not verified`
- Evidence/reason: no pwsh in this environment; the README keeps the `Current repository version: v0.0.0.0` marker and the phrase the initializer replaces, so both are expected to pass in the Version governance workflow, which runs on the push to main and is checked after the merge.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: none (documentation only).
- Health/readiness/log/error inspection: n/a.
- Integration/dependency/config/migration check: no dependency or config change; one test expectation changed.
- Remaining issue or reason not verified: the PowerShell governance tests until CI runs; GitHub's rendering of the tables and anchors was not viewed.

## Security, observability, risk, and rollback

- Security impact: none; no secrets, no new external links except the project's own releases page.
- Observability impact: none.
- Residual risk: low; documentation can drift again as rules change (each rule's spec and the architecture addendum remain the source).
- Rollback: revert the PR.
- Next safe action: check the Version governance run on main after the merge.
