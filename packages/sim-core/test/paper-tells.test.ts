import { describe, expect, it } from "vitest";
import { Watch } from "../src/watch";
import { decipherSenderId, encipherSenderId, makeProfile, paperOrders, validPlugboard, verifyPaper, SIGNATURE_VARIANTS } from "../src/paper";
import { dayEnigma } from "../src/traffic";
import type { SimEvent } from "../src/events";

const calls = ["KDK", "ABC", "XYZ", "QRS"];

describe("paper tells (D8)", () => {
  it("genuine paper never trips a tell; forged paper tells are exactly what the observables show", () => {
    let identicalFakes = 0, withTell = 0, forgedN = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const orders = paperOrders(seed, calls);
      for (let id = 1; id <= 4; id++) {
        const from = calls[id - 1] as string;
        const g = makeProfile(seed, id, from, false, 0, orders);
        expect(verifyPaper(g, g.senderId, from, orders)).toEqual([]);
        for (let intel = 0; intel <= 4; intel++) {
          const f = makeProfile(seed, id, from, true, intel, orders);
          forgedN++;
          expect(verifyPaper(f, f.senderId, from, orders).sort()).toEqual([...f.tells].sort());
          if (f.markForged) { identicalFakes++; expect(verifyPaper(f, f.senderId, from, orders)).not.toContain("mark"); }
          if (f.tells.length > 0) withTell++;
          expect(f.signatureVariant).toBeGreaterThanOrEqual(0); expect(f.signatureVariant).toBeLessThan(SIGNATURE_VARIANTS);
        }
      }
    }
    expect(identicalFakes).toBeGreaterThan(forgedN / 4); // identical-looking forged stamps are common, and they are not tells
    expect(withTell).toBeGreaterThan(0);
  });
  it("tells fall with Allied Intel; at Intel 4 the paper gives nothing away", () => {
    const orders = paperOrders(5, calls);
    const avg = (intel: number): number => { let n = 0; for (let id = 1; id <= 200; id++) n += makeProfile(5, id, "KDK", true, intel, orders).tells.length; return n / 200; };
    expect(avg(0)).toBeGreaterThan(avg(2)); expect(avg(2)).toBeGreaterThan(avg(4)); expect(avg(4)).toBe(0);
  });
  it("a forged message always keeps at least one tell overall (existing tells + paper tells), on 400 seeds at every Intel level", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const w = new Watch(seed); w.runUntil(700);
      for (const id of [1, 2]) {
        const t = w.truthOf(id);
        if (t?.forged) expect(t.tells.length + (t.paperTells?.length ?? 0)).toBeGreaterThanOrEqual(1);
        if (t && !t.forged) expect(t.paperTells ?? []).toEqual([]);
      }
    }
  });
});

describe("sender id and plugboard", () => {
  it("MSG_RX carries the stamp, the signature and an enciphered sender id that decodes to an approved sender when genuine", () => {
    const w = new Watch(11); w.runUntil(100);
    const rx = w.bus.getLog().find((e): e is Extract<SimEvent, { type: "MSG_RX" }> => e.type === "MSG_RX" && e.rxId === 1);
    expect(rx?.paper).toBeDefined();
    const p = rx?.paper as NonNullable<typeof rx>["paper"] & object;
    expect(w.truthOf(1)?.forged).toBe(false);
    const id = decipherSenderId(11, w.day, (rx as NonNullable<typeof rx>).indicator, p.senderIdCipher);
    expect(w.paperOrders().approvedSenders).toContain(id);
    expect(w.assessPaper((rx as NonNullable<typeof rx>).from, p, id)).toEqual([]);
    expect(p.senderIdCipher).not.toBe(id); // it really is enciphered
  });
  it("wrong plugboard or indicator reads a different word", () => {
    const base = dayEnigma(3, 1);
    const cipher = encipherSenderId(3, 1, "ABCD", "WXYZ");
    expect(decipherSenderId(3, 1, "ABCD", cipher)).toBe("WXYZ");
    expect(decipherSenderId(3, 1, "ABCD", cipher, base.plugboard)).toBe("WXYZ");
    expect(decipherSenderId(3, 1, "ABCD", cipher, [])).not.toBe("WXYZ");
    expect(decipherSenderId(3, 1, "ABCE", cipher)).not.toBe("WXYZ");
  });
  it("Watch.decipher ignores an invalid plugboard and uses a valid one", () => {
    const w = new Watch(11); w.runUntil(100);
    const rx = w.bus.getLog().find((e): e is Extract<SimEvent, { type: "MSG_RX" }> => e.type === "MSG_RX") as Extract<SimEvent, { type: "MSG_RX" }>;
    const copy = w.copy(rx.tokens);
    const day = w.decipher(rx.indicator, copy).plain;
    expect(w.decipher(rx.indicator, copy, ["AA"]).plain).toBe(day);          // invalid -> day key
    expect(w.decipher(rx.indicator, copy, dayEnigma(11, 1).plugboard).plain).toBe(day);
    expect(w.decipher(rx.indicator, copy, []).plain).not.toBe(day);
  });
  it("validPlugboard", () => {
    expect(validPlugboard([])).toBe(true);
    expect(validPlugboard(["AB", "CD"])).toBe(true);
    expect(validPlugboard(["AB", "BC"])).toBe(false);      // B twice
    expect(validPlugboard(["AA"])).toBe(false);
    expect(validPlugboard(["ab"])).toBe(false);
    expect(validPlugboard(Array.from({ length: 11 }, (_, i) => String.fromCharCode(65 + 2 * i) + String.fromCharCode(66 + 2 * i)))).toBe(false); // 11 pairs
    expect(validPlugboard(Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + 2 * i) + String.fromCharCode(66 + 2 * i)))).toBe(true);
  });
});
