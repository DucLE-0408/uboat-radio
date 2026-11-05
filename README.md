# U-Boat Radio Operator

<!-- VERSION:START -->
Current repository version: `v0.0.0.0`
<!-- VERSION:END -->

A World War II U-boat radio-room game. You are the radio operator: copy Morse, decipher on an Enigma, authenticate the message against the day's table, and decide what the captain gets to see. A forged order is always possible and always leaves at least one verifiable tell. Play in the browser or install the Windows app; the game runs fully offline.

Versions below `v1.1.1.413` are development-only: everything here is a development preview, not a supported release.

## Play and install

| How | Where |
|---|---|
| Browser (installable PWA) | the hosted site's **Play** page (`/play/`), built from `packages/radio-ui` |
| Windows installer (unsigned preview) | [GitHub Releases](https://github.com/DucLE-0408/uboat-radio/releases): download `*.exe` and check its SHA256 against `SHA256SUMS.txt` |
| From source | `cd packages/radio-ui && npm ci && npm run dev` (Node.js 22.12 or newer) |

The Windows installer is **unsigned**: SmartScreen shows "Unknown publisher" (More info, Run anyway). It has been built by CI but not yet run on a real Windows machine by this repository's tests. See [packages/desktop](packages/desktop/README.md).

## What the game is

- **Night watch**: one scripted watch of radio traffic (the original game mode).
- **Endless**: an open-ended watch with a difficulty and a set of independent modules. A watch is a seed, its options and the command log, so it replays bit-for-bit.
- **The desk**: a paperwork desk (Enigma machine, plugboard, authentication table, stamps, seals, signatures, Orders, outbox, notes, crew conversations) on top of the radio room.
- **The boat**: a Helm screen (compass, wheel, speed, depth), a dead-reckoning chart with movement orders, and a sonar/hydrophone drawer.

### Endless modules (all on by default, each switchable)

| Module | What it adds |
|---|---|
| `timer` | a deadline for every message |
| `rotors` | set the Enigma yourself |
| `stamps` | paperwork rules and citations |
| `signatures` | seals, signatures and sender IDs |
| `cables` | wire the plugboard yourself |
| `teletyper` | messages print slowly |
| `map` | chart, Helm and movement orders (with coast, seabed and shoals, and depth charges that burst relative to the floor) |
| `weather` | visibility, wind and sea state: sightings by escorts, storms that slow the boat, a rougher sea that masks sonar |
| `radar` | enemy radar patrols and the Metox warning receiver |
| `water` | a water-temperature chart and a thermocline that muffles the hydrophone and weakens ASDIC below it |

## Repository map (game)

| Path | What it is |
|---|---|
| [`packages/sim-core`](packages/sim-core/README.md) | headless deterministic simulation (TypeScript, no DOM) |
| [`packages/radio-ui`](packages/radio-ui/README.md) | the browser app: radio room, desk, Helm, menu (Vite, DOM and Web Audio) |
| [`packages/desktop`](packages/desktop/README.md) | Tauri 2 shell and Windows installer |
| `packages/site` | the landing page and download page assembled with the game for hosting |
| [`docs/architecture.md`](docs/architecture.md) | architecture, by stage, with the save-compatibility rule |
| [`docs/specs`](docs/specs/README.md) | requirements, designs and tasks per stage |
| [`docs/change-logs/CHANGELOG.md`](docs/change-logs/CHANGELOG.md) | what changed |

## Build and test

```bash
cd packages/sim-core  && npm ci && npm run typecheck && npm test
cd packages/radio-ui  && npm ci && npm run typecheck && npm test && npm run build
```

Both packages must pass before a change is called done. The desktop installer is built by the GitHub Actions workflow **Desktop installer (Windows)**.

## Saves and sim versions

A save is the seed, the options and the command log; the watch is rebuilt by replaying it. Any change that alters what a save replays into must bump `SIM_VERSION` (`packages/sim-core/src/simversion.ts`), or `simversion.test.ts` fails. A save written by another sim version is kept but cannot be continued (the menu says so). See [architecture](docs/architecture.md).

## Engineering and governance

This repository was created from the Warp Agent Repository Template and keeps its governance: binding rules in [AGENTS.md](AGENTS.md), task records and plans in `memory/`, versioning and release runbooks in `docs/release/`. The sections below are that template's description, kept for contributors.

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

## Repository map (template governance)

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
