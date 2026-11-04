import { setClass, setText } from "../dom";
import { paint, place, sliceVars, u } from "./px";
import type { SceneCtx } from "./scope";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };
const reducedMotion = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * SECRET paper: your own transcription (COPY) or the deciphered text (PLAIN), same 6-column group grid.
 * Marked groups = YOUR copy group had != 4 letters (derived from the copy; the sim only reports a count).
 */
export function mountSecret(ctx: SceneCtx, root: HTMLElement): { frame(now: number): void } {
  const { store, reveal, actions } = ctx;
  const sec = mk("section", "sc secret"); sec.setAttribute("aria-label", "Transcription paper"); place(sec, 148, 242, 268, 110); paint(sec, "secret-paper");
  const ttl = mk("div", "ttl lbl"); ttl.textContent = "Secret"; ttl.style.left = u(10); ttl.style.top = u(8);
  const toggle = mk("button", "sbtn"); toggle.type = "button"; place(toggle, 56, 4, 60, 15); sliceVars(toggle, "btn");
  toggle.addEventListener("click", () => actions.showView(store.state.view === "copy" ? "plain" : "copy"));
  const st = mk("div", "st lbl"); st.style.left = u(10); st.style.top = u(97);
  const grps = mk("div", "grps"); place(grps, 10, 22, 248, 72);
  grps.setAttribute("role", "textbox"); grps.setAttribute("aria-readonly", "true");
  sec.append(ttl, toggle, st, grps);
  const spans: HTMLElement[] = [];
  let lastSeq = store.state.decodeSeq;

  const render = (now: number): void => {
    const s = store.state, rx = store.activeView();
    const a = rx?.analysis.get(s.activeAttempt);
    const plain = s.view === "plain" && !!a;
    toggle.disabled = !a;
    setText(toggle, plain ? "Plain" : "Copy");
    toggle.setAttribute("aria-label", plain ? "Showing deciphered text. Switch to your copy" : a ? "Showing your copy. Switch to deciphered text" : "Decode your copy first to see the deciphered text");
    grps.setAttribute("aria-label", plain ? "Deciphered text" : "Your transcription of the signal");
    let words: { text: string; bad: boolean; check: boolean; cur: boolean }[];
    if (plain && a) {
      let left = reveal.shown(now);
      words = a.words.map((w) => { const t = w.plain.slice(0, Math.max(0, Math.min(w.plain.length, left))); left -= w.plain.length; return { text: t, bad: !w.ok, check: false, cur: false }; });
    } else {
      const text = s.activeRx === null ? "" : store.copyText(s.activeRx, s.activeAttempt);
      const ws = text.length === 0 ? [] : text.split(" ");
      const typing = !text.endsWith(" "), last = ws.length - 1;
      words = ws.map((w, i) => {
        const isCheck = i === last && w.length === 1 && /[A-Z]/.test(w) && ws.length > 1;
        return { text: w, bad: w.length > 0 && w.length !== 4 && !isCheck && !(i === last && typing), check: isCheck, cur: i === last && typing };
      });
      if (words.length === 0) words = [{ text: "", bad: false, check: false, cur: true }];
    }
    while (spans.length < words.length) { const sp = mk("span", "sgrp"); spans.push(sp); grps.append(sp); }
    while (spans.length > words.length) (spans.pop() as HTMLElement).remove();
    words.forEach((w, i) => { const sp = spans[i] as HTMLElement; setText(sp, w.text); setClass(sp, "bad", w.bad); setClass(sp, "check", w.check); setClass(sp, "cur", w.cur); });
    if (plain && a) setText(st, `${a.damagedGroups} damaged (sim) · wavy = your group not 4`);
    else setText(st, s.activeRx === null ? "No signal yet" : `${words.filter((w) => w.text.length === 4).length} grp · ? unreadable · last = check`);
  };

  const onChange = (): void => {
    const s = store.state, a = store.activeView()?.analysis.get(s.activeAttempt);
    if (s.decodeSeq !== lastSeq) {
      lastSeq = s.decodeSeq;
      reveal.start(a ? a.words.reduce((n, w) => n + w.plain.length, 0) : 0, performance.now(), reducedMotion());
    } else if (a) reveal.setTotal(a.words.reduce((n, w) => n + w.plain.length, 0));
    render(performance.now());
  };
  ctx.scope.on(["copy", "rx", "view", "analysis"], onChange);
  render(performance.now());
  root.append(sec);
  return { frame: (now) => { if (reveal.isRunning(now) && store.state.view === "plain") render(now); } };
}
