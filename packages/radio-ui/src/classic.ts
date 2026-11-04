// Classic (P4) panel UI, kept behind the default until P5 is verified (user decision).
import { h } from "./dom";
import type { Ctx, Panel } from "./ctx";
import { HELP } from "./input/keymap";
import { mountAuthTable } from "./panels/authTable";
import { mountBridge } from "./panels/bridge";
import { mountCopy } from "./panels/copy";
import { mountEnigma } from "./panels/enigma";
import { mountLog } from "./panels/log";
import { mountReceiver } from "./panels/receiver";
import { mountSonar } from "./panels/sonar";
import { mountStatus } from "./panels/status";
import { mountSummary } from "./panels/summary";
import { mountTransmit } from "./panels/transmit";
import { mountVerify } from "./panels/verify";

export function mountClassic(ctx: Ctx, app: HTMLElement): { frame(): void } {
  const panels: Panel[] = [mountStatus(ctx), mountReceiver(ctx), mountCopy(ctx), mountEnigma(ctx), mountAuthTable(ctx), mountVerify(ctx),
    mountBridge(ctx), mountTransmit(ctx), mountSonar(ctx), mountLog(ctx)];
  const [status, receiver, copy, enigma, auth, verify, bridge, transmit, sonar, log] = panels as [Panel, Panel, Panel, Panel, Panel, Panel, Panel, Panel, Panel, Panel];
  const summary = mountSummary(ctx);

  const left = h("div", { class: "col area-left" }, receiver.el, copy.el, enigma.el);
  const right = h("div", { class: "col area-right" }, auth.el, verify.el);
  const help = h("div", { class: "footer" }, ...HELP.map((t) => h("div", { text: t })));
  app.append(status.el, left, right, bridge.el, transmit.el, sonar.el, log.el, help, summary.el, h("div", { class: "flash", attrs: { "aria-hidden": "true" } }));
  return { frame: () => { receiver.frame?.(); transmit.frame?.(); } };
}
