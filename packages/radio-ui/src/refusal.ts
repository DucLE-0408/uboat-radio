// Turns a refused Command (Watch.dispatch === false) into a human reason (R5.3). Pure; uses only state the player knows.
import type { Command } from "@uboat/sim-core";
import type { UiState } from "./store";

export function needsRx(cmd: Command): cmd is Extract<Command, { rxId: number }> {
  return cmd.kind === "repeat" || cmd.kind === "challenge" || cmd.kind === "check" || cmd.kind === "resolve";
}

function antennaReason(s: UiState): string | null {
  if (s.boat.canTransmit) return null;
  if (s.boat.silence) return "Radio silence is ON — lift it with Alt+S before keying.";
  if (s.boat.mode === "dive" || !s.boat.antennaUp) return "Antenna is under water — the boat is diving. Surface (Alt+1) or come to periscope depth (Alt+2) to transmit.";
  return "The transmitter is unavailable.";
}

export function explainRefusal(cmd: Command, s: UiState): string {
  if (s.ended !== null) return "The watch is over — nothing more can be sent.";
  if (cmd.kind === "transmit") return antennaReason(s) ?? "Transmission refused.";
  if (!needsRx(cmd)) return "Order refused.";
  const rx = s.rx.get(cmd.rxId);
  if (!rx) return `No such message #${cmd.rxId}.`;
  if (rx.resolved) return `Message #${cmd.rxId} was already handled.`;
  switch (cmd.kind) {
    case "repeat": return antennaReason(s) ?? "Repeat request refused.";
    case "challenge":
      if (rx.challenge) return `A challenge for #${cmd.rxId} is already out.`;
      return antennaReason(s) ?? "Challenge refused.";
    case "check":
      if (!rx.challenge) return "Send a challenge first (Alt+C).";
      if (rx.challenge.result !== null) return "That reply was already checked.";
      if (rx.challenge.reply === null) return "No reply yet — wait for the other station to answer.";
      return "Check refused.";
    case "resolve": return "Decision refused.";
  }
}
