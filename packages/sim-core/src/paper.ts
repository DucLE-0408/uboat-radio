// G3 paperwork rules (desk UI). Pure and data-driven: the desk reports OBSERVED facts about what the player did with a sheet;
// the sim judges them against fixed rules and decides the consequences (see Watch.cite). No wall clock, no global rand.
import type { Balance } from "./balance";
import { Enigma } from "./enigma";
import { derive } from "./rng";
import { dayEnigma } from "./traffic";

export type PaperFault = "wrongStamp" | "wrongBin" | "badHandover" | "timeout" | "orderBreach";
export const PAPER_FAULTS: readonly PaperFault[] = ["wrongStamp", "wrongBin", "badHandover", "timeout", "orderBreach"];

/** What the player just did, as the desk saw it. All counts are small non-negative integers (validated by `validAction`). */
export type PaperAction =
  | { readonly act: "stamp"; readonly sheet: "input" | "output"; readonly color: "blue" | "red"; readonly stampsBefore: number }
  | { readonly act: "bin"; readonly sheet: "input" | "output" | "mission" | "orders" | "manual" }
  | {
      readonly act: "handover"; readonly echo: boolean; readonly signed: boolean; readonly inputStamps: number;
      readonly outputs: number; readonly outputRed: number; readonly outputOther: number; readonly messages: number;
    };

const small = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 100;

/** Boundary validation: anything else is refused (the command is not applied and no citation is issued). */
export function validAction(a: PaperAction): boolean {
  switch (a.act) {
    case "stamp": return (a.sheet === "input" || a.sheet === "output") && (a.color === "blue" || a.color === "red") && small(a.stampsBefore);
    case "bin": return ["input", "output", "mission", "orders", "manual"].includes(a.sheet);
    case "handover":
      return typeof a.echo === "boolean" && typeof a.signed === "boolean" && small(a.inputStamps) && small(a.outputs)
        && small(a.outputRed) && small(a.outputOther) && small(a.messages);
    default: return false;
  }
}

/**
 * G1 stamping rules turned into law: Input = Echo stamp + signature and no regular stamp; Output = exactly one RED stamp;
 * nothing the crew handed over may be thrown away; a bundle holds one message with its Output.
 */
export function judge(a: PaperAction): PaperFault[] {
  const out = new Set<PaperFault>();
  switch (a.act) {
    case "stamp":
      if (a.sheet === "input" || a.color !== "red" || a.stampsBefore >= 1) out.add("wrongStamp");
      break;
    case "bin":
      out.add("wrongBin"); // every sheet type is a record
      break;
    case "handover":
      if (!a.echo || !a.signed || a.messages !== 1 || a.outputs === 0) out.add("badHandover");
      if (a.inputStamps > 0 || (a.outputs > 0 && (a.outputRed < a.outputs || a.outputOther > 0))) out.add("wrongStamp");
      break;
  }
  return [...out];
}

/** The day's standing order on records (printed on the Daily Orders). */
export type DayOrder = "burnInput" | "archiveOutput" | "keepNothing";
export type DisposeHow = "archive" | "burn";
export const DAY_ORDERS: readonly DayOrder[] = ["burnInput", "archiveOutput", "keepNothing"];
export function dayOrder(seed: number | string, day: number): DayOrder { return derive(seed, "orders", day).pick(DAY_ORDERS); }
/** Acting against the day's order is a paperwork fault: burnInput = never archive an Input; archiveOutput = never burn an Output; keepNothing = no disposal at all. */
export function judgeDispose(order: DayOrder, sheet: "input" | "output", how: DisposeHow): PaperFault[] {
  const breach = order === "keepNothing" || (order === "burnInput" && sheet === "input" && how === "archive") || (order === "archiveOutput" && sheet === "output" && how === "burn");
  return breach ? ["orderBreach"] : [];
}

export type OrderItemKind = "safeCoords" | "resupply";
export interface OrderItem {
  readonly id: string;
  readonly kind: OrderItemKind;
  /** Offset from the watch origin in km (what the Daily Orders print). */
  readonly xKm: number;
  readonly yKm: number;
}

/** The "important information" printed on the Daily Orders: safe coordinates and resupply points. Seed-derived. */
export function orderItems(seed: number | string, b: Balance): OrderItem[] {
  const r = derive(seed, "paper", "items");
  const items: OrderItem[] = [];
  const mk = (kind: OrderItemKind, n: number): void => {
    for (let i = 0; i < n; i++) {
      const xKm = Math.round((r.next() * 2 - 1) * b.paper.items.rangeKm), yKm = Math.round((r.next() * 2 - 1) * b.paper.items.rangeKm);
      items.push({ id: `${kind === "safeCoords" ? "safe" : "supply"}${i + 1}`, kind, xKm, yKm });
    }
  };
  mk("safeCoords", b.paper.items.safeCoords);
  mk("resupply", b.paper.items.resupply);
  return items;
}

/** The order in which items are taken away by citations (deterministic per seed). */
export function lossOrder(seed: number | string, items: readonly OrderItem[]): string[] {
  return derive(seed, "paper", "loss").shuffle(items.map((i) => i.id));
}

// ---------------------------------------------------------------- G3 stage 2: paper tells (printed stamp, signature, sender id)

export type PaperTell = "mark" | "signature" | "sender";
export type AuthMark = "none" | "stamped";
export const SIGNATURE_VARIANTS = 6;

/** What the Input sheet shows (public). The sender id is enciphered: the player needs the machine (and the right plugboard) to read it. */
export interface PaperObservable {
  readonly authMark: AuthMark;
  readonly signatureVariant: number;
  readonly senderIdCipher: string;
}

/** Public reference data printed on the Daily Orders: the signature specimen of each known station and the approved senders. */
export interface PaperOrders {
  readonly approvedSenders: readonly string[];
  readonly signatures: Readonly<Record<string, number>>;
}

/** Ground truth for one message; never shown (D3/D4). `tells` are exactly what `verifyPaper` can find from the observables. */
export interface PaperTruth {
  readonly authMark: AuthMark;
  readonly markForged: boolean; // a forged stamp that looks identical to a genuine one: NOT a tell
  readonly signatureVariant: number;
  readonly senderId: string;
  readonly tells: readonly PaperTell[];
}

const word4 = (r: ReturnType<typeof derive>): string => Array.from({ length: 4 }, () => String.fromCharCode(65 + r.int(26))).join("");

export function paperOrders(seed: number | string, callsigns: readonly string[]): PaperOrders {
  const r = derive(seed, "paper", "orders");
  const approved = new Set<string>();
  while (approved.size < 3) approved.add(word4(r));
  const signatures: Record<string, number> = {};
  for (const cs of callsigns) signatures[cs] = r.int(SIGNATURE_VARIANTS);
  return { approvedSenders: [...approved], signatures };
}

/**
 * Paper profile of one message. Genuine: stamped, specimen signature, approved sender. Forged: some tells are left in,
 * fewer at higher Allied Intel (a forged stamp that looks genuine is never a tell). D8 is carried by the existing tells in
 * `generateForgery`; paper tells only add ways to catch a forgery.
 */
export function makeProfile(seed: number | string, id: number, from: string, forged: boolean, intelLevel: number, orders: PaperOrders): PaperTruth {
  const r = derive(seed, "paper", "profile", id);
  const sample = orders.signatures[from];
  const approvedPick = orders.approvedSenders[r.int(orders.approvedSenders.length)] as string;
  const sigGenuine = sample ?? r.int(SIGNATURE_VARIANTS);
  if (!forged) return { authMark: "stamped", markForged: false, signatureVariant: sigGenuine, senderId: approvedPick, tells: [] };
  const want = intelLevel <= 1 ? 2 : intelLevel === 2 ? 1 : intelLevel === 3 ? (r.chance(0.5) ? 1 : 0) : 0;
  const pool = r.shuffle<PaperTell>(sample === undefined ? ["mark", "sender"] : ["mark", "signature", "sender"]); // no specimen: nothing to compare a signature with
  const tells = pool.slice(0, want);
  let sig = sigGenuine;
  if (tells.includes("signature")) sig = (sigGenuine + 1 + r.int(SIGNATURE_VARIANTS - 1)) % SIGNATURE_VARIANTS;
  let sender = approvedPick;
  if (tells.includes("sender")) { do sender = word4(r); while (orders.approvedSenders.includes(sender)); }
  const missing = tells.includes("mark");
  return { authMark: missing ? "none" : "stamped", markForged: !missing, signatureVariant: sig, senderId: sender, tells };
}

/** What a careful operator can establish from the sheet and the Orders: pure, no ground truth. */
export function verifyPaper(obs: Pick<PaperObservable, "authMark" | "signatureVariant">, senderId: string | null, from: string, orders: PaperOrders): PaperTell[] {
  const found: PaperTell[] = [];
  if (obs.authMark === "none") found.push("mark");
  const sample = orders.signatures[from];
  if (sample !== undefined && obs.signatureVariant !== sample) found.push("signature");
  if (senderId !== null && !orders.approvedSenders.includes(senderId)) found.push("sender");
  return found;
}

/** Day machine for sender ids: the day key with the message indicator as start position (the same start as the first body group). */
function senderMachine(seed: number | string, day: number, indicator: string, plugboard?: readonly string[]): Enigma {
  const base = dayEnigma(seed, day);
  return new Enigma({ ...base, plugboard: plugboard ?? base.plugboard, positions: indicator });
}
export const encipherSenderId = (seed: number | string, day: number, indicator: string, senderId: string): string => senderMachine(seed, day, indicator).process(senderId);
/** The player's reading of the enciphered sender id; with a wrong plugboard or indicator it is simply a different word. */
export const decipherSenderId = (seed: number | string, day: number, indicator: string, cipher: string, plugboard?: readonly string[]): string => senderMachine(seed, day, indicator, plugboard).process(cipher);

/** Plugboard the player wired: at most 10 pairs of distinct letters, each letter used once. */
export function validPlugboard(pairs: readonly string[]): boolean {
  if (!Array.isArray(pairs) || pairs.length > 10) return false;
  const used = new Set<string>();
  for (const p of pairs) {
    if (typeof p !== "string" || !/^[A-Z]{2}$/.test(p) || p[0] === p[1] || used.has(p[0] as string) || used.has(p[1] as string)) return false;
    used.add(p[0] as string); used.add(p[1] as string);
  }
  return true;
}
