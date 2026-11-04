// Tiny DOM helpers. All dynamic text goes through textContent only => no HTML-injection path.
type Child = Node | string | null;
interface Props {
  readonly class?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly on?: Readonly<Record<string, (e: Event) => void>>;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  if (props.on) for (const [k, fn] of Object.entries(props.on)) el.addEventListener(k, fn);
  for (const k of kids) if (k !== null) el.append(k);
  return el;
}

/** Touch the DOM only when the value really changed (R9.1). */
export function setText(el: Element, s: string): void { if (el.textContent !== s) el.textContent = s; }
export function setClass(el: Element, c: string, on: boolean): void { if (el.classList.contains(c) !== on) el.classList.toggle(c, on); }
export function setAttr(el: Element, k: string, v: string): void { if (el.getAttribute(k) !== v) el.setAttribute(k, v); }

export function panel(cls: string, title: string, ...kids: Child[]): HTMLElement {
  return h("section", { class: `panel ${cls}`, attrs: { "aria-label": title } }, h("h2", { text: title }), ...kids);
}

export function button(label: string, hint: string, onClick: () => void, cls = ""): HTMLButtonElement {
  const b = h("button", { class: `btn ${cls}`.trim(), attrs: { type: "button" }, on: { click: () => onClick() } },
    h("span", { text: label }), hint ? h("kbd", { text: hint }) : null);
  return b;
}
