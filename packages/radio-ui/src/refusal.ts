// Feedback for a refused Command. Vietnamese: dispatch chỉ trả boolean => KHÔNG khẳng định nguyên nhân; chỉ liệt kê sự kiện quan sát được (P5 R6.3).
import type { Command } from "@uboat/sim-core";
import type { UiState } from "./store";

export function needsRx(cmd: Command): cmd is Extract<Command, { rxId: number }> {
  return cmd.kind === "repeat" || cmd.kind === "challenge" || cmd.kind === "check" || cmd.kind === "resolve";
}

/** Facts the player can see on the instruments/paper right now that relate to this command. Never a cause. */
export function observedFacts(cmd: Command, s: UiState): string[] {
  const f: string[] = [];
  if (s.ended !== null) return ["the watch has ended"];
  if (cmd.kind === "transmit" || cmd.kind === "repeat" || cmd.kind === "challenge") {
    if (s.boat.silence) f.push("radio silence is on");
    if (!s.boat.antennaUp) f.push(`antenna is down (boat mode: ${s.boat.mode})`);
  }
  if (needsRx(cmd)) {
    const rx = s.rx.get(cmd.rxId);
    if (!rx) return [`no message #${cmd.rxId} on record`];
    if (rx.resolved) f.push(`message #${cmd.rxId} is already ${rx.resolved.decision === "accept" ? "accepted" : "rejected"}`);
    if (cmd.kind === "challenge" && rx.challenge) f.push(`a challenge for #${cmd.rxId} was already sent`);
    if (cmd.kind === "check") {
      if (!rx.challenge) f.push(`no challenge has been sent for #${cmd.rxId}`);
      else if (rx.challenge.result !== null) f.push("this reply was already checked");
      else if (rx.challenge.reply === null) f.push("no reply has arrived yet");
    }
  }
  return f;
}

/** Player-facing sentence: states that the order was not accepted, then lists what is observable. */
export function explainRefusal(cmd: Command, s: UiState): string {
  const facts = observedFacts(cmd, s);
  return facts.length === 0 ? "Order not accepted. Nothing observable explains it." : `Order not accepted. Observed: ${facts.join("; ")}.`;
}
