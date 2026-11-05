// Replies the player enciphers and sends (G4). Pure helpers: what is asked for, the expected plain text, and the time on the air.
import type { Balance } from "./balance";
import { encode } from "./morse";
import { derive } from "./rng";

export type ReplyKind = "ack" | "position";

const L = (i: number): string => String.fromCharCode(65 + Math.max(0, Math.min(25, i)));

/** Which reply a message asks for: seed-derived and public (it says nothing about whether the message is genuine). */
export function replyKind(seed: number | string, rxId: number): ReplyKind {
  return derive(seed, "send", "kind", rxId).chance(0.5) ? "ack" : "position";
}

/** Own position as two map-cell letters (the same grid the world uses), the content of a position report. */
export function positionCode(ownPos: { readonly x: number; readonly y: number }, b: Balance): string {
  return L(Math.floor(ownPos.x / b.world.cellKm)) + L(Math.floor(ownPos.y / b.world.cellKm));
}

/** Plain text HQ expects: "ACK" + the sender's callsign, or "POS" + the two position letters; padded with X to whole groups of 4. */
export function expectedReply(kind: ReplyKind, from: string, ownPos: { readonly x: number; readonly y: number }, b: Balance): string {
  const plain = kind === "ack" ? `ACK${from}` : `POS${positionCode(ownPos, b)}`;
  return plain + "X".repeat((4 - (plain.length % 4)) % 4);
}

/** Seconds on the air for the given groups at `wpm` (dit = 1 unit; element and gap units as in Morse timing). */
export function airtimeSec(groups: string, wpm: number): number {
  const unit = 1.2 / wpm;
  let u = 0;
  for (const c of encode(groups.replace(/\s+/g, ""))) u += c === "." ? 2 : c === "-" ? 4 : c === "_" ? 2 : c === "/" ? 4 : 0;
  return Math.max(1, Math.ceil(u * unit));
}

/** Boundary check for a send: whole groups of 4 letters A-Z, bounded length; indicator 4 letters. */
export function validSend(indicator: string, groups: string, maxChars: number): boolean {
  return typeof indicator === "string" && /^[A-Z]{4}$/.test(indicator) && typeof groups === "string" && groups.length <= maxChars + Math.ceil(maxChars / 4) && /^[A-Z]{4}( [A-Z]{4})*$/.test(groups) && groups.replace(/ /g, "").length <= maxChars;
}
