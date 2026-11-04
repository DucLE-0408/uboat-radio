// Offline/installable app support. Vietnamese: chỉ đăng ký service worker ở bản build (production) và trên origin an toàn (https hoặc localhost).
import type { Diag } from "./diag";

export type SwSupport = "unsupported" | "insecure" | "dev" | "ok";

/** Pure decision so it can be tested without a browser. */
export function swSupport(env: { hasApi: boolean; secure: boolean; prod: boolean }): SwSupport {
  if (!env.hasApi) return "unsupported";
  if (!env.secure) return "insecure";
  if (!env.prod) return "dev"; // the dev server serves unbundled modules: never cache them
  return "ok";
}

export function registerServiceWorker(diag: Diag, prod: boolean, onUpdateReady: () => void = () => {}): void {
  const s = swSupport({ hasApi: "serviceWorker" in navigator, secure: window.isSecureContext, prod });
  if (s !== "ok") { if (s === "insecure") diag.err("pwa", "SW_INSECURE_CONTEXT"); return; }
  const go = (): void => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      // A newer build was downloaded while this one runs. It takes over the next time the app is opened (no mid-game swap).
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) onUpdateReady(); });
      });
    }).catch(() => diag.err("pwa", "SW_REGISTER_FAILED"));
  };
  if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
}
