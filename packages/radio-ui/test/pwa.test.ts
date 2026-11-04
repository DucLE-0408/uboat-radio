import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { buildServiceWorker, cacheVersion, precacheFiles } from "../tools/pwa/sw-template.ts";
import { swSupport } from "../src/pwa";
import { Diag } from "../src/diag";

const text = (p: string): string => readFileSync(p, "utf8");

describe("service worker generator", () => {
  const files = ["assets/index-abc.js", "assets/index-abc.js.map", "assets/x.css", "index.html", "sw.js", "manifest.webmanifest", "assets/x.css"];

  it("precaches the app shell only: no source maps, no worker itself, no duplicates", () => {
    expect(precacheFiles(files)).toEqual(["assets/index-abc.js", "assets/x.css", "index.html", "manifest.webmanifest"]);
  });

  it("cache version changes with the file list or the HTML shell and is stable otherwise", () => {
    const a = cacheVersion("a\nb"), b = cacheVersion("a\nb"), c = cacheVersion("a\nc");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(buildServiceWorker(files, "<html>1</html>")).not.toBe(buildServiceWorker(files, "<html>2</html>"));
    expect(buildServiceWorker(files, "<html>1</html>")).toBe(buildServiceWorker([...files].reverse(), "<html>1</html>"));
  });

  it("emits valid JavaScript that lists every file relatively and keeps the safe fetch policy", () => {
    const src = buildServiceWorker(files, "<html></html>");
    expect(() => new Function(src)).not.toThrow();
    for (const f of precacheFiles(files)) expect(src).toContain(`"./${f}"`);
    expect(src).toContain('"./"');
    expect(src).not.toContain(".js.map");
    expect(src).not.toContain("skipWaiting");                     // a running game is never swapped under the player
    expect(src).toContain('req.method !== "GET"');                 // only reads are cached
    expect(src).toContain("self.location.origin");                 // cross-origin traffic is never touched
    expect(src).toContain("clients.claim");
    expect(src).toContain("ignoreVary: true");                    // CORS module requests with Vary: Origin must still hit the cache
  });
});

describe("web app manifest", () => {
  const m = JSON.parse(text("public/manifest.webmanifest")) as Record<string, unknown> & { icons: { src: string; sizes: string; type: string; purpose: string }[] };

  it("has what browsers need to offer installation", () => {
    for (const k of ["name", "short_name", "start_url", "scope", "display", "icons", "background_color", "theme_color"]) expect(m[k], k).toBeDefined();
    expect(m["display"]).toBe("standalone");
    expect(String(m["start_url"]).startsWith("/")).toBe(false);   // relative: works from any folder
    expect(String(m["scope"]).startsWith("/")).toBe(false);
    expect(m["theme_color"]).toBe("#14122b");
  });

  it("ships 192 and 512 icons plus a maskable one, and every file exists with the declared size", () => {
    const sizes = new Set(m.icons.map((i) => `${i.sizes}:${i.purpose}`));
    expect(sizes.has("192x192:any")).toBe(true);
    expect(sizes.has("512x512:any")).toBe(true);
    expect(sizes.has("512x512:maskable")).toBe(true);
    for (const i of m.icons) {
      const f = `public/${i.src}`;
      expect(existsSync(f), f).toBe(true);
      const b = readFileSync(f);
      const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      expect(`${dv.getUint32(16)}x${dv.getUint32(20)}`, f).toBe(i.sizes);
      expect(i.type).toBe("image/png");
    }
  });

  it("the HTML shell links the manifest, theme colour and a CSP that allows only same-origin worker and manifest", () => {
    const html = text("index.html");
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain("worker-src 'self'");
    expect(html).toContain("manifest-src 'self'");
    expect(html).not.toMatch(/https?:\/\//);                       // no external hosts anywhere in the shell
  });
});

describe("service worker registration policy", () => {
  it("registers only in a secure production build with the API available", () => {
    expect(swSupport({ hasApi: true, secure: true, prod: true })).toBe("ok");
    expect(swSupport({ hasApi: true, secure: true, prod: false })).toBe("dev");
    expect(swSupport({ hasApi: true, secure: false, prod: true })).toBe("insecure");
    expect(swSupport({ hasApi: false, secure: true, prod: true })).toBe("unsupported");
  });
  it("diagnostics accept the pwa kind with short codes only", () => {
    const d = new Diag("x");
    d.err("pwa", "SW_REGISTER_FAILED"); d.err("pwa", "Failed to register a ServiceWorker for scope");
    expect(d.snapshot().errors.pwa).toEqual(["SW_REGISTER_FAILED", "INVALID_CODE"]);
  });
});
