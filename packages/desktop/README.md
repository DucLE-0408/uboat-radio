# @uboat/desktop — Windows installer for U-Boat Radio Operator (Tauri 2)

A thin Tauri shell around the `packages/radio-ui` static bundle. Offline, per-user install (no admin rights), no network access.

## Get the installer

CI builds it: GitHub Actions → **Desktop installer (Windows)** → run → artifact `uboat-radio-windows-installer-<sha>` (contains the `.exe` and `SHA256SUMS.txt`). The installer is **unsigned**: Windows SmartScreen shows "Unknown publisher" → *More info* → *Run anyway*. Check the hash first: `Get-FileHash .\*.exe -Algorithm SHA256`.

## Build locally (Windows, Node >= 22.12, Rust stable, WebView2)

```bash
npm ci --prefix ../radio-ui --ignore-scripts
npm ci --ignore-scripts
node node_modules/@tauri-apps/cli/tauri.js build -- --locked   # installer: src-tauri/target/release/bundle/nsis/*.exe
```

Run without bundling: `npx tauri build --no-bundle`. On Linux you additionally need `libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libxdo-dev`.

## Security posture

No Tauri plugins, no commands, no capabilities, no remote URL; CSP limited to the app origin. Dependencies are exact-pinned (`Cargo.lock`, `package-lock.json`). The NSIS toolchain is downloaded by the Tauri bundler at build time.

## Known limits

Icons are generated placeholders (same as the PWA). No code signing, no auto-update, Windows only. A Windows launch is verified only by the CI build, not by this repository's tests.
