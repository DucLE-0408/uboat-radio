// Assembles the hosted site: landing page at /, the radio-ui build at /play/. Node built-ins only, no dependency.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ui = join(here, "..", "radio-ui");
const out = join(here, "dist");

if (!existsSync(join(ui, "dist", "index.html"))) {
  console.error("radio-ui is not built: run `npm run build --prefix packages/radio-ui` first");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets"), { recursive: true });
cpSync(join(here, "public"), out, { recursive: true });
cpSync(join(ui, "dist"), join(out, "play"), { recursive: true }); // relative base: runs from any sub-path
// Landing art and fonts come from the game's own assets so both share one palette and typeface.
for (const f of ["banner-sea", "banner-boat", "banner-water", "banner-frame"]) cpSync(join(ui, "assets", "sprites", `${f}.png`), join(out, "assets", `${f}.png`));
for (const f of ["silkscreen-latin-400-normal", "vt323-latin-400-normal"]) cpSync(join(ui, "assets", "fonts", `${f}.woff2`), join(out, "assets", `${f}.woff2`));
cpSync(join(ui, "public", "icons", "icon-192.png"), join(out, "assets", "icon-192.png"));
console.log(`site assembled in ${out}`);
