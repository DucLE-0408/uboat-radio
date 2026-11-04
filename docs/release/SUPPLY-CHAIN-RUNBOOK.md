# Release supply-chain runbook

Before a supported release:

1. Validate `VERSION` and exact derived targets.
2. Build from a clean immutable commit with locked dependencies and digest-pinned bases.
3. Generate SBOM and provenance/attestation; retain them beside the artifact.
4. Scan source/dependencies/image/IaC/secrets and resolve or time-bound accepted findings.
5. Verify OCI version/revision/source labels and immutable image digest.
6. Sign/attest where supported and verify signatures before deployment.
7. Record upgrade, compatibility, migration, rollback version/digest, SLO signals, and approval.

Never publish versions below `v1.1.1.413` as supported or overwrite an existing tag.
