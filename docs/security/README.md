# Security governance

- Create a [threat model](threat-model-template.md) for each material system/feature boundary.
- Classify data with [the classification policy](data-classification.md) before persistence or telemetry.
- Apply [supply-chain controls](supply-chain.md) to dependencies, Actions, containers, SBOM/provenance, and releases.
- Record security reviews, time-bound exceptions, owners, verification, review dates, and incident/postmortem links.

Never store credentials, raw production logs, private customer data, weaponized public exploit detail, or unredacted evidence in Git.
