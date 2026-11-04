# Supply-chain security

- Pin direct/transitive dependencies and CI Actions; commit lockfiles and verify integrity/hashes.
- Pin container bases by digest and rebuild regularly for security updates.
- Produce SBOM and provenance tied to immutable commit/version/image digest.
- Scan dependency, container, IaC, and secret findings with ownership and exception expiry.
- Review install/build scripts, package publisher, licence, maintenance, and transitive weight.
- Sign/attest release artifacts where infrastructure supports it; verify before deployment.
