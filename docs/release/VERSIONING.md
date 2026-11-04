# Versioning policy

<!-- VERSION:START -->
Canonical repository version: `v0.0.0.0`
<!-- VERSION:END -->

## Canonical version

The root `VERSION` file is the only authoritative source. It contains exactly `vMAJOR.MINOR.FEATURE.BUILD` plus one newline, where all four segments are non-negative integers. `version-targets.json` declares documentation markers and required runtime/container wiring; derived metadata is never an independent version source.

New repositories begin at `v0.0.0.0`. Versions from `v0.0.0.0` through `v1.1.1.412` are development-only: they are valid for local and internal development but are not supported, production, or externally published releases.

`v1.1.1.413` is the first release-eligible baseline. A first supported release is promoted directly to that version; it is not necessary to publish intervening development versions.

## Release increments

| Change | Rule | Example |
|---|---|---|
| Small hotfix | Increment BUILD | `v1.1.1.413` → `v1.1.1.414` |
| Backward-compatible feature | Increment FEATURE; reset BUILD to 1 | `v1.1.1.413` → `v1.1.2.1` |
| Large feature/release train | Increment MINOR; reset FEATURE and BUILD to 1 | `v1.1.1.413` → `v1.2.1.1` |
| Breaking/major update | Increment MAJOR; reset remaining segments | `v1.1.1.413` → `v2.0.0.0` |

Published versions are immutable. Roll back by deploying a previously published artifact/digest; never overwrite an existing tag or lower the canonical version.

## Required propagation

The release check verifies all applicable locations derive from `VERSION`:

- runtime build metadata;
- FastAPI `version` metadata;
- image tag;
- OCI `org.opencontainers.image.version` and, when available, `org.opencontainers.image.revision`;
- controlled `/version` endpoint or approved health version field;
- README and release documentation/changelog.

Run `pwsh -File scripts/version.ps1 sync` after changing `VERSION`, then `pwsh -File scripts/version.ps1 validate` and `pwsh -File tests/version-tests.ps1` before release readiness. Validation rejects malformed canonical content, exact marker mismatch, missing wiring, and decreases below an existing supported-release Git tag.
