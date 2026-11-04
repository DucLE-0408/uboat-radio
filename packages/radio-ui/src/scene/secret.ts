import type { Ctx } from "../ctx";
import { setClass, setText } from "../dom";
import { paint, place, u } from "./px";

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };

/** SECRET paper: the operator's own transcription, grouped by Space. Groups with != 4 letters are marked. */
export function mountSecret(ctx: Ctx, root: HTMLElement): void {
  const { store } = ctx;
  const sec = mk("section", "sc secret"); sec.setAttribute("aria-label", "Transcription paper"); place(sec, 148, 242, 268, 110); paint(sec, "secret-paper");
  const ttl = mk("div", "ttl lbl"); ttl.textContent = "Secret"; ttl.style.left = u(10); ttl.style.top = u(8);
  const st = mk("div", "st lbl"); st.style.left = u(10); st.style.top = u(97);
  const grps = mk("div", "grps"); place(grps, 10, 22, 248, 72);
  grps.setAttribute("role", "textbox"); grps.setAttribute("aria-readonly", "true"); grps.setAttribute("aria-label", "Your transcription of the signal");
  sec.append(ttl, st, grps);
  const spans: HTMLElement[] = [];

  const refresh = (): void => {
    const s = store.state;
    const text = s.activeRx === null ? "" : store.copyText(s.activeRx, s.activeAttempt);
    const words = text.length === 0 ? [] : text.split(" ");
    const typing = !text.endsWith(" ");
    const last = words.length - 1;
    const n = Math.max(words.length, 1);
    while (spans.length < n) { const sp = mk("span", "sgrp"); spans.push(sp); grps.append(sp); }
    while (spans.length > n) (spans.pop() as HTMLElement).remove();
    for (let i = 0; i < n; i++) {
      const w = words[i] ?? "", sp = spans[i] as HTMLElement;
      const isCheck = i === last && w.length === 1 && /[A-Z]/.test(w) && words.length > 1;
      setText(sp, w);
      setClass(sp, "bad", w.length > 0 && w.length !== 4 && !isCheck && !(i === last && typing));
      setClass(sp, "check", isCheck);
      setClass(sp, "cur", i === n - 1 && (typing || words.length === 0));
    }
    const full = words.filter((w) => w.length === 4).length;
    setText(st, s.activeRx === null ? "No signal yet" : `${full} grp · ? unreadable · last = check`);
  };
  store.on(["copy", "rx"], refresh);
  refresh();
  root.append(sec);
}
