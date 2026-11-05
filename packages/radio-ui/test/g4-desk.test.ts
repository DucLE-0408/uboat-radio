import { describe, expect, it } from "vitest";
import { pmText, type PmTone, type PmTopic } from "../src/desk/pmtext";
import { crewName, remapCrew, ROLE_TO_CREW, setCrewNames } from "../src/desk/dialogue";
import { reward, SEND_REWARD, RATION_EMPTY } from "../src/desk/ration";

const TOPICS: PmTopic[] = ["citation", "late", "longTx", "located", "badSend"], TONES: PmTone[] = ["remind", "threat"];

describe("private message texts", () => {
  it("every topic and tone has text in both languages, picked stably, and none speaks about right or wrong decisions", () => {
    for (const lang of ["en", "vi"] as const) for (const topic of TOPICS) for (const tone of TONES) {
      const a = pmText(lang, topic, tone, 120), b = pmText(lang, topic, tone, 120);
      expect(a.length).toBeGreaterThan(10); expect(a).toBe(b);
      expect(new Set([pmText(lang, topic, tone, 0), pmText(lang, topic, tone, 1)]).size).toBe(2);
      expect(a).not.toMatch(/forged|genuine|correct|wrong decision|giả|thật|quyết định sai/i); // D4
    }
  });
});

describe("crew roster on the desk", () => {
  it("the sim's names replace the fixed ones and an absent member's scenes go to the successor", () => {
    setCrewNames([{ role: "captain", name: "Obermann" }, { role: "xo", name: "Sommer" }, { role: "bogus", name: "X" }]);
    expect(crewName(ROLE_TO_CREW["captain"] as "captain")).toBe("Obermann"); expect(crewName("officer")).toBe("Sommer");
    const scene = { crew: "officer" as const, lines: [{ who: "crew" as const, text: "hi" }] };
    expect(remapCrew(scene, null, () => "captain").crew).toBe("officer");
    expect(remapCrew(scene, "engineer", () => "captain").crew).toBe("officer");
    expect(remapCrew(scene, "officer", () => "captain").crew).toBe("captain");
  });
  it("a reply HQ could read pays rations", () => {
    expect(reward(RATION_EMPTY, 1).score).toBe(SEND_REWARD); expect(reward(RATION_EMPTY, 0)).toBe(RATION_EMPTY);
  });
});
