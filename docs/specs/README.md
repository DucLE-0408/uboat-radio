# Specs index

Each stage has requirements (EARS), a design and a task list. Later rules are written as addenda next to the stage they extend. Specs are in Vietnamese except the P4 and P5 ones.

| Folder | Stage | Contents | Status |
|---|---|---|---|
| `p4-radio-ui/` | P4 | functional radio-room UI | done |
| `p5-radio-room-presentation/` | P5 | presentation: art, audio, layouts | done |
| `desk-ui/` | G1 to G2 | the paperwork desk; `evidence/` holds the screenshots of every stage | done |
| `desk-ui-g3/` | G3 | paperwork consequences, paper tells, plugboard | done |
| `desk-ui-g4/` | G4 | Endless, modules, replies, private notes, roster | done |
| `desk-ui-g5/` | G5 and G6 | map, movement orders, Helm (`requirements.md`, `design.md`, `tasks.md`) and the addenda below | done |

## Addenda in `desk-ui-g5/`

| File | Rule | `SIM_VERSION` after it |
|---|---|---|
| `coast.md` | coast collision, grounding | 1 |
| `seabed.md` | seabed, shoals, bottoming | 1 |
| `charge.md` | depth charges burst relative to the floor | 1 |
| `weather.md` | weather, visibility, sightings by escorts | 1 |
| `storm.md` | storms slow the boat | 2 |
| `sonar.md` | the sonar screen and sea-aware hearing | 3 |
| `radar.md` | enemy radar and the Metox | 4 |
| `water.md` | water temperature, thermocline, the temperature chart | 5 |

The version guard arrived after the weather rule, so the first five rules share version 1; from `storm.md` on, every rule bumped it (see `docs/architecture.md`, save compatibility).

## Conventions

- A change to `packages/sim-core` gets a spec (or addendum) approved before code.
- Every spec states what is out of scope.
- Evidence screenshots live in `desk-ui/evidence/`.
