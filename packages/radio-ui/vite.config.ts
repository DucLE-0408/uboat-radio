import { defineConfig } from "vitest/config";

// Vietnamese: sim-core chưa publish; alias trỏ thẳng vào barrel index.ts để UI chỉ import qua một cổng duy nhất.
// Không dùng node:url để khỏi cần @types/node (không thêm dependency ngoài vite@8.3.5).
const barrel = decodeURIComponent(new URL("../sim-core/src/index.ts", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");

export default defineConfig({
  resolve: { alias: { "@uboat/sim-core": barrel } },
  // Bind loopback by default (AGENTS.md s7); no proxy, no external hosts.
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: { target: "es2022", sourcemap: true },
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
