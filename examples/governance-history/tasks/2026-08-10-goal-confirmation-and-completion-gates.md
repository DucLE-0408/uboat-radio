# Task: goal-confirmation-and-completion-gates

- Status: `completed`
- Owner/agent: Codex
- Started: 2026-08-10T15:00:00Z
- Last updated: 2026-08-10T15:04:00Z
- Links: `memory/plans/2026-08-10-goal-confirmation-and-completion-gates.md`

## User-confirmed goal

- Confirmation reference/time: user request in this task, 2026-08-10.
- Outcome and acceptance criteria: agents must confirm the intended goal before implementation, persist to the real objective, and verify runtime/codebase health after completing it rather than relying only on tests.
- In scope / out of scope: repository agent workflow, workflow documentation, task template, and PR checklist; no application behavior or external release change.
- Material assumptions and risks: confirmation is concise and user-facing; private reasoning is not exposed. Existing template CI remains a task-record gate rather than trying to infer semantic goal confirmation.

## Acceptance criterion

Root agent rules and supporting workflow artifacts make explicit goal confirmation, persistent execution, runtime/user-flow verification, and post-change codebase-health checks mandatory before a completion claim.

## Scope

- In: rules and record templates described above.
- Out: push/commit, deployment, test-suite implementation, or version change.

## Progress and decisions

- Added a concise goal-confirmation gate and explicit requirement to wait for user approval before source edits.
- Added a persistence rule and a precise blocked-state contract to prevent reporting partial/proposed work as complete.
- Added closure requirements for runtime/user-flow verification and codebase-health assessment, with explicit `not verified` reporting.

## Verification

- Command/check: assertion check for the required goal confirmation, explicit approval, persistence, runtime verification, codebase-health, task-template, PR-template, plan, and task-record gates.
- Result: passed.
- Command/check: `git diff --check`.
- Result: passed; no whitespace errors.
- Not verified / reason: GitHub Actions is not run by this local documentation/rule change.

## Runtime and codebase-health verification

- Runtime/user-flow exercise: not applicable; this change modifies governance artifacts only.
- Health/readiness/log/error inspection: not applicable; no service runtime changed.
- Integration/dependency/config/migration check: links and required workflow record paths inspected; passed.
- Remaining issue or reason not verified: no live GitHub Action run until a later push/PR is authorized.

## Risks and next handoff

- Risk: mandatory user confirmation adds a deliberate interaction round trip; this is required by the approved policy.
- Next action: observe these governance gates on the next implementation pull request and refine only with recorded evidence.
