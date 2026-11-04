# Release runbook

<!-- VERSION:START -->
Target version: `v0.0.0.0`
<!-- VERSION:END -->

## Pre-release

1. Select the release class and record the version rationale in the change log.
2. Update only root `VERSION`; run `pwsh -File scripts/version.ps1 sync`.
3. Run `pwsh -File scripts/check-repo.ps1` and `pwsh -File tests/version-tests.ps1`, then applicable lint, type-check, build, image, migration, and security checks.
4. In a non-production environment, verify runtime/FastAPI metadata, controlled version access, image tag, OCI version/revision/source labels, SBOM, provenance, and immutable digest equal the approved commit/version.
5. Record the completed `release-manifest.template.json`, upgrade notes, compatibility/migration effects, SLO/alert observations, and rollback target/digest.

## Publish

Publishing/tagging/deployment requires explicit approval. Never publish versions below `v1.1.1.413` as supported releases.

## Rollback

1. Stop rollout according to platform policy.
2. Deploy the last known-good immutable image digest/version.
3. Validate readiness, error rate, latency, and critical business metrics.
4. Preserve sanitized evidence in `memory/logs/`; open a task record for root-cause analysis.
