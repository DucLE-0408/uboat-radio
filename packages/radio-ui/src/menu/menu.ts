// Main menu: shown before the watch starts. It never touches the Watch; it only returns what the player chose.
import { h } from "../dom";
import { LANGS, translate, type Lang } from "../i18n";
import { sprite } from "../scene/assets";
import type { StorageLike } from "../sim/session";
import { describeSave, formatElapsed, initialSelection, menuItems, parseSeedInput, stepSelection, type MenuId, type MenuItem } from "./model";
import type { Settings } from "./settings";
import "./menu.css";

export type MenuChoice = { readonly kind: "continue" } | { readonly kind: "new"; readonly seed: number | null };

export interface MenuDeps {
  readonly storage: StorageLike | null;
  readonly settings: Settings;
  /** Called on every settings change; the caller applies and persists it. */
  readonly onSettings: (s: Settings) => void;
  readonly unlockAudio: () => void;
  readonly keys: readonly string[];
}

const TIPS = [
  "Every forged message carries a tell you can verify. Check before you accept.",
  "Long transmissions get you direction-found. Silence is also an order.",
  "Press Esc to pause. Your watch is saved after every order.",
  "Challenge first, then check the answer against the day table.",
  "Copy what you hear: Space ends a group, / marks a letter you could not read.",
];
const STEPS: readonly [string, string][] = [
  ["Copy", "Listen to the Morse and type it. Noise hides letters; ask for a repeat."],
  ["Decode", "Use the day's key settings to decipher the Enigma message and read it."],
  ["Authenticate", "Challenge the sender and check the reply. A forged message always has one tell you can verify."],
  ["Decide", "Accept or reject. Transmitting a lot gets you direction-found, so silence is a move too."],
];

const ICON_FRAME: Record<MenuId, number> = { continue: 0, new: 1, settings: 2, help: 3 };
const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** Integer scale for the 128x180 panel: nearest-neighbour art stays crisp. */
export function menuScale(vw: number, vh: number): number {
  return Math.min(4, Math.max(2, Math.floor(Math.min(vw / 150, vh / 200))));
}

export function mountMenu(app: HTMLElement, deps: MenuDeps): Promise<MenuChoice> {
  return new Promise((resolve) => {
    let settings = deps.settings;
    const save = describeSave(deps.storage);
    const items = menuItems(save !== null);
    let page: "none" | "settings" | "help" | "new" = "none";
    let opener: HTMLElement | null = null;

    const root = h("div", { class: "menu", attrs: { role: "main", "aria-label": "Main menu" } });
    const setVar = (k: string, id: string): void => { root.style.setProperty(k, `url("${sprite(id).url}")`); };
    setVar("--m-bg", "menu-bg"); setVar("--m-panel", "menu-panel"); setVar("--m-plate", "menu-plate"); setVar("--m-plate-sel", "menu-plate-sel"); setVar("--m-icons", "menu-icons"); setVar("--m-letter", "menu-letter");
    const fit = (): void => { root.style.setProperty("--mpx", String(menuScale(window.innerWidth, window.innerHeight))); };
    fit();

    const bg = h("div", { class: "menu-bg", attrs: { "aria-hidden": "true" } });
    const title = h("h1", { class: "menu-title", text: "U-Boat Radio Operator" });
    const buttons = new Map<MenuId, HTMLButtonElement>();
    const nav = h("nav", { class: "menu-panel", attrs: { "aria-label": "Game menu" } });
    items.forEach((it: MenuItem, i: number) => {
      const b = h("button", { class: `menu-btn mb-${it.id}`, attrs: { type: "button", "data-id": it.id } });
      b.style.setProperty("--i", String(i));
      if (it.id === "continue") b.disabled = !it.enabled;
      b.append(h("span", { class: "mi", attrs: { "aria-hidden": "true" } }), h("span", { class: "ml", text: it.label }));
      b.style.setProperty("--f", String(ICON_FRAME[it.id]));
      if (it.id === "continue") {
        b.setAttribute("aria-describedby", "menu-save");
        if (!it.enabled) b.title = "No saved watch yet";
      }
      b.addEventListener("click", () => activate(it.id, b));
      buttons.set(it.id, b); nav.append(b);
    });
    const saveNote = h("p", { class: "menu-save", attrs: { id: "menu-save" }, text: save === null ? "No saved watch." : `Saved watch: ${formatElapsed(save.tickSec)} into the night, seed ${save.seed}.` });
    const letter = h("button", { class: "menu-letter", attrs: { type: "button", "aria-label": "Help: how to play" }, on: { click: () => activate("help", letter) } });
    const ticker = h("p", { class: "menu-ticker", attrs: { "aria-hidden": "true" }, text: TIPS[0] ?? "" });
    const card = h("section", { class: "menu-card", attrs: { role: "dialog", "aria-modal": "true" } });
    card.hidden = true;
    root.append(bg, title, nav, saveNote, letter, ticker, card);
    app.append(root);

    let tipI = 0;
    const tipTimer = window.setInterval(() => { tipI = (tipI + 1) % TIPS.length; ticker.textContent = TIPS[tipI] ?? ""; }, 7000);
    let sel = initialSelection(items);
    const focusSel = (): void => { (buttons.get((items[sel] as MenuItem).id) as HTMLButtonElement).focus(); };

    const finish = (c: MenuChoice): void => {
      window.clearInterval(tipTimer);
      window.removeEventListener("resize", fit);
      document.removeEventListener("keydown", onKey, true);
      root.remove();
      resolve(c);
    };

    const closePage = (): void => {
      if (page === "none") return;
      page = "none"; card.hidden = true; card.replaceChildren();
      nav.removeAttribute("inert"); letter.removeAttribute("inert");
      (opener ?? buttons.get("new"))?.focus();
    };
    const openPage = (p: "settings" | "help" | "new", from: HTMLElement): void => {
      page = p; opener = from;
      nav.setAttribute("inert", ""); letter.setAttribute("inert", "");
      card.hidden = false;
      const first = p === "settings" ? buildSettings() : p === "help" ? buildHelp() : buildNew();
      first.focus();
    };
    const back = (): HTMLButtonElement => h("button", { class: "menu-act", attrs: { type: "button" }, text: "Back", on: { click: closePage } });

    function activate(id: MenuId, from: HTMLElement): void {
      deps.unlockAudio();
      if (id === "continue") { if (save !== null) finish({ kind: "continue" }); return; }
      openPage(id, from);
    }

    function buildHelp(): HTMLElement {
      card.setAttribute("aria-labelledby", "mc-title");
      const b = back();
      card.replaceChildren(
        h("h2", { attrs: { id: "mc-title" }, text: "How to play" }),
        h("ol", { class: "mc-steps" }, ...STEPS.map(([k, v]) => h("li", {}, h("strong", { text: `${k}. ` }), v))),
        h("h3", { text: "Keys" }),
        h("ul", { class: "mc-keys" }, ...deps.keys.map((k) => h("li", { text: k }))),
        h("div", { class: "mc-row" }, b),
      );
      return b;
    }

    function buildNew(): HTMLElement {
      card.setAttribute("aria-labelledby", "mc-title");
      const input = h("input", { class: "mc-input", attrs: { id: "mc-seed", type: "text", inputmode: "numeric", maxlength: "10", autocomplete: "off", spellcheck: "false", "aria-describedby": "mc-seed-hint mc-err" } });
      const err = h("p", { class: "mc-err", attrs: { id: "mc-err", role: "alert" } });
      const start = h("button", { class: "menu-act primary", attrs: { type: "button" }, text: "Start the watch", on: { click: go } });
      function go(): void {
        const r = parseSeedInput(input.value);
        if (!r.ok) { err.textContent = "The seed must be a whole number from 0 to 4294967295, or empty for a random one."; input.setAttribute("aria-invalid", "true"); input.focus(); return; }
        finish({ kind: "new", seed: r.seed });
      }
      input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); go(); } });
      card.replaceChildren(
        h("h2", { attrs: { id: "mc-title" }, text: "New game" }),
        ...(save === null ? [] : [h("p", { class: "mc-warn", text: `Starting a new game replaces your saved watch (seed ${save.seed}, ${formatElapsed(save.tickSec)}).` })]),
        h("label", { attrs: { for: "mc-seed" }, text: "Seed (optional)" }), input,
        h("p", { class: "mc-hint", attrs: { id: "mc-seed-hint" }, text: "The same seed gives the same night. Leave it empty for a random one." }),
        err, h("div", { class: "mc-row" }, start, back()),
      );
      return input;
    }

    function buildSettings(): HTMLElement {
      card.setAttribute("aria-labelledby", "mc-title");
      const apply = (next: Settings): void => { settings = next; deps.onSettings(next); };
      const slider = (id: string, label: string, key: "master" | "morse" | "hydro"): HTMLElement => {
        const out = h("output", { class: "mc-val", attrs: { for: id }, text: pct(settings[key]) });
        const inp = h("input", { attrs: { id, type: "range", min: "0", max: "1", step: "0.05", value: String(settings[key]) } });
        inp.addEventListener("input", () => { const v = Number(inp.value); out.textContent = pct(v); apply({ ...settings, [key]: v }); });
        return h("div", { class: "mc-field" }, h("label", { attrs: { for: id }, text: label }), inp, out);
      };
      const check = (id: string, label: string, key: "sound" | "reduceMotion"): HTMLElement => {
        const inp = h("input", { attrs: { id, type: "checkbox" } });
        inp.checked = settings[key];
        inp.addEventListener("change", () => apply({ ...settings, [key]: inp.checked }));
        return h("div", { class: "mc-field mc-check" }, inp, h("label", { attrs: { for: id }, text: label }));
      };
      const radio = (value: Settings["ui"], label: string): HTMLElement => {
        const inp = h("input", { attrs: { id: `mc-ui-${value}`, type: "radio", name: "mc-ui", value } });
        inp.checked = settings.ui === value;
        inp.addEventListener("change", () => { if (inp.checked) apply({ ...settings, ui: value }); });
        return h("div", { class: "mc-field mc-check" }, inp, h("label", { attrs: { for: `mc-ui-${value}` }, text: label }));
      };
      const langRadio = (value: Lang): HTMLElement => {
        const inp = h("input", { attrs: { id: `mc-lang-${value}`, type: "radio", name: "mc-lang", value } });
        inp.checked = settings.lang === value;
        inp.addEventListener("change", () => { if (inp.checked) apply({ ...settings, lang: value }); });
        return h("div", { class: "mc-field mc-check" }, inp, h("label", { attrs: { for: `mc-lang-${value}`, lang: value }, text: translate(value, "lang.name") }));
      };
      const first = slider("mc-master", "Master volume", "master");
      const b = back();
      card.replaceChildren(
        h("h2", { attrs: { id: "mc-title" }, text: "Settings" }),
        first, slider("mc-morse", "Morse and static", "morse"), slider("mc-hydro", "Hydrophone", "hydro"),
        check("mc-sound", "Sound on", "sound"), check("mc-motion", "Reduce motion", "reduceMotion"),
        h("fieldset", { class: "mc-set" }, h("legend", { text: "Interface (next watch)" }), radio("p5", "Pixel-art radio room"), radio("desk", translate(settings.lang, "settings.ui.desk")), radio("classic", "Classic panels")),
        h("fieldset", { class: "mc-set" }, h("legend", { text: `${translate("en", "settings.language")} / ${translate("vi", "settings.language")}` }), ...LANGS.map(langRadio)),
        h("p", { class: "mc-hint", text: "Saved in this browser only." }),
        h("div", { class: "mc-row" }, b),
      );
      return first.querySelector("input") as HTMLElement;
    }

    function onKey(ev: KeyboardEvent): void {
      deps.unlockAudio();
      if (ev.key === "Escape") { if (page !== "none") { ev.preventDefault(); ev.stopPropagation(); closePage(); } return; }
      if (page !== "none") {
        if (ev.key === "Tab") { // keep focus inside the dialog
          const f = [...card.querySelectorAll<HTMLElement>("button, input, select")].filter((e) => !(e as HTMLButtonElement).disabled);
          const first = f[0], last = f[f.length - 1];
          if (first && last) {
            if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
            else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
          }
        }
        return;
      }
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        const cur = items.findIndex((i) => buttons.get(i.id) === document.activeElement);
        if (cur >= 0) sel = cur;
        sel = stepSelection(items, sel, ev.key === "ArrowDown" ? 1 : -1);
        focusSel();
      }
    }
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", fit);
    root.addEventListener("pointerdown", () => deps.unlockAudio());
    focusSel();
  });
}
