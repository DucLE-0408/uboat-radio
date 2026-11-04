# Desk UI G3 — Tasks

Trạng thái: **DRAFT — CHƯA DUYỆT**. Mỗi nhiệm vụ kiểm chứng được. `R#` là yêu cầu trong `requirements.md`.

## Cổng S0 — Duyệt spec (bắt buộc, chưa xong)
- [ ] **S0.1** Người vận hành duyệt `requirements.md`, `design.md` và trả lời các câu hỏi mở (design mục 8).
- **Không sửa `packages/sim-core` trước cổng này.**

## Stage 1 — Sim-core: luật, cảnh cáo, hậu quả (sau S0)
- [ ] **T1.1** `data/paper.json` + loader có validate; test dữ liệu. (R1.5, R9.1)
- [ ] **T1.2** Lệnh `paperwork`, bảng luật, sổ cảnh cáo idempotent, sự kiện `CITATION`/`CONSEQUENCE`. (R1.1–R1.4, R1.6)
- [ ] **T1.3** `WATCH_END "executed"`; hậu quả "lộ vị trí" nối vào detection/Intel. (R1.3, R1.4)
- [ ] **T1.4** Test: tất định, replay từ seed + log bit-exact, idempotent, ngưỡng 3 và 5. (R7.1)
- [ ] **T1.5** Save: phiên bản, nạp v2, từ chối/nạp v3 sai; P5/classic không đổi hành vi. (R7.2, R7.3)

## Stage 2 — Sim-core: tell giấy và hạn giờ (sau Stage 1)
- [ ] **T2.1** Hồ sơ giấy từ `derive(seed, "paper", rxId)`; trường công khai trong `MSG_RX`. (R2.1, R2.5, R2.6)
- [ ] **T2.2** `verifyTells` mở rộng; test bất biến D8 trên 1000 seed, dấu giả y hệt không là tell. (R2.3, R2.4)
- [ ] **T2.3** Hạn giờ theo sim-time, sự kiện/lệnh `timeout`, một lần mỗi bức điện, tắt khi không bật đồng hồ. (R4)
- [ ] **T2.4** Lệnh `dispose` và lệnh lưu/hủy theo ngày. (R5)

## Stage 3 — Sim-core: plugboard
- [ ] **T3.1** `decipherCopy(..., plugboard?)`, validate cặp, mặc định không đổi; test hồi quy P5. (R6.2, R6.3)
- [ ] **T3.2** Test `senderId` mã hóa giải được bằng khóa ngày và plugboard đúng. (R2.5, R6.4)

## Stage 4 — Desk UI (sau Stage 1–3)
- [ ] **T4.1** Bảng cắm plugboard trong nắp rotor; `replayCopy` nhận plugboard; property test với plugboard bất kỳ. (R6.1, R6.2)
- [ ] **T4.2** In dấu xác thực, chữ ký, Sender ID lên Input; Daily Orders thêm mẫu chữ ký, người gửi được duyệt, lệnh lưu/hủy. (R2.2, R3)
- [ ] **T4.3** Gửi `paperwork` khi đóng dấu/giao/vứt; tờ Citation; lời thoại phản ứng không lộ đúng/sai. (R1.7, D4)
- [ ] **T4.4** Ngăn hồ sơ và chỗ hủy giấy; đồng hồ đếm ngược sim-time. (R4.3, R5.2)
- [ ] **T4.5** Cảnh cáo trừ Ration. (R8)

## Stage 5 — Kiểm chứng G3
- [ ] **T5.1** `tsc`, vitest cả hai gói, invariants D8, replay bit-exact, `git diff` sim-core đúng phạm vi đã duyệt, check-repo.
- [ ] **T5.2** Chơi trọn ca: gây 3 cảnh cáo (lộ vị trí) và 5 cảnh cáo (kết thúc ca), reload giữa chừng, `en`/`vi`, console sạch, ảnh chụp.
- [ ] **T5.3** Cập nhật `docs/architecture.md`, task record, báo cáo.

## G4 — Sau G3 (ngoài phạm vi spec này)
Endless (mô-đun + độ khó), mã hóa và gửi tin, Private Message, Roster. Cần spec riêng.

## Thứ tự
S0 (duyệt) → Stage 1 → 2 → 3 → 4 → 5 → spec G4.
