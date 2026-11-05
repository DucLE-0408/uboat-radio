// Event Bus: the only channel between sim modules and (later) presentation / network layer.
import type { Fist } from "./morse";
import type { PaperObservable } from "./paper";

// Events are plain, serialization-friendly data so the log can be replayed or sent over a wire.

export type SimEvent =
  | { readonly type: "HFDF_FIX"; readonly tSec: number; readonly freqKhz: number; readonly cumulativeTxSec: number }
  | { readonly type: "ESCORT_DISPATCHED"; readonly tSec: number; readonly etaSec: number }
  | { readonly type: "DEPTH_CHARGE"; readonly tSec: number }
  | { readonly type: "INTEL_LEVEL"; readonly tSec: number; readonly level: number }
  | { readonly type: "KEYBOOK_LOST"; readonly tSec: number; readonly net: string; readonly day: number }
  | { readonly type: "ASDIC_PING"; readonly tSec: number; readonly contactId: number; readonly bearingDeg: number; readonly rangeM: number }
  | { readonly type: "BRIDGE_ALERT"; readonly tSec: number; readonly reason: "asdic" | "depth_charge" }
  | { readonly type: "BOAT_MODE"; readonly tSec: number; readonly mode: "surface" | "periscope" | "dive" }
  | { readonly type: "BOAT_DAMAGED"; readonly tSec: number; readonly hull: number }
  | { readonly type: "BOAT_SUNK"; readonly tSec: number }
  | { readonly type: "AUTH_RESULT"; readonly tSec: number; readonly ok: boolean; readonly reason: "ok" | "wrong" | "replay" }
  | { readonly type: "SONAR_CONTACT"; readonly tSec: number; readonly contactId: number; readonly bearingDeg: number; readonly snrDb: number; readonly bladeRateHz: number; readonly guess: "escort" | "slow" }
  | { readonly type: "MSG_RX"; readonly tSec: number; readonly rxId: number; readonly attempt: number; readonly from: string; readonly net: string; readonly sentAtMin: number; readonly indicator: string; readonly tokens: string; readonly snrDb: number; readonly txFist: Fist; readonly dfBearingDeg: number; readonly paper?: PaperObservable; readonly reply?: "ack" | "position" }
  | { readonly type: "TX"; readonly tSec: number; readonly seconds: number; readonly purpose: "report" | "repeat" | "challenge" | "ack" | "send" }
  | { readonly type: "CHALLENGE_SENT"; readonly tSec: number; readonly rxId: number; readonly row: string; readonly col: string }
  | { readonly type: "CHALLENGE_REPLY"; readonly tSec: number; readonly rxId: number; readonly reply: string }
  | { readonly type: "MSG_RESOLVED"; readonly tSec: number; readonly rxId: number; readonly decision: "accept" | "reject"; readonly forged: boolean; readonly correct: boolean }
  | { readonly type: "CITATION"; readonly tSec: number; readonly rxId: number | null; readonly reason: "wrongStamp" | "wrongBin" | "badHandover" | "timeout" | "orderBreach" | "badSend"; readonly count: number; readonly lostItem: string | null }
  | { readonly type: "CONSEQUENCE"; readonly tSec: number; readonly level: "warning" | "located" | "severe" | "executed"; readonly count: number; readonly positionKnown: number | null }
  /** G4: a message dropped off the pile because too many were waiting (Endless). */
  | { readonly type: "MSG_LOST"; readonly tSec: number; readonly rxId: number }
  /** G4: HQ read (or could not read) a reply the player sent. */
  | { readonly type: "SEND_RESULT"; readonly tSec: number; readonly rxId: number; readonly ok: boolean }
  /** G4: a crew member's private note. Who, tone and topic only; the words are the desk's. */
  | { readonly type: "PRIVATE_MSG"; readonly tSec: number; readonly fromRole: "captain" | "xo" | "chief" | "sound" | "liaison"; readonly tone: "remind" | "threat"; readonly topic: "citation" | "late" | "longTx" | "located" | "badSend"; readonly rxId: number | null }
  | { readonly type: "ROSTER_CHANGE"; readonly tSec: number; readonly role: "captain" | "xo" | "chief" | "sound" | "liaison"; readonly present: boolean }
  | { readonly type: "WATCH_END"; readonly tSec: number; readonly reason: "time" | "sunk" | "executed" | "left" };

export type Handler = (e: SimEvent) => void;

export class EventBus {
  private readonly handlers = new Set<Handler>();
  private readonly log: SimEvent[] = [];

  subscribe(h: Handler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  emit(e: SimEvent): void {
    this.log.push(e); // Vietnamese: event log là nguồn sự thật cho save/load (seed + log), không lưu snapshot.
    for (const h of this.handlers) h(e);
  }

  /** Immutable copy of the log, for replay/serialization. */
  getLog(): readonly SimEvent[] {
    return this.log.slice();
  }
}
