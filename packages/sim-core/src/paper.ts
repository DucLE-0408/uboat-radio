// G3 paperwork rules (desk UI). Pure and data-driven: the desk reports OBSERVED facts about what the player did with a sheet;
// the sim judges them against fixed rules and decides the consequences (see Watch.cite). No wall clock, no global rand.
import type { Balance } from "./balance";
import { derive } from "./rng";

export type PaperFault = "wrongStamp" | "wrongBin" | "badHandover" | "timeout";
export const PAPER_FAULTS: readonly PaperFault[] = ["wrongStamp", "wrongBin", "badHandover", "timeout"];

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
