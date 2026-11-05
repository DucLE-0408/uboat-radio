// Crew at the door and their lines (R8). Original text, en/vi. Vietnamese: lời thoại chỉ dựa trên điều quan sát được;
// sau khi quyết định cũng không nói đúng/sai (D4: đúng sai chỉ lộ ở bảng tổng kết).
import type { Lang } from "../i18n";

/** Order matches the desk-crew sprite sheet (tools/art/desk.ts CREW_LOOKS). */
export const CREW = ["captain", "officer", "engineer", "sonar", "messenger"] as const;
export type CrewId = (typeof CREW)[number];

export type Trigger = "start" | "firstRx" | "handover" | "accepted" | "rejected" | "authPass" | "authFail" | "dfFix" | "depthCharge" | "bridgeAlert";
export const TRIGGERS: readonly Trigger[] = ["start", "firstRx", "handover", "accepted", "rejected", "authPass", "authFail", "dfFix", "depthCharge", "bridgeAlert"];

export interface Line { readonly who: "crew" | "you"; readonly text: string }
export interface Scene { readonly crew: CrewId; readonly lines: readonly Line[] }

const NAMES: Record<CrewId, string> = { captain: "Brandt", officer: "Keller", engineer: "Vogt", sonar: "Lorenz", messenger: "Hahn" };
/** G4: the sim's roster replaces the fixed names (same order as the sim roles: captain, xo, chief, sound, liaison). */
export const ROLE_TO_CREW: Readonly<Record<string, CrewId>> = { captain: "captain", xo: "officer", chief: "engineer", sound: "sonar", liaison: "messenger" };
export function setCrewNames(members: readonly { readonly role: string; readonly name: string }[]): void {
  for (const m of members) { const id = ROLE_TO_CREW[m.role]; if (id !== undefined) NAMES[id] = m.name; }
}
/** A scene told by an absent crew member is told by their successor instead (G4). */
export function remapCrew(scene: { readonly crew: CrewId; readonly lines: readonly { readonly who: "crew" | "you"; readonly text: string }[] }, absent: CrewId | null, successor: (id: CrewId) => CrewId): { readonly crew: CrewId; readonly lines: readonly { readonly who: "crew" | "you"; readonly text: string }[] } {
  return absent !== null && scene.crew === absent ? { ...scene, crew: successor(scene.crew) } : scene;
}
const ROLES: Readonly<Record<Lang, Readonly<Record<CrewId, string>>>> = {
  en: { captain: "Captain", officer: "First Officer", engineer: "Chief Engineer", sonar: "Sound Man", messenger: "Messenger" },
  vi: { captain: "Thuyền trưởng", officer: "Sĩ quan phó", engineer: "Máy trưởng", sonar: "Lính thủy âm", messenger: "Liên lạc viên" },
};
export const YOU: Readonly<Record<Lang, string>> = { en: "You · Radio operator", vi: "Bạn · Điện báo viên" };
export const crewName = (id: CrewId): string => NAMES[id];
export const crewRole = (lang: Lang, id: CrewId): string => ROLES[lang][id];

const c = (text: string): Line => ({ who: "crew", text });
const y = (text: string): Line => ({ who: "you", text });

/** Same number of scenes and lines in both languages (checked by test/desk-dialogue.test.ts). */
const SCENES: Readonly<Record<Lang, Readonly<Record<Trigger, readonly Scene[]>>>> = {
  en: {
    start: [
      { crew: "captain", lines: [c("Evening. HQ will be talking tonight, and so will anyone pretending to be HQ."), y("Understood, Captain. Every order gets checked."), c("Good. Check it twice. Then stamp it.")] },
      { crew: "officer", lines: [c("Your watch, operator. The orders for today are in the drawer."), y("I'll read them before the first signal."), c("Read them now. The first signal never waits.")] },
    ],
    firstRx: [
      { crew: "messenger", lines: [c("The line's alive. Something's printing."), y("I hear it. Leave the door open, I'll need you.")] },
      { crew: "sonar", lines: [c("You've got traffic. Quiet out here otherwise."), y("Keep it that way. I'll take this one.")] },
    ],
    handover: [
      { crew: "messenger", lines: [c("Papers for the bridge?"), y("Signed and clipped. Straight to the Captain."), c("On my way.")] },
      { crew: "officer", lines: [c("I'll take those."), y("Input, Output, both stamped."), c("Then the bridge has what it needs.")] },
    ],
    accepted: [
      { crew: "officer", lines: [c("Order accepted. The bridge acknowledges on the air."), y("The transmitter will be keyed for a moment. I know.")] },
      { crew: "captain", lines: [c("We act on it, then. Your stamp, your name."), y("Yes, Captain.")] },
    ],
    rejected: [
      { crew: "officer", lines: [c("Rejected? The Captain will want to know why."), y("It did not pass the checks. It's in the paperwork.")] },
      { crew: "captain", lines: [c("We ignore it. If it was real, HQ will send it again."), y("And if it was not, we stay where they can't find us.")] },
    ],
    authPass: [
      { crew: "sonar", lines: [c("The reply matched your table?"), y("It did. That's one check passed, not all of them.")] },
    ],
    authFail: [
      { crew: "officer", lines: [c("Wrong reply to the challenge."), y("Then whoever sent it does not hold our table."), c("Note it. Then decide.")] },
    ],
    dfFix: [
      { crew: "sonar", lines: [c("They've taken a bearing on our transmitter."), y("I kept it short."), c("Short is still a line on their chart.")] },
    ],
    depthCharge: [
      { crew: "engineer", lines: [c("Charges! Hold on to something!"), y("Desk's secure. Papers too."), c("Then hold on to yourself.")] },
    ],
    bridgeAlert: [
      { crew: "captain", lines: [c("All hands! Escort on top of us."), y("Radio is silent, Captain."), c("Keep it that way until I say.")] },
    ],
  },
  vi: {
    start: [
      { crew: "captain", lines: [c("Chào buổi tối. Đêm nay HQ sẽ liên lạc, và cả những kẻ giả làm HQ."), y("Rõ, thưa Thuyền trưởng. Lệnh nào cũng sẽ được soát."), c("Tốt. Soát hai lần. Rồi mới đóng dấu.")] },
      { crew: "officer", lines: [c("Tới ca của cậu. Lệnh hôm nay ở trong ngăn kéo."), y("Tôi sẽ đọc trước tín hiệu đầu tiên."), c("Đọc ngay đi. Tín hiệu đầu tiên chẳng bao giờ chờ ai.")] },
    ],
    firstRx: [
      { crew: "messenger", lines: [c("Đường dây có tín hiệu. Đang in gì đó."), y("Tôi nghe rồi. Để cửa mở, lát tôi cần cậu.")] },
      { crew: "sonar", lines: [c("Có điện đến. Ngoài kia thì vẫn yên."), y("Giữ cho nó yên. Bức này để tôi.")] },
    ],
    handover: [
      { crew: "messenger", lines: [c("Giấy lên đài chỉ huy à?"), y("Đã ký và ghim. Đưa thẳng cho Thuyền trưởng."), c("Tôi đi ngay.")] },
      { crew: "officer", lines: [c("Đưa tôi."), y("Input, Output, đều đã đóng dấu."), c("Vậy là đài chỉ huy có đủ thứ cần.")] },
    ],
    accepted: [
      { crew: "officer", lines: [c("Lệnh được chấp nhận. Đài chỉ huy sẽ xác nhận qua sóng."), y("Máy phát sẽ bật một lúc. Tôi biết.")] },
      { crew: "captain", lines: [c("Vậy ta làm theo. Dấu của cậu, tên của cậu."), y("Rõ, thưa Thuyền trưởng.")] },
    ],
    rejected: [
      { crew: "officer", lines: [c("Từ chối à? Thuyền trưởng sẽ muốn biết vì sao."), y("Nó không qua được các bước soát. Có trong giấy tờ.")] },
      { crew: "captain", lines: [c("Ta bỏ qua nó. Nếu là thật, HQ sẽ gửi lại."), y("Còn nếu là giả, ta vẫn ở chỗ chúng không tìm thấy.")] },
    ],
    authPass: [
      { crew: "sonar", lines: [c("Câu trả lời khớp với bảng của cậu à?"), y("Khớp. Đó mới là một bước soát, chưa phải tất cả.")] },
    ],
    authFail: [
      { crew: "officer", lines: [c("Trả lời thử thách sai."), y("Vậy người gửi không có bảng của ta."), c("Ghi lại. Rồi hãy quyết.")] },
    ],
    dfFix: [
      { crew: "sonar", lines: [c("Chúng đã đo được hướng máy phát của ta."), y("Tôi đã phát rất ngắn."), c("Ngắn thì vẫn là một đường kẻ trên hải đồ của chúng.")] },
    ],
    depthCharge: [
      { crew: "engineer", lines: [c("Bom chìm! Bám chặt vào!"), y("Bàn đã chằng. Giấy tờ cũng vậy."), c("Vậy thì giữ lấy chính mình.")] },
    ],
    bridgeAlert: [
      { crew: "captain", lines: [c("Toàn tàu! Tàu hộ tống ngay trên đầu."), y("Điện đài đang im lặng, thưa Thuyền trưởng."), c("Giữ nguyên cho tới khi tôi ra lệnh.")] },
    ],
  },
};

export const scenesFor = (lang: Lang, trigger: Trigger): readonly Scene[] => SCENES[lang][trigger];

/** Picks a scene with a cosmetic random value; the same index is used for every language, so switching language keeps the choice. */
export function pickScene(lang: Lang, trigger: Trigger, r: number): Scene {
  const list = SCENES[lang][trigger];
  return list[Math.min(list.length - 1, Math.floor(r * list.length))] as Scene;
}

/** Observed state the desk watches for dialogue (never truth: decisions are reported without their correctness). */
export interface Observed { readonly rxCount: number; readonly decisions: readonly ("accept" | "reject")[]; readonly authResults: number; readonly authPasses: number; readonly locatedAt: number | null; readonly depthChargeAt: number | null; readonly emergency: string | null }

/** What changed between two observations, in a fixed order. Pure; used for live updates only (a restore starts from the restored state). */
export function triggersBetween(a: Observed, b: Observed): Trigger[] {
  const out: Trigger[] = [];
  if (a.rxCount === 0 && b.rxCount > 0) out.push("firstRx");
  for (const d of b.decisions.slice(a.decisions.length)) out.push(d === "accept" ? "accepted" : "rejected");
  if (b.authResults > a.authResults) out.push(b.authPasses > a.authPasses ? "authPass" : "authFail");
  if (b.locatedAt !== null && b.locatedAt !== a.locatedAt) out.push("dfFix");
  if (b.depthChargeAt !== null && b.depthChargeAt !== a.depthChargeAt) out.push("depthCharge");
  if (b.emergency !== null && b.emergency !== a.emergency && b.emergency !== "depth_charge") out.push("bridgeAlert");
  return out;
}
