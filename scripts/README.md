# Repository automation

## Canonical health check

```powershell
./scripts/check-repo.ps1
```

This validates exact version markers/wiring, record schemas/links, active path ownership conflicts, required skeleton assets, immutable Action pins, and diff whitespace.

## Task lifecycle

```powershell
./scripts/new-task.ps1 `
  -Name add-rate-limit `
  -Goal 'Authenticated callers receive bounded rate-limit behavior with metrics.' `
  -ConfirmationReference 'User approval in task 123' `
  -Owner agent-name `
  -OwnedPath src/api,tests/api

./scripts/new-handoff.ps1 `
  -Name add-rate-limit-agent-b `
  -TaskPath memory/tasks/active/2026-08-10-add-rate-limit.md `
  -FromAgent agent-a -ToAgent agent-b

./scripts/complete-task.ps1 `
  -TaskPath memory/tasks/active/2026-08-10-add-rate-limit.md
```

`complete-task.ps1` refuses obvious pending verification. The agent remains responsible for real runtime/codebase-health evidence.

## Version lifecycle

```powershell
./scripts/version.ps1 read
./scripts/version.ps1 sync
./scripts/version.ps1 validate
./tests/version-tests.ps1
```

Change root `VERSION` only. `version-targets.json` declares documentation markers and required runtime/container wiring.

## Template initialization

```powershell
./scripts/initialize-repo.ps1 `
  -ProjectName my-service `
  -OwnerRepository organization/my-service `
  -ServiceName 'My Service' `
  -ClearTemplateHistory
```

Run once immediately after creating a repository from the template. `-ClearTemplateHistory` is intentionally guarded and only works on a one-commit derived repository.
