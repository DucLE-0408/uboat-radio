# Warp Agent Repository Template

<!-- VERSION:START -->
Current repository version: `v0.0.0.0`
<!-- VERSION:END -->

Secure, observable, multi-agent repository skeleton for Warp/Codex and human engineering teams. New repositories begin at `v0.0.0.0`; versions below `v1.1.1.413` are development-only.

## Create a derived repository

1. Use the GitHub **Use this template** action.
2. Run `./scripts/initialize-repo.ps1 -ProjectName <slug> -OwnerRepository <owner/repo> -ServiceName '<name>' -ClearTemplateHistory` immediately after creation.
3. Replace placeholder CODEOWNERS, security contact, licence decision, environment inventory, architecture, and project-specific build/test commands.
4. Confirm the first goal and create an active task with `scripts/new-task.ps1` before any implementation.
5. Run `scripts/check-repo.ps1` and project-specific runtime checks before every completion claim.

## Core workflow

```text
User-confirmed goal
  → machine-readable active task + owned paths
  → architecture/recon + plan when required
  → smallest coherent implementation
  → static + test + runtime/user-flow + codebase-health verification
  → completed task or evidence-backed handoff/blocker
  → reviewed commit/release with rollback
```

Root [AGENTS.md](AGENTS.md) is the binding contract. [Agent workflow](docs/agent-workflow.md) explains records and [scripts](scripts/README.md) provide repeatable lifecycle commands.

## Repository map

```text
.
├── .github/                  # Immutable-pinned CI, PR/issue forms, ownership/dependencies
├── docs/
│   ├── adr/                  # Immutable architecture decisions
│   ├── api/                  # API contracts and compatibility
│   ├── data/                 # Data ownership, schemas, migrations
│   ├── design/               # Approved UI/UX source material
│   ├── features/             # Feature specs and acceptance criteria
│   ├── observability/        # Logs/metrics/traces/SLO/alerts
│   ├── release/              # Version, supply chain, upgrade/rollback
│   ├── runbooks/             # Deploy/incident/postmortem/recovery
│   ├── security/             # Threat model, classification, supply chain
│   └── summaries/            # Milestone/decision summaries
├── examples/                 # Secure reference implementation and template provenance
├── memory/
│   ├── coordination/         # Multi-agent ownership model
│   ├── tasks/                # Machine-readable active/completed work
│   ├── plans/                # Approved design/rollback plans
│   ├── session-handoffs/     # Cross-agent continuity
│   ├── logs/                 # Sanitized evidence only
│   └── schemas/              # Record schemas
├── scripts/                  # Bootstrap, lifecycle, version and health automation
├── tests/                    # Governance/version/runtime regression checks
├── AGENTS.md                 # Binding engineering/agent policy
├── VERSION                   # Single version source of truth
└── version-targets.json      # Declared derived version surfaces
```

## Enforcement boundary

CI validates task records, repository schemas, exact version metadata, FastAPI behavior, and container labels/access control. The current private personal GitHub plan does not provide effective branch protection/rulesets; direct pushes can mutate `main` before CI reports failure. Use GitHub Pro/organization rulesets for server-side prevention. Local hooks or written policy are defense-in-depth, not an equivalent guarantee.

## Security and release

- Never commit secrets, raw production logs, customer data, or private prompts/reasoning.
- Keep `/health` minimal and detailed `/version` authenticated/internal.
- Pin dependencies/Actions/base images; retain lockfiles, SBOM, provenance, signatures/attestations, and immutable digests where supported.
- Follow [versioning](docs/release/VERSIONING.md), [release runbook](docs/release/RELEASE-RUNBOOK.md), and [supply-chain runbook](docs/release/SUPPLY-CHAIN-RUNBOOK.md).
