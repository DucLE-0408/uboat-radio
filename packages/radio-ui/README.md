# @uboat/radio-ui — U-Boat Radio Operator (browser app)

Plain TypeScript + DOM + Web Audio, bundled with Vite. The simulation lives in `../sim-core` and is imported only through its barrel. The UI is a read-only view of the sim's events plus the player's own input: it never receives the true position, the enemy, the hazard or the real weather and water (the sim's D3 rule).

## What is in the app

- **Radio room** (`src/scene`, `src/panels`): copy Morse, the Enigma, the authentication table, the event log, the sonar and hydrophone drawer.
- **Paperwork desk** (`src/desk`, the default interface): Enigma machine and plugboard, stamps, seals, signatures, Orders, outbox, notes, crew conversations, the ration and score.
- **Helm** (`src/desk/helm.ts`): compass, wheel, speed and depth, the dead-reckoning chart with movement orders, and its overlays (surveyed depth and shoals, fog, water temperature).
- **Sonar drawer** (`src/scene/drawers.ts`, `sonarview.ts`): bearing dial, ten-minute bearing trace, coarse signal bands, listening conditions, the ASDIC banner. No distances anywhere.
- **Menu** (`src/menu`): Continue, New game, Endless (difficulty and modules), Settings, Help.
- All strings are in `src/i18n` (English and Vietnamese, typed keys).

## Run for development

```bash
cd packages/radio-ui
npm ci
npm run dev            # http://127.0.0.1:5173/   (?seed=42  ?speed=1..60  ?ui=classic  ?diag=1)
npm test               # vitest
npm run typecheck
```

Node.js 22.12 or newer is required (Vite 8, Vitest 5).

## Build the installable app (PWA)

```bash
npm run build          # tsc + vite build -> dist/  (relative URLs, offline service worker, manifest, icons)
npm run preview        # serves dist/ at http://127.0.0.1:4173/
```

`dist/` is a static site: copy it to any static host (HTTPS) or serve it locally; no server code is involved.

### Install on Windows, macOS, Linux or Android

1. Open the served address in Microsoft Edge or Google Chrome (HTTPS, or `http://127.0.0.1` / `localhost`).
2. Edge: menu `...` → **Apps** → **Install this site as an app**. Chrome: address-bar install icon or menu → **Install U-Boat Radio Operator**. On Android use **Add to Home screen / Install app**.
3. After the first load the app works fully offline: a service worker caches the whole app shell. Updates download in the background and take over the next time the app is opened (never during a watch).

Notes:
- Opening `dist/index.html` by double-clicking does **not** work: browsers block module scripts on `file://`. Use `npm run preview`, any static server, or install the PWA once.
- The saved watch (seed + commands) and unfinished transcription live in the browser's local storage for that origin; clearing site data erases them.
- The Windows installer is built from this bundle by `../desktop` (see its README).

## Main menu and URL parameters

The game opens on a menu (Continue, New game, Settings, Help). Continue needs a valid save; New game takes an optional seed (0..4294967295) and replaces the save. Settings (volumes, sound, reduce motion, interface) live under `uboat-radio.settings.v1`. In the game, the **Menu** button saves and returns to the menu.

`?seed=N` skips the menu (resumes a matching save, otherwise starts that seed), `?play=new` and `?play=continue` skip it too, `?mode=endless` starts an Endless watch with the last saved configuration, `?lang=en|vi` overrides the saved language, `?ui=classic` forces the classic panels, `?speed=1..60` compresses time for tests, `?diag=1` shows diagnostics.

## Endless and its modules

Endless takes a difficulty (easy, normal, hard) and ten independent modules (all on by default): `timer`, `rotors`, `stamps`, `signatures`, `cables`, `teletyper`, `map`, `weather`, `radar`, `water`. Modules are independent of difficulty. The menu stores the last configuration and a best score per difficulty and module set (the score key is the difficulty plus one bit per module). See the [project README](../../README.md#endless-modules-all-on-by-default-each-switchable) for what each module adds.

## Saves

A save is `{ v, opts?, sim, seed, untilTick, commands }` under `uboat-radio.save.v2`, validated at the storage boundary (bounded sizes, strict command parsing). `sim` is the sim's behaviour version: a save from another version is not replayed and not rewritten, and the menu explains why (see `docs/architecture.md`). A save without `sim` (written before the field existed) is read as the current version.

## Desktop installer and hosting

A Windows `.exe` is built from this bundle by `packages/desktop` (Tauri; see its README). The web build is hosted via the root `vercel.json`.

## Assets

All sprites and icons are generated placeholders (`node tools/art/generate.ts`) listed with origin, licence and hashes in `assets/manifest.json`; fonts are SIL OFL-1.1 (`assets/fonts`).
