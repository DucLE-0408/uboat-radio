// G1 Stamping Rules, trash rule and the hand-over check (R6.4–R6.6). Pure. The same rules are printed in the Manual (Stage 4).
// G1 has no penalties: a rule break is reported when the bundle is handed over; citations come with the G3 sim-core spec.
import type { Paper, PaperKind } from "./papers";

/** Fixed G1 rules. Input: Echo stamp and signature on the back, no regular stamp. Output: one red stamp on the back. */
export const RULES = { outputStamp: "red", inputSigned: true } as const;

export type HandOverProblem =
  | "noOutput"        // the decode sheet is missing from the bundle
  | "outputUnstamped" // the Output has no red stamp
  | "outputWrongInk"  // an Output carries a blue stamp
  | "outputTwoStamps" // an Output carries more than the one stamp the rule asks for
  | "inputUnsigned"   // the Input was not signed
  | "inputStamped";   // the Input carries a regular stamp (only the Echo stamp belongs there)

export type HandOverRefusal = "noInput" | "noEcho" | "mixed" | "mission";

export type HandOverCheck = { readonly ok: true; readonly rxId: number; readonly problems: readonly HandOverProblem[] } | { readonly ok: false; readonly reason: HandOverRefusal };

/**
 * A bundle (one sheet or a clip group) may go to the crew only when it belongs to one message and its Input carries the
 * Echo stamp (otherwise the order would leave the desk undecided). Other rule breaks are listed, not blocked.
 */
export function checkHandOver(bundle: readonly Paper[], echoStamped: (rxId: number) => boolean): HandOverCheck {
  if (bundle.some((p) => p.kind === "mission")) return { ok: false, reason: "mission" };
  const ids = new Set(bundle.map((p) => p.rxId));
  if (ids.size !== 1) return { ok: false, reason: "mixed" };
  const rxId = bundle[0]?.rxId ?? null;
  const inputs = bundle.filter((p) => p.kind === "input");
  if (rxId === null || inputs.length === 0) return { ok: false, reason: "noInput" };
  if (!echoStamped(rxId)) return { ok: false, reason: "noEcho" };
  const problems: HandOverProblem[] = [];
  const outputs = bundle.filter((p) => p.kind === "output");
  if (outputs.length === 0) problems.push("noOutput");
  else {
    // every sheet must follow the rule on its own: one correct Output cannot cover for another
    if (outputs.some((o) => !o.stamps.includes(RULES.outputStamp))) problems.push("outputUnstamped");
    if (outputs.some((o) => o.stamps.some((c) => c !== RULES.outputStamp))) problems.push("outputWrongInk");
    if (outputs.some((o) => o.stamps.length > 1)) problems.push("outputTwoStamps");
  }
  if (RULES.inputSigned && inputs.some((i) => !i.signed)) problems.push("inputUnsigned");
  if (inputs.some((i) => i.stamps.length > 0)) problems.push("inputStamped");
  return { ok: true, rxId, problems };
}

/** Papers the crew handed to the radio room are records and may not be thrown away (only private notes may, G4). */
export function canTrash(kind: PaperKind): boolean {
  switch (kind) {
    case "input": case "output": case "mission": return false;
  }
}
