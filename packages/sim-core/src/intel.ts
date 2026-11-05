// Allied Intel ladder 0-4: what the enemy can forge. Rises with exposure, never falls below earned level
// except through slow decay of the underlying score.
import { BALANCE, type Balance } from "./balance";
import type { Rng } from "./rng";

export type IntelLevel = 0 | 1 | 2 | 3 | 4;

export class Intel {
  private score = 0;
  private readonly seenPatterns = new Set<string>();
  private readonly seenIndicators = new Set<string>();

  constructor(private readonly b: Balance = BALANCE) {}

  get level(): IntelLevel {
    let lv = 0;
    for (const t of this.b.intel.thresholds) if (this.score >= t) lv++;
    return Math.min(4, lv) as IntelLevel;
  }

  getScore(): number {
    return this.score;
  }

  /** Long transmissions feed triangulation and traffic analysis. */
  transmit(seconds: number): void {
    this.score += seconds * this.b.intel.perTxSecond;
  }

  /** Repeated message pattern (e.g. identical header/format). Counted from the 2nd occurrence. */
  pattern(signature: string): void {
    if (this.seenPatterns.has(signature)) this.score += this.b.intel.repeatedPattern;
    else this.seenPatterns.add(signature);
  }

  /** Reusing an Enigma message key / indicator is a classic break-in. */
  indicator(ind: string): void {
    if (this.seenIndicators.has(ind)) this.score += this.b.intel.reusedIndicator;
    else this.seenIndicators.add(ind);
  }

  /** Lost/destroyed codebook: jump straight to the Intel-2 threshold at minimum, plus a penalty. */
  codebookLost(): void {
    const t2 = this.b.intel.thresholds[1] as number;
    this.score = Math.max(this.score, t2) + this.b.intel.lostCodebook;
  }

  /** "Marked" by the enemy (G3 citation): jump to the next Intel threshold, or add the pattern bonus at the top level. */
  mark(): void {
    const next = this.b.intel.thresholds[this.level];
    if (next !== undefined) this.score = Math.max(this.score, next + 5); // a little above the threshold so the new level is not decayed away at once
    else this.score += this.b.intel.repeatedPattern;
  }

  tickMinutes(min: number): void {
    this.score = Math.max(0, this.score - min * this.b.intel.decayPerMin);
  }

  /** Fraction of the auth table the enemy knows (level 3 only, grows toward level 4). */
  knownFraction(): number {
    const lv = this.level;
    if (lv < 3) return 0;
    if (lv >= 4) return 1;
    const [t3, t4] = [this.b.intel.thresholds[2] as number, this.b.intel.thresholds[3] as number];
    const { min, max } = this.b.intel.level3KnownFraction;
    return min + Math.min(1, Math.max(0, (this.score - t3) / (t4 - t3))) * (max - min);
  }

  /** Probability that a forged message passes the check group / challenge. */
  forgeryPassProbability(): number {
    switch (this.level) {
      case 0: // wrong format
      case 1: // right format, wrong callsign/logic
        return 0;
      case 2: // callsign known, blind check-group guess
        return 1 / 26;
      case 3:
        return this.knownFraction();
      case 4:
        return 1;
    }
  }

  attemptForgeryAuth(rng: Rng): boolean {
    return rng.chance(this.forgeryPassProbability());
  }
}
