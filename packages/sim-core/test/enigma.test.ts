import { describe, it, expect } from "vitest";
import { Enigma, EnigmaConfig, normalize, toGroups } from "../src/enigma";

const base: EnigmaConfig = { reflector: "B", rotors: ["Beta", "I", "II", "III"], rings: "AAAA", positions: "AAAA", plugboard: [] };

// Historical: U-264 (Looks) message, Kriegsmarine M4.
const u264: EnigmaConfig = {
  reflector: "B", rotors: ["Beta", "II", "IV", "I"], rings: "AAAV", positions: "VJNA",
  plugboard: ["AT", "BL", "DF", "GJ", "HM", "NW", "OP", "QY", "RZ", "VX"],
};
const u264Cipher = normalize("NCZW VUSX PNYM INHZ XMQX SFWX WLKJ AHSH NMCO CCAK UQPM KCSM HKSE INJU SBLK IOSX CKUB HMLL XCSJ USRR");
const u264Plain = "VONVONJLOOKSJHFFTTTEINSEINSDREIZWOYYQNNSNEUNINHALTXXBEIANGRIFFUNTERWASSERGEDRUEC";

describe("enigma M4", () => {
  it("M3-compat vector: Beta@A + thin B == UKW B, AAAAA -> BDZGO", () => {
    expect(new Enigma(base).process("AAAAA")).toBe("BDZGO");
  });
  it("historical U-264 message decrypts", () => {
    expect(new Enigma(u264).process(u264Cipher)).toBe(u264Plain);
  });
  it("is reciprocal and never maps a letter to itself", () => {
    const txt = "THEQUICKBROWNFOXJUMPSOVERTHELAZYDOGTHEQUICKBROWNFOX".repeat(20);
    const ct = new Enigma(u264).process(txt);
    expect(new Enigma(u264).process(ct)).toBe(txt);
    for (let i = 0; i < txt.length; i++) expect(ct[i]).not.toBe(txt[i]);
  });
  it("double-stepping anomaly: ADU -> ADV -> AEW -> BFX -> BFY (rotors I II III)", () => {
    const e = new Enigma({ ...base, rotors: ["Beta", "I", "II", "III"], positions: "AADU" });
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) { e.press("A"); seen.push(e.getPositions().slice(1)); }
    expect(seen).toEqual(["ADV", "AEW", "BFX", "BFY"]);
  });
  it("Greek rotor and reflector never step", () => {
    const e = new Enigma({ ...base, positions: "BAAA" });
    e.process("A".repeat(26 * 26 * 26 + 5));
    expect(e.getPositions()[0]).toBe("B");
  });
  it("dropped character desyncs the remainder; resync at group boundary recovers", () => {
    const plain = normalize("ANGRIFFUNTERWASSERGEDRUECKTWABOSXLETZTERGEGNERSTANDNORDAMERIKA");
    const ct = new Enigma(u264).process(plain);
    const dropped = ct.slice(0, 5) + ct.slice(6); // drop char 5
    const dec = new Enigma(u264).process(dropped);
    expect(dec.slice(0, 5)).toBe(plain.slice(0, 5));
    expect(dec.slice(6, 16)).not.toBe(plain.slice(6, 16));
    // Resync: record positions at group k=3 (offset 12) and restart from there.
    const ref = new Enigma(u264); ref.process(plain.slice(0, 12));
    const resumed = new Enigma(u264); resumed.setPositions(ref.getPositions());
    expect(resumed.process(ct.slice(12))).toBe(plain.slice(12));
  });
  it("rejects invalid config", () => {
    expect(() => new Enigma({ ...base, rotors: ["Beta", "I", "I", "III"] })).toThrow();
    expect(() => new Enigma({ ...base, plugboard: ["AB", "AC"] })).toThrow();
    expect(() => new Enigma({ ...base, rings: "AAA" })).toThrow();
  });
  it("toGroups", () => { expect(toGroups("ABCDEFGHIJ")).toBe("ABCD EFGH IJ"); });
});
