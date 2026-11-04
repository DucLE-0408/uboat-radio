# @uboat/radio-ui — U-Boat Radio Operator (browser app)

Plain TypeScript + DOM + Web Audio, bundled with Vite. The simulation lives in `../sim-core` and is imported only through its barrel.

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
- A native `.exe`/`.msi` installer (Electron or Tauri) is not part of this package.

## Desktop installer and hosting

A Windows `.exe` is built from this bundle by `packages/desktop` (Tauri; see its README). The web build is hosted via the root `vercel.json`.

## Assets

All sprites and icons are generated placeholders (`node tools/art/generate.ts`) listed with origin, licence and hashes in `assets/manifest.json`; fonts are SIL OFL-1.1 (`assets/fonts`).
