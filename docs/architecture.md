# Architecture

Replace every placeholder before implementation. Keep this topology current; link detailed decisions to ADRs.

```text
Client/UI
  → CDN/LB/API gateway
  → API route/authn/authz/validation
  → service/domain transaction
  → DB/cache/queue/object storage/external API
  → structured logs + metrics + traces + audit events
```

## Components and ownership

| Component | Runtime/port | Owner | Data | Dependencies | Health/readiness | SLO/runbook |
|---|---|---|---|---|---|---|

## Trust and network boundaries

Document public/private listeners, TLS termination and trust, DNS/service discovery, ingress/egress, firewall/ACL, proxy behavior, CORS/CSRF, SSRF controls, rate/resource limits, and admin/metrics exposure.

## Identity and authorization flow

Document identity provider, sessions/JWT, issuer/audience/expiry, server-side RBAC/ABAC, tenant/object ownership, service identities, least privilege, and audit events.

## Data and consistency

Document schema ownership, transactions, duplicate delivery/order, cache invalidation, retention/deletion, encryption, backups/restores, migration compatibility, and disaster recovery.

## Failure and operations model

Document timeouts, cancellation, retry/idempotency, circuit breaking, backpressure, partial failure, graceful shutdown/draining, signals, alerts, capacity, rollout, and rollback triggers.

## U-Boat Radio Operator: simulation core (`packages/sim-core`)

Headless, deterministic TypeScript core (no DOM/engine). One seeded PRNG (`rng.ts`, mulberry32 + FNV-1a, `derive(seed, ...path)` for independent streams). Modules: `enigma` (M4), `morse` (element-level noisy channel + `Fist`), `messages` (genuine traffic and forgeries with verifiable tells), `auth` (Latin squares, challenge ledger, keybook), `intel` (Allied Intel ladder 0-4), `detection` (HF/DF), `events` (Event Bus; the only coupling to presentation/network). Tunables live in `data/balance.json`. Save/load is seed + event log, not snapshots. Presentation (P4+) subscribes to the Event Bus only.

### Vertical slice: one night watch (`watch.ts`, `traffic.ts`)

`Watch` is the only module that knows all others. Each tick (fixed 1 s) runs in a fixed order: timers -> boat -> transmit/HF-DF/Intel -> sonar -> Intel sync -> end check; every subsystem has its own seeded stream (`derive(seed, name, ...)`). Player input is a `Command` (heading, speed, mode, silence, transmit, repeat, challenge, check, resolve); the save file is `seed + commandLog`, rebuilt with `replay()`. Inbound traffic goes plaintext -> Enigma M4 (day key, per-attempt indicator) -> Vierergruppen + check letter -> Morse -> channel noise at `rxSnrDb - boat.radio().snrPenaltyDb`, and the operator-side `decipher` resets rotors at every group. Transmitting (repeat requests, challenges, acks, reports) feeds `HfdfDetector` and `Intel`; BOAT_SUNK emits KEYBOOK_LOST and raises Intel. The operator helpers (`listen`, `decipher`, `assess`, `worldCtx`) are side-effect free. `truthOf` is a test hook only.

## Radio Room UI (`packages/radio-ui`, P4 functional core)

Plain TypeScript + DOM + Web Audio, bundled by `vite@8.3.5` (the only new devDependency). Dev/preview servers bind `127.0.0.1`. The package aliases `@uboat/sim-core` to the sim-core barrel and imports nothing else from it (enforced by `test/invariants.test.ts`, together with: no `truthOf`, no Intel/hazard reads, no `innerHTML`).

```text
keydown(event.code) -> input/keymap -> Controller.handle -> Session.dispatch(Command) -> Watch
rAF -> FixedStepLoop (1 s steps, capped catch-up, pause) -> Session.step -> Watch.bus (SimEvent)
Watch.bus -> Controller.onEvent -> Store.apply -> topic flush -> panels (DOM) / AudioEngine
```

- `sim/session.ts`: save = `{v, seed, tick, commands}` in `localStorage` (validated on load, bounded); restore = `replay(seed, commands, tick)`; `rebuildStore` re-derives UI state from the replayed event log and re-attributes `AUTH_RESULT` to its `check` command.
- `store.ts`: UI state derived from `SimEvent`s only. `INTEL_LEVEL` is dropped, `ASDIC_PING` range/bearing and `HFDF_FIX` counters are never stored, `MSG_RESOLVED.forged` is discarded (only correctness is kept).
- Observation reads (side-effect free): `Watch.decipher/assess/checkMatches/worldCtx/dayTable/listen`, `summary()` (only `tSec`, `txTotalSec`), `boat.state()/radio()` for the player's own mode/speed/heading/hull/antenna. Intel level and hazard are never displayed.
- Audio: one `AudioContext` created after the first user gesture; Morse timing from `schedule()` with a cosmetic RNG derived from a per-page seed (never the sim RNG), identical on replay of the same `(rxId, attempt)`; hydrophone beat = measured blade rate.
- Failure model: no Web Audio -> visual Morse; storage errors -> one notice, play continues; hidden tab -> sim auto-pauses (player resumes with Esc); refused commands show the reason (`refusal.ts`).
- Rollback: the package is additive; delete `packages/radio-ui` (sim-core is untouched).


## Radio Room Presentation (`packages/radio-ui`, P5)

P5 replaces the P4 panels with a pixel-art scene and keeps everything behind it: `controller`, `store`, `sim/loop`, `sim/session`, `audio/*`, `input/keymap`. The P4 panels remain at `?ui=classic`. Spec: `docs/specs/p5-radio-room-presentation/`; decision record: [ADR-0001](adr/0001-sim-core-path-alias.md).

```text
keydown/touch -> input/modes.routeKey -> input/keymap.resolveKey -> Controller.handle -> Session.dispatch(Command) -> Watch
rAF -> FixedStepLoop (1 s, <=5 catch-up steps, pause, hidden-tab auto-pause) -> Session.step -> Watch.bus
Watch.bus -> Controller.onEvent -> Store.apply -> store.flush(topics) -> scene/* components (DOM + sprite layers)
                                             \-> audio queue (live events only)
Session save v2 + transcripts (separate key) <-> localStorage;  diag.ts (codes + timings, memory only)
```

- **Scene** (`src/scene/`): logical 640x360 at an integer scale on desktop (>= 1280 px, scale >= 2); tablet (768-1279) and mobile (< 768) use flow layouts of real-size controls (>= 44 px targets), mobile with a tab bar. Layout mode is decided on the empty scene so mobile browsers never see a desktop-width layout. Text and controls are live DOM; sprites are CSS backgrounds/9-slice borders with nearest-neighbour scaling.
- **Assets** (`assets/`): 23 sprites generated by `tools/art/generate.ts` (`node tools/art/generate.ts` from `packages/radio-ui`; deterministic, Node built-ins only), all marked `TEMPORARY` in `assets/manifest.json` (size, frames, origin, licence, sha256 of file and pixels); fonts Silkscreen and VT323 (OFL-1.1) with licence files and hashes. A missing sprite falls back to token colours and records `ASSET_LOAD:<id>`.
- **State derivation**: observation helpers only (`decipher`, `assess`, `checkMatches`, `worldCtx`, `dayTable`, `listen`, `summary` for `tSec`/`txTotalSec`, `boat.state()/radio()`). Intel, hazard, true range and `truthOf` are never read (static invariants in `test/invariants.test.ts`). Correctness (`MSG_RESOLVED.correct`) appears only after the decision and in the summary.
- **Save/replay**: `uboat-radio.save.v2` = `{v, seed, untilTick, commands}` (validated; <= 5000 commands, <= 20000 ticks, <= 2 MB; legacy v1 migrated). Unfinished copy lives in `uboat-radio.copy.v1` (<= 64 entries x 400 chars, `[A-Z0-9? ]`, must match the seed). Restore = `replay()` then a silent `rebuildStore` (no historical audio or alarms; an alert survives only while its 25 s window is open). `AUTH_RESULT` carries no `rxId`: live play sets `pendingCheck` before `dispatch(check)`; rebuild matches by tick and command order.
- **Refused commands**: `dispatch` returns a boolean only, so the UI says "Order not accepted. Observed: ..." and lists visible facts, never a cause.
- **Observability**: `diag.ts` keeps a random session id, tick, frame time percentiles, catch-up clamp counts and short error codes (`ASSET_*`, `AUDIO_*`, `SAVE_*`, `COPY_WRITE_FAILED`); anything else is replaced by `INVALID_CODE`. Memory only, shown with `?diag=1`, never contains message or transcript text.
- **Cosmetic randomness** (audio jitter, blinks, flicker, bobbing) uses streams derived from a per-page cosmetic seed, separate from the simulation seed.
- **Run**: `cd packages/radio-ui && npm ci && npx vite` -> `http://127.0.0.1:5173/` (`?seed=<n>` fixes the seed, `?speed=1..60` compresses time for testing, `?ui=classic`, `?diag=1`). Node >= 22.12 is required (vitest 5.1.0, vite 8.3.5). No CI workflow installs Node or runs these tests yet; the existing workflows only validate governance and supply-chain.
- **Version**: `VERSION` stays `v0.0.0.0` (development-only, no tags or releases exist); no release artifacts were produced.
- **Upgrade**: none for players beyond the v1->v2 save migration (automatic; old key removed after the first v2 save). **Rollback**: remove `packages/radio-ui/src/scene`, `assets`, `tools`, and the keys `uboat-radio.save.v2` / `uboat-radio.copy.v1`; set the default back to `mountClassic` in `src/main.ts` (or use `?ui=classic`). `packages/sim-core` and the command format are unchanged, so no data migration is needed.

## Installable app (PWA, `packages/radio-ui`)

`npm run build` produces a static, relocatable `dist/`: relative `base`, `manifest.webmanifest`, three placeholder icons (192, 512, maskable; generated by `tools/art/icons.ts`, marked `TEMPORARY` in `assets/manifest.json`) and `sw.js`, emitted at build time by the in-repo Vite plugin in `vite.config.ts` (generator: `tools/pwa/sw-template.ts`, no dependency). The worker precaches the whole app shell (cache name derived from the file list and HTML), serves same-origin GETs cache-first (`ignoreVary` so CORS module requests hit), falls back to the cached `index.html` for navigations, never touches cross-origin traffic, never calls `skipWaiting` (a new version activates the next time the app is opened; the player is told with a notice). Registration (`src/pwa.ts`) happens only in production on a secure origin. Install and run instructions: `packages/radio-ui/README.md`.

Verified in Chromium against the production build: worker activates and controls the page, 11 precached entries, `Page.getInstallabilityErrors` empty, manifest without errors, only the page's own origin contacted, full offline reload and play (also from a sub-path served by a plain static server), update flow (new cache installs, takes over after all tabs close). **Not verified:** a real Windows/macOS install, Edge's install UI, Android, Safari. Not included: native installers (Electron/Tauri), code signing, any release or publishing step; `VERSION` is unchanged.

## Desktop installer and web hosting (`packages/desktop`, `vercel.json`)

`packages/desktop` is a Tauri 2 shell (Rust `tauri =2.12.5`, `tauri-build =2.7.4`, CLI `@tauri-apps/cli 2.12.4`, all exact-pinned with `Cargo.lock` and `package-lock.json`). It contains no game logic: it opens one WebView2 window on `packages/radio-ui/dist`, built with `vite build --mode tauri` (that mode omits the service worker, which the shell does not need). Trust boundary: no plugins, no IPC commands, no capabilities file, no shell/fs/http access, no remote URL; the CSP in `tauri.conf.json` allows only the app's own origin. The NSIS installer is per-user (`currentUser`, no elevation) and embeds the WebView2 bootstrapper.

Build: `.github/workflows/desktop-windows.yml` (`windows-latest`) installs from lockfiles, typechecks and tests radio-ui, runs `tauri build -- --locked` (invoked via `node node_modules/@tauri-apps/cli/tauri.js`, because `npx` swallows the `--` separator), records a SHA-256 and uploads the unsigned `.exe` as a 14-day artifact. Nothing is published or released; `VERSION` is unchanged.

Web: `vercel.json` at the repository root builds radio-ui, then `packages/site/build.mjs` assembles `packages/site/dist`: a static landing and download page at `/` (pixel-art, no script, no external resources) and the game at `/play/` (`trailingSlash: true` keeps its relative asset URLs; service worker scope `/play/`). It serves that directory and adds CSP, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, COOP, a restrictive `Permissions-Policy`, `no-cache` for `sw.js` and immutable caching for hashed `/assets/`. No environment variables or secrets.

Verified on Linux: `cargo check`, `tauri build --no-bundle` (3.4 MB release binary) and a run under Xvfb that rendered the full radio room from the bundle. **Not verified:** the Windows NSIS build and a launch on real Windows/WebView2 (first proof is the CI job), SmartScreen behaviour, installer uninstall flow.

## Main menu (`packages/radio-ui/src/menu`)

`main.ts` decides how a watch starts: `?seed=N` (tests, shared links) resumes a matching save or starts that seed; `?play=new|continue` skip the menu (play again); otherwise `mountMenu()` returns the player's choice (`continue`, or `new` with an optional seed). Pure logic lives in `menu/model.ts` (items, arrow navigation that skips a disabled Continue, u32 seed parsing, a description of the save limited to seed and elapsed time) and `menu/settings.ts` (field-wise validated settings under `uboat-radio.settings.v1`, 4 KB cap, never part of the save). The settings feed `AudioEngine.setMix` (master gain plus separate Morse and hydrophone buses) and a `reduce-motion` class plus `flags.reduceMotion` for the JS decor. The in-game Menu button calls `Controller.openMenu()` (save, then reload at the bare path). Art (`tools/art/menu.ts`) is original TEMPORARY placeholder work. Found and fixed on the way: `parseSave` rejected every seed above 1,000,000 although seeds are u32, so real saves could not be restored.

## Paperwork desk (`packages/radio-ui/src/desk`)

The default UI since desk-ui Stage 5 (D7). It is presentation only: it reads the P5 store, reuses the P5 boat cutaway, drawers and emergency panel, and sends every decision through `ctx.actions`. `packages/sim-core` is untouched (D1); `git diff main -- packages/sim-core` is empty for the whole feature.

| Module | Role |
|---|---|
| `index.ts` | `mountDesk()`: frame, stations (printer, Echo stamper, machine preview, ship panel), event wiring, restore |
| `papers.ts` | `PaperModel`: sheets (Mission, Input/Output per message and attempt, Daily Orders, Manual), position/z/face/place/clip/stamps/signed/decode; `desk.v1` (de)serialization |
| `sheets.ts` | sheet rendering, group grid, flip button |
| `printer.ts` | token-by-token Input printing from received copy |
| `echo.ts` | `EchoPress`: at most one `resolve` per message; the TRUE/FALSE ECHO mark is rebuilt from `rx.resolved` (the sim log), never from `desk.v1` |
| `rules.ts` | G1 hand-over rules (Input = Echo + signature, no ordinary stamp; Output = one red stamp; trash refuses mission papers); violations are listed, not penalised before G3 |
| `docs.ts` | Daily Orders (6 pages, incl. the "Obscura Setup" day key from `dayEnigma`) and Manual (7 pages), en/vi |
| `machine.ts` | G2 cipher machine (pure): `replayCopy` (windows/lamp from day key + dialled letters + copy, same group-resync rules as `decipherCopy`), `DeskMachine` (power, rotor cover interlock, wheel setting) |
| `ration.ts` | G2 Ration score: +1/-1 per key against the printed Input, once per position, one-off step bonuses, validated storage |
| `dialogue.ts` | crew portraits' lines per event, en/vi, chosen with the cosmetic RNG (never reveals whether a decision was right, D4) |

**Storage.** `uboat-radio.desk.v1`: `{v:1, seed, papers:[...]}`, 32 KB / 400-paper cap, field-wise validated (ids by allowlist regex, bounded ints, decode strings allowlisted `[A-Z0-9?]`); an invalid or seed-mismatched blob is dropped. It holds layout, plus (G2) the machine switches/dialled letters (`mach`) and the Ration score (`ration`) as optional validated fields; none of it enters the save or the event log. Save/load of the watch stays seed + event log; reload rebuilds the desk silently and does not replay old dialogue.

**Actions used.** `resolve`, `repeat`, `setMode`, `steerSpeed`, `toggleSilence`, `report`, `openAuthTable`, `openDrawer`. No new sim command was added. G2 adds two presentation hooks (`Ctx.hooks.typingGate`, `decodeSetting`, `denied`): with the machine off or the cover open the controller drops typing and Enter; decode runs `Watch.decipher(dialledLetters, copy)` instead of using the sent indicator, so a wrong setting silently yields wrong text. The optional per-message 2-minute timer is a Settings flag (`timer`) and is an indicator only until G3.

**i18n and fonts.** Strings in `src/i18n/{en,vi}.ts` (`?lang=` allowlisted, otherwise Settings). Silkscreen has no Vietnamese glyphs, so `:lang(vi)` switches labels to VT323 one step larger.

**Running.** `cd packages/radio-ui && npm run dev` (or `npm run serve`). The desk is the default; `?ui=p5` and `?ui=classic` still win, and Settings stores `desk | p5 | classic` (a previously saved `p5` is kept). Useful test URL: `?seed=12&speed=60&lang=vi`.

**Rollback.** Revert the default in `defaultSettings().ui` (`menu/settings.ts`) to `"p5"`, or ship with `?ui=p5`; `desk.v1` is a separate key and can be deleted without affecting the save.
