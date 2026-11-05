// Private Message rules (G4). The sim only says WHO, TONE and TOPIC; the words live in the desk. Topics describe the player's own
// observable behaviour, never whether a decision was right (D4).
import type { Balance } from "./balance";
import { successorOf, type Role } from "./roster";

export type PmTopic = "citation" | "late" | "longTx" | "located" | "badSend" | "orderFailed" | "grounded";
export type PmTone = "remind" | "threat";

/** Rank of the sender for a topic and tone (before succession). */
export function senderFor(topic: PmTopic, tone: PmTone): Role {
  if (topic === "located" || topic === "orderFailed") return "captain";
  if (topic === "citation") return tone === "threat" ? "captain" : "xo";
  if (topic === "badSend" || topic === "grounded") return "chief";
  return "liaison"; // late and longTx
}
export const toneFor = (citations: number): PmTone => (citations >= 2 ? "threat" : "remind");

/** Minimum spacing and a cap per sliding window keep Private Messages from piling up. */
export function pmAllowed(b: Balance, now: number, sent: readonly number[]): boolean {
  if (sent.length > 0 && now - (sent[sent.length - 1] as number) < b.pm.gapSec) return false;
  return sent.filter((t) => now - t < b.pm.capWindowSec).length < b.pm.capCount;
}
export const resolveSender = (topic: PmTopic, tone: PmTone, absent: Role | null): Role => successorOf(senderFor(topic, tone), absent);
