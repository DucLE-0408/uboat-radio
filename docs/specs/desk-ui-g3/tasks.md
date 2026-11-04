# Desk UI G3 — Tasks

Trạng thái: **ĐÃ DUYỆT 2026-11-04; Stage 1-5 xong** (người vận hành trả lời toàn bộ câu hỏi mở và giao câu 6, 7 cho tôi quyết). Mỗi nhiệm vụ kiểm chứng được. `R#` là yêu cầu trong `requirements.md`.

## Cổng S0 — Duyệt spec (bắt buộc, chưa xong)
- [x] **S0.1** Người vận hành duyệt `requirements.md`, `design.md` và trả lời các câu hỏi mở còn lại (design mục 8). Đã chốt 2026-11-04: bậc phạt 1–2 / 3 / 5 (câu 1 và 2).
- Cổng đã mở; được sửa `packages/sim-core` trong phạm vi bảng ở `design.md` mục 2.

## Stage 1 — Sim-core: luật, cảnh cáo, hậu quả (sau S0)
- [x] **T1.1** `data/paper.json` + loader có validate; test dữ liệu. (R1.5, R9.1)
  - Xong: dữ liệu nằm trong `data/balance.json` mục `paper` (cùng chỗ với cân bằng khác, thay vì file riêng); kiểu `Balance.paper`.
- [x] **T1.2** Lệnh `paperwork`, bảng luật, sổ cảnh cáo idempotent, sự kiện `CITATION`/`CONSEQUENCE`. (R1.1–R1.4, R1.6)
  - Xong: `src/paper.ts` (`judge`, `validAction`, `orderItems`, `lossOrder`), lệnh `paperwork` và `timer`, sổ cảnh cáo idempotent theo (rxId, lỗi), sự kiện `CITATION`/`CONSEQUENCE`.
- [x] **T1.3** Hậu quả theo bậc: `INTEL_LEVEL`+1 (1–2), `HFDF_FIX` 0.8 + escort + depth charge (3), `WATCH_END "executed"` (5). (R1.3–R1.5)
  - Xong: lần 1–2 `warning` + `Intel.mark()` + mất mục; 3 `located` (`HFDF_FIX` 0.8 + escort + depth charge theo lịch ngắn có chặn trên: react 20–40 s, ETA 120–240 s); 4 `severe` (0.9, 10–20 s, 60–120 s, mất thêm mục); 5 `executed` + `WATCH_END "executed"`.
- [x] **T1.4** Test: tất định, replay từ seed + log bit-exact, idempotent, ngưỡng 3 và 5. (R7.1)
  - Xong: `test/paper.test.ts` (luật, idempotent, các bậc, replay bit-exact, loss order theo seed).
- [x] **T1.5** Save: phiên bản, nạp v2, từ chối/nạp v3 sai; P5/classic không đổi hành vi. (R7.2, R7.3)
  - Xong: file save giữ v2 (thêm kiểu lệnh là tương thích ngược); `parseCommand` validate `paperwork`/`timer`; `test/g3-save.test.ts` (lưu, nạp bằng replay, save cũ vẫn nạp, store dựng lại từ log).

## Stage 2 — Sim-core: tell giấy và hạn giờ (sau Stage 1)
- [x] **T2.1** Hồ sơ giấy từ `derive(seed, "paper", rxId)`; trường công khai trong `MSG_RX`. (R2.1, R2.5, R2.6)
  - Xong: `paperOrders`, `makeProfile`, `MSG_RX.paper` (dấu in, biến thể chữ ký, sender id đã mã hóa); sự thật nằm ở `Truth.paperTells`.
- [x] **T2.2** `verifyTells` mở rộng; test bất biến D8 trên 1000 seed, dấu giả y hệt không là tell. (R2.3, R2.4)
  - Xong: `verifyPaper`/`Watch.assessPaper`; `test/paper-tells.test.ts` (300 seed cho hồ sơ, 400 seed cho bất biến D8; dấu giả y hệt không bao giờ là tell).
- [x] **T2.3** Hạn giờ theo sim-time, sự kiện/lệnh `timeout`, một lần mỗi bức điện, tắt khi không bật đồng hồ. (R4)
  - Xong: hạn 120 s sim-time từ lần `MSG_RX` đầu, chỉ khi lệnh `timer` bật, một lần mỗi bức điện, giao bức điện thì dừng; bật muộn thì tính ngay các tin quá hạn.
- [x] **T2.4** Lệnh `dispose` và lệnh lưu/hủy theo ngày. (R5)
  - Xong: lệnh `dispose` (chỉ sau khi giao), ba lệnh theo ngày `burnInput`/`archiveOutput`/`keepNothing` từ seed, lỗi `orderBreach`.

## Stage 3 — Sim-core: plugboard
- [x] **T3.1** `decipherCopy(..., plugboard?)`, validate cặp, mặc định không đổi; test hồi quy P5. (R6.2, R6.3)
  - Xong: `decipherCopy(..., plugboard?)`, `Watch.decipher(..., plugboard?)`, `validPlugboard`; plugboard không hợp lệ bị bỏ qua (dùng khóa ngày).
- [x] **T3.2** Test `senderId` mã hóa giải được bằng khóa ngày và plugboard đúng. (R2.5, R6.4)
  - Xong: `encipherSenderId`/`decipherSenderId`; test giải được bằng khóa ngày, sai plugboard hoặc indicator ra từ khác.

## Stage 4 — Desk UI (sau Stage 1–3)
- [x] **T4.1** Bảng cắm plugboard trong nắp rotor; `replayCopy` nhận plugboard; property test với plugboard bất kỳ. (R6.1, R6.2)
  - Xong: bảng cắm 26 chữ trong nắp rotor (`desk/index.ts`), `DeskMachine.plug/unplug/clearPlugs`, `replayCopy(..., plugboard)`, `hooks.decodePlugs`; lưu trong `desk.v1` (`mach.plugs`, validate bằng `validPlugboard`). Mặc định người chơi PHẢI cắm theo Orders. Property test 150 ca với plugboard bất kỳ.
- [x] **T4.2** In dấu xác thực, chữ ký, Sender ID lên Input; Daily Orders thêm mẫu chữ ký, người gửi được duyệt, lệnh lưu/hủy. (R2.2, R3)
  - Xong: mặt sau tờ Input in dấu in, chữ ký (nét ngắn, 6 biến thể) và Sender ID đọc qua máy của người chơi; Daily Orders thêm trang Authentication (mẫu chữ ký, người gửi được duyệt), Standing order, Safe waters and resupply (mục bị thu hồi hiện `[REVOKED]`).
- [x] **T4.3** Gửi `paperwork` khi đóng dấu/giao/vứt; tờ Citation; lời thoại phản ứng không lộ đúng/sai. (R1.7, D4)
  - Xong: đóng dấu, vứt thùng rác (bị từ chối nhưng bị cảnh cáo) và giao giấy gửi `paperwork`; toast cảnh cáo/hậu quả en/vi; mất mục thì Orders cập nhật; kết thúc `executed` ra màn Court-martial. Lời thoại thuyền viên vẫn chỉ dựa trên quan sát.
- [x] **T4.4** Ngăn hồ sơ và chỗ hủy giấy; đồng hồ đếm ngược sim-time. (R4.3, R5.2)
  - Xong: bảng Records sau khi giao (lưu/hủy Input và Output, hoặc không làm gì) gửi `dispose`; đồng hồ đếm ngược theo sim-time (`BALANCE.paper.deadlineSec`) và `timer` gửi qua `Actions.setTimer`.
- [x] **T4.5** Cảnh cáo trừ Ration. (R8)
  - Xong: mỗi cảnh cáo trừ 10 Ration (`penalize`), điểm chỉ do desk giữ.

## Stage 5 — Kiểm chứng G3
- [x] **T5.1** `tsc`, vitest cả hai gói, invariants D8, replay bit-exact, `git diff` sim-core đúng phạm vi đã duyệt, check-repo.
  - Xong: tsc, vitest (sim-core 95, radio-ui 177), build, validate_repo.
- [x] **T5.2** Chơi trọn ca: gây 3 cảnh cáo (lộ vị trí) và 5 cảnh cáo (kết thúc ca), reload giữa chừng, `en`/`vi`, console sạch, ảnh chụp.
  - Xong ở mức runtime Playwright: đặt máy, cắm plugboard, Sender ID, giải mã đúng; 4 cảnh cáo rồi cảnh cáo thứ 5 kết thúc ca (Court-martial); console sạch; ảnh `evidence/g3-*.png`. Chưa lái ở runtime: bảng Records sau khi giao, sát thương thân tàu do depth charge, bản `vi` của chuỗi G3.
- [x] **T5.3** Cập nhật `docs/architecture.md`, task record, báo cáo.
  - Xong: mục G3 trong `docs/architecture.md`, task record.

## G4 — Sau G3 (ngoài phạm vi spec này)
Endless (mô-đun + độ khó), mã hóa và gửi tin, Private Message, Roster. Cần spec riêng.

## Thứ tự
S0 (duyệt) → Stage 1 → 2 → 3 → 4 → 5 → spec G4.
