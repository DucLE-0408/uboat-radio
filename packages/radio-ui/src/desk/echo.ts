// Echo stamper press (R6.2–R6.3). Pure. Vietnamese: mỗi tin chỉ gửi `resolve` đúng một lần; dấu Echo hiện ra từ trạng thái
// `MSG_RESOLVED` của sim, không từ thao tác UI.

export type EchoDecision = "accept" | "reject";
export type PressResult = "sent" | "already" | "busy" | "refused";

export class EchoPress {
  private readonly inFlight = new Set<number>();
  /**
   * `resolved(rxId)`: the sim already decided this message (the mark is on the sheet).
   * `send(rxId, d)`: dispatches the resolve command and reports whether the sim accepted it.
   */
  press(rxId: number, decision: EchoDecision, resolved: (rxId: number) => boolean, send: (rxId: number, d: EchoDecision) => boolean): PressResult {
    if (resolved(rxId)) return "already";
    if (this.inFlight.has(rxId)) return "busy";
    this.inFlight.add(rxId);
    const ok = send(rxId, decision);
    if (!ok) { this.inFlight.delete(rxId); return "refused"; } // no ink on a refusal; the controller already explained it
    return "sent";                                             // stays in flight: the message is decided for good
  }
}
