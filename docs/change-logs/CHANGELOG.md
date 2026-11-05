# Change log

## Unreleased

Development previews only: `VERSION` stays `v0.0.0.0`. Create a dated release entry only after the canonical `VERSION` has been selected.

### Game

- Paperwork desk, consequences for paperwork errors, paper tells and the plugboard (G2, G3).
- Endless mode with difficulty and independent modules, replies, private notes and a crew roster (G4).
- Chart, Helm, movement orders and dead reckoning; coast collision; seabed, shoals and bottoming; depth charges that burst relative to the sea floor (G5).
- Weather and visibility with sightings by escorts; storms that slow the boat; a sonar screen with a bearing trace and listening conditions, and sea-aware hearing; enemy radar patrols and the Metox warning; water temperature, the thermocline and a temperature chart (G6).
- Saves record the sim behaviour version (`SIM_VERSION`, now 5); a save from another version is kept but cannot be continued. A test fails when sim behaviour changes without a bump.

### Installer and hosting

- Windows installer built by CI (Tauri 2, unsigned) and published as GitHub pre-releases (`desktop-preview-20261104`, `desktop-preview-20261105`, `desktop-preview-20261105-2`, `desktop-preview-20261105-3`); the release workflow accepts a suffixed tag, refuses an existing tag, and names the asset as GitHub serves it (so `sha256sum --check` works on a plain download, checked on `-3`). The latest preview includes the weather, radar, sonar and water rules.
- Landing page and web build hosted from the repository.

### Documentation

- README rewritten for the game; READMEs for the sim core, the UI and the installer; an architecture overview and a specs index.

## v0.0.0.0 — Development scaffold

- Initial repository structure, agent governance, task continuity, and release controls.
