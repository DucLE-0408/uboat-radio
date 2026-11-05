// Private Message texts (G4). The sim says who, tone and topic only; the words are here, original, en/vi. Vietnamese: không nói
// tin nào đúng hay giả, chỉ nói về hành vi quan sát được của người chơi (D4).
import type { Lang } from "../i18n";

export type PmTopic = "citation" | "late" | "longTx" | "located" | "badSend" | "orderFailed";
export type PmTone = "remind" | "threat";

const T: Readonly<Record<Lang, Readonly<Record<PmTopic, Readonly<Record<PmTone, readonly string[]>>>>>> = {
  en: {
    citation: {
      remind: ["Paperwork, operator. The book has rules for a reason. Mind them.", "Stamp the right sheet with the right ink. It saves us all an argument."],
      threat: ["Another mark against you. I do not write these twice. Get your desk in order.", "You are making a habit of this. Habits end up in my report."],
    },
    late: {
      remind: ["The bundle is late. The bridge is waiting on your paper.", "Clock is running, operator. Hand it over."],
      threat: ["Late again. Tell me why I should keep trusting this desk.", "Every minute you sit on a signal is a minute the enemy listens."],
    },
    longTx: {
      remind: ["You have been on the key a long time. Keep it short.", "The set is warm. Someone out there is listening."],
      threat: ["Stop keying. You are painting a target on us.", "One more long transmission and I pull the antenna myself."],
    },
    located: {
      remind: ["Something changed out there. Stay sharp.", "I do not like the silence. Watch your instruments."],
      threat: ["They have us. If this is your doing, I will remember it.", "Whatever you sent, they heard. Brace."],
    },
    orderFailed: {
      remind: ["We missed the position HQ ordered. The supply point is gone with it.", "The deadline passed with us still at sea. Plan the next leg better."],
      threat: ["Orders are not suggestions, operator. You cost us a resupply point.", "We were told where to be and were not there. Do not make me write it down."],
    },
    badSend: {
      remind: ["HQ could not read your reply. Check the machine before you key.", "A reply nobody can read is just noise on the air."],
      threat: ["You wasted air time on gibberish. We do not get that back.", "Send it right or do not send it."],
    },
  },
  vi: {
    citation: {
      remind: ["Giấy tờ đấy, điện báo viên. Sổ có luật là có lý do. Nhớ lấy.", "Đóng đúng tờ, đúng màu mực. Đỡ cho cả đám phải cãi nhau."],
      threat: ["Lại thêm một dấu đen cho cậu. Tôi không ghi hai lần đâu. Dọn bàn cho ngay ngắn.", "Cậu đang thành thói quen. Thói quen thì vào báo cáo của tôi."],
    },
    late: {
      remind: ["Bó giấy trễ rồi. Đài chỉ huy đang đợi giấy của cậu.", "Đồng hồ đang chạy, điện báo viên. Giao đi."],
      threat: ["Lại trễ. Nói tôi nghe vì sao tôi nên tin cái bàn này.", "Mỗi phút cậu ôm một bức điện là một phút địch nghe lén."],
    },
    longTx: {
      remind: ["Cậu bấm phím lâu rồi. Giữ cho ngắn.", "Máy nóng rồi. Ngoài kia có kẻ đang nghe."],
      threat: ["Thôi bấm phím. Cậu đang vẽ bia lên người chúng ta.", "Thêm một lần phát dài nữa là tôi tự rút ăng-ten."],
    },
    located: {
      remind: ["Ngoài kia có gì đó khác rồi. Tỉnh táo vào.", "Tôi không thích sự im lặng này. Để mắt tới thiết bị."],
      threat: ["Chúng biết chỗ ta. Nếu là do cậu, tôi sẽ nhớ.", "Cậu phát cái gì thì chúng nghe cái đó. Bám chắc vào."],
    },
    orderFailed: {
      remind: ["Ta trễ vị trí HQ ra lệnh. Điểm tiếp tế mất theo luôn.", "Quá hạn mà tàu vẫn ngoài khơi. Lần sau tính đường cho kỹ."],
      threat: ["Lệnh không phải lời gợi ý, điện báo viên. Cậu làm ta mất một điểm tiếp tế.", "Người ta bảo ta ở đâu mà ta không ở đó. Đừng để tôi phải ghi sổ."],
    },
    badSend: {
      remind: ["Đài chỉ huy không đọc được bức trả lời. Kiểm tra máy trước khi bấm phím.", "Bức trả lời không ai đọc được chỉ là tạp âm trên sóng."],
      threat: ["Cậu phí thời gian phát vào đống ký tự vô nghĩa. Không lấy lại được đâu.", "Gửi cho đúng hoặc đừng gửi."],
    },
  },
};

/** One text; `n` (a stable counter such as the note's index) picks between the variants so a reload shows the same words. */
export function pmText(lang: Lang, topic: PmTopic, tone: PmTone, n: number): string {
  const v = T[lang][topic][tone];
  return v[Math.abs(n) % v.length] as string;
}
export const PM_VARIANTS = 2;
