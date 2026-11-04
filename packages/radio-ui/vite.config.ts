import { readdirSync, statSync } from "node:fs";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { buildServiceWorker } from "./tools/pwa/sw-template.ts";

// Vietnamese: sim-core chưa publish; alias trỏ thẳng vào barrel index.ts để UI chỉ import qua một cổng duy nhất.
// Không dùng node:url để khỏi cần @types/node (không thêm dependency ngoài vite@8.3.5).
const barrel = decodeURIComponent(new URL("../sim-core/src/index.ts", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");

/**
 * Emits sw.js at build time: it precaches every built file plus everything copied from public/ (manifest, icons), so the
 * installed app runs offline. Runs after Vite's own plugins (enforce: "post") so index.html is already in the bundle.
 */
function offlineServiceWorker(): Plugin {
  let publicDir = "";
  return {
    name: "uboat-offline-sw",
    apply: "build",
    enforce: "post",
    configResolved(c) { publicDir = c.publicDir; },
    generateBundle(_opts, bundle) {
      const files = new Set(Object.keys(bundle));
      if (publicDir !== "") {
        try { for (const f of readdirSync(publicDir, { recursive: true })) if (statSync(`${publicDir}/${f}`).isFile()) files.add(String(f).replaceAll("\\", "/")); } catch { /* no public dir */ }
      }
      const html = bundle["index.html"];
      const source = html && html.type === "asset" ? String(html.source) : "";
      this.emitFile({ type: "asset", fileName: "sw.js", source: buildServiceWorker([...files], source) });
    },
  };
}

export default defineConfig({
  base: "./", // relative URLs: the build runs from any folder or sub-path (installed app, static host, preview)
  plugins: [offlineServiceWorker()],
  resolve: { alias: { "@uboat/sim-core": barrel } },
  // Bind loopback by default (AGENTS.md s7); no proxy, no external hosts.
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: { target: "es2022", sourcemap: true },
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
