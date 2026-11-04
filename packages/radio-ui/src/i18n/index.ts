// Tiny i18n: pure lookup with {name} placeholders. The language is UI state only (Settings / ?lang=), never part of the save.
import { en, type MsgKey } from "./en";
import { vi } from "./vi";

export type Lang = "en" | "vi";
export type { MsgKey };
export const LANGS: readonly Lang[] = ["en", "vi"];

const TABLES: Readonly<Record<Lang, Readonly<Record<MsgKey, string>>>> = { en, vi };

/** Allowlist parse for untrusted input (URL, storage). */
export function parseLang(x: unknown): Lang | null {
  return x === "en" || x === "vi" ? x : null;
}

/** Look up `key` in `lang`, falling back to English, then substitute {name} placeholders. */
export function translate(lang: Lang, key: MsgKey, vars?: Readonly<Record<string, string | number>>): string {
  const s = TABLES[lang][key] ?? en[key];
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

let current: Lang = "en";
export const getLang = (): Lang => current;
/** Sets the active language and the document language (fonts switch on :lang(vi)). */
export function setLang(lang: Lang): void {
  current = lang;
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}
export const t = (key: MsgKey, vars?: Readonly<Record<string, string | number>>): string => translate(current, key, vars);
export const tableOf = (lang: Lang): Readonly<Record<MsgKey, string>> => TABLES[lang];
