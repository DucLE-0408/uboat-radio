# Desk UI G4 — Tasks

Trạng thái: **ĐÃ DUYỆT 2026-11-05**. Mỗi nhiệm vụ kiểm chứng được. `R#` là yêu cầu trong `requirements.md`.

## Cổng S0 — Duyệt spec (bắt buộc, chưa xong)
- [x] **S0.1** Người vận hành trả lời toàn bộ câu hỏi mở 2026-11-05 (design mục 8); spec được duyệt.
- Cổng đã mở; được sửa `packages/sim-core` trong phạm vi bảng ở `design.md` mục 2.

## Stage 1 — Sim-core: tùy chọn ca, Endless, mô-đun (sau S0)
- [x] **T1.1** `WatchOptions`/`ModuleSet`/`Difficulty`, `balance.json` mục `endless`, loader có validate; mặc định giữ nguyên ca trực. (R1.1, R1.5, D10)
  - Xong: `src/options.ts` (`WatchOptions`, `ModuleSet`, `parseOptions`; mô-đun tách rời độ khó, mặc định bật cả sáu), `balance.json` mục `endless`/`send`/`pm`/`roster`; không truyền options = ca trực như cũ (test).
- [x] **T1.2** `endless.ts`: bộ phát tin vô hạn, tăng dần, `maxPending`, không kết thúc theo thời gian; lệnh `leave` và `WATCH_END "left"`. (R1.2, R1.3, R1.8)
  - Xong: `src/endless.ts` (nhịp, tỷ lệ giả, hạn giờ), bộ phát `derive(seed,"endless",n)`, `maxPending` + `MSG_LOST`, lệnh `leave` + `WATCH_END "left"`; Endless không xử tử ở cảnh cáo thứ 5 (giữ `severe`).
- [x] **T1.3** Mô-đun bật/tắt trong phán xử G3 và sinh tell; test bất biến D8 trên mọi tổ hợp mô-đun × độ khó × nhiều seed. (R1.4, R1.6)
  - Xong: mô-đun `signatures` (không in `paper`), `stamps` (không phán xử tờ/dấu/hồ sơ, vẫn tính `timeout`/`badSend`), `timer` (Endless theo mô-đun); `rotors`/`cables`/`teletyper` là việc của desk. Test D8 trên 4 bộ mô-đun × 3 độ khó × 25 seed.
- [x] **T1.4** Save v3: `opts` trong `SaveFile`, `parseSave`/`parseCommand` validate, nạp v2; test replay bit-exact. (R7.1–R7.4)
  - Xong: file save v3 `{v:3, opts, ...}` chỉ ghi khi có options (ca trực vẫn v2), `parseSave` validate options, nạp v2 như cũ; test replay bit-exact với options.

## Stage 2 — Sim-core: Roster và Private Message
- [x] **T2.1** `roster.ts`: sinh từ seed, bảng tên bịa, `ROSTER_CHANGE`. (R5.1, R5.4)
  - Xong: `src/roster.ts` (5 chức vụ, 40 tên trong `balance.json`, `absentRole`, `successorOf`), `ROSTER_CHANGE` khi hull ≤ 50 lần đầu (không phải thuyền trưởng, không phải liên lạc viên).
- [x] **T2.2** `pm.ts`: luật, `topic`/`tone`, giãn cách và trần, chỉ dựa trên quan sát; test không lộ đúng/sai. (R4.1, R4.4, R4.5, D4)
  - Xong: `src/pm.ts` + `Watch.pm`: topic `citation`/`late`/`longTx`/`located`/`badSend`, tone theo số cảnh cáo, giãn cách 240 s và trần 6 tin mỗi 1800 s; không có PM khi không có options; không nói đúng/sai.

## Stage 3 — Sim-core: gửi tin
- [x] **T3.1** `encipherGroups` thuần qua barrel; test khớp `decipherCopy`. (R3.2)
  - Xong: `encipherGroups` (`traffic.ts`), nghịch đảo của `decipherCopy` với mọi plugboard.
- [x] **T3.2** Lệnh `send`: validate biên, thời gian phát vào `transmit`/HF-DF, kiểm tra bằng khóa ngày, `SEND_RESULT`, từ chối khi không phát được, indicator dùng lại tăng Intel. (R3.3–R3.7)
  - Xong: lệnh `send` (validate biên, `airtimeSec` vào `startTx` purpose `send`, `Intel.indicator`, kiểm tra bằng khóa ngày), `SEND_RESULT`, lỗi `badSend` một lần mỗi bức điện, từ chối khi im lặng/lặn/không options; `Watch.replyRequest`.
- [x] **T3.3** Test: tất định, replay, giới hạn kích thước, kết quả không lộ bản rõ. (R7.2, R8.1)
  - Xong: `test/g4.test.ts` (17 test) và `test/g4-save.test.ts`.

## Stage 4 — Desk UI (sau Stage 1–3)
- [ ] **T4.1** Menu *Endless* và màn cấu hình (độ khó, 6 mô-đun, seed), lưu cấu hình, truyền `opts` vào Session. (R2)
- [ ] **T4.2** Desk theo mô-đun (ẩn/hiện nắp rotor, bảng cắm, mặt sau Input, Teletyper, timer); tờ *Outgoing* + Outbox: gõ bản rõ lên máy, đồng bộ nhóm, *Phát*. (R1.4, R3.1–R3.4, R3.8)
- [ ] **T4.3** Giấy *Private* (được vứt, không cảnh cáo) và văn bản PM `en`/`vi`; tờ *Roster* trong ngăn kéo; `dialogue.ts` dùng Roster của sim. (R4.2, R4.3, R5.2, R5.3)
- [ ] **T4.4** Tổng kết Endless, điểm cao cục bộ theo (độ khó, mô-đun); giới hạn số giấy trên bàn. (R1.7, R6, R8.4)

## Stage 5 — Kiểm chứng G4
- [ ] **T5.1** `tsc`, vitest cả hai gói, invariants D8/D10, replay bit-exact, `git diff` sim-core đúng phạm vi đã duyệt, check-repo.
- [ ] **T5.2** Chơi Endless đủ lâu (độ khó và mô-đun khác nhau), gửi tin đúng và sai, nhận PM, vắng mặt Roster, reload giữa chừng, `en`/`vi`, console sạch, ảnh chụp.
- [ ] **T5.3** Cập nhật `docs/architecture.md`, task record, báo cáo.

## Thứ tự
S0 (duyệt) → Stage 1 → 2 → 3 → 4 → 5.
