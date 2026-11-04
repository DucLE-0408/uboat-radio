# P5 Radio Room Presentation — Tasks

Trạng thái: **DRAFT, chờ duyệt (Stage 1)**. Mỗi nhiệm vụ nhỏ, kiểm chứng được. `R#` là yêu cầu trong `requirements.md`. Commit **cục bộ** ở cuối mỗi stage; không push/tag/publish khi chưa được cho phép. Branch: `p5-radio-room-presentation` (xếp chồng trên PR #8).

## Stage 1 — Spec (đang làm)
- [x] **S1.1** Ba file spec P5, đổi đánh số (Bridge → P6, save slot → P7), ghi chú vào spec P4.
- **Cổng duyệt:** dừng, chờ người dùng.

## Stage 2 — Lát cắt hình ảnh đại diện (xong, chờ duyệt; xem `evidence/stage2-slice-*.png`, mở bằng `?ui=p5`)
- [x] **S2.1** `assets/` + `manifest.json` + font OFL + `tools/art/generate.mjs`; test manifest (kích thước, hash, license, TEMPORARY). (R10)
- [x] **S2.2** `scene/` hệ thống lớp + slot + `--px` scale nguyên; khung ngoài, banner (tĩnh), điện tín, dock lệnh, giấy SECRET. (R1)
- [x] **S2.3** Bàn phím máy hoạt động (chuột/chạm + `event.code`) ghi vào bản copy; modes `copy`/`focus`. (R3.1, R3.5)
- [x] **S2.4** Chụp ảnh desktop 1280/1920; kiểm console; ghi `unverified` cho thẩm mỹ.
- **Cổng duyệt:** người dùng xem lát cắt, chỉnh hướng nghệ thuật trước khi làm tiếp.

## Stage 3 — Loop, controller, store, save/replay (xong)
- [x] **S3.1** Mở rộng `FixedStepLoop` (`clamped`), `diag.ts` (khung, trần bù bước, mã lỗi). (R8.1, R11.3)
- [x] **S3.2** Save `v2` + migration từ `v1`; transcript store riêng có validate/giới hạn. (R3.3, R8.3)
- [x] **S3.3** `rebuildStore` chế độ silent; khẩn cấp chỉ nếu còn hiệu lực. (R2.4, R8.4)
- [x] **S3.4** Tương quan `AUTH_RESULT` + test nhiều `check` cùng tick. (R5.5)
- [x] **S3.5** `input/modes.ts` + test tách chế độ; `refusal.ts` chỉ nêu sự kiện quan sát. (R3.5, R6.3)

## Stage 4 — Nối toàn bộ gameplay radio và Web Audio (xong)
- [x] **S4.1** Receiver (đèn tone/sóng), phát Morse, mở âm bằng cử chỉ, dọn nguồn âm khi pause/kết thúc/unmount. (R2)
- [x] **S4.2** Máy: cửa sổ indicator 4 chữ, lamp sáng tuần tự, decipher, đánh dấu nhóm hỏng (suy từ bản copy) + số từ `damagedGroups`. (R4)
- [x] **S4.3** Điện tín: header, tells, KHỚP/KHÔNG KHỚP; lưới auth nhỏ + ngăn kéo bảng đầy đủ + lookup; challenge/reply/check. (R5)
- [x] **S4.4** Dock lệnh: repeat/challenge/check/accept/reject/report/silence; đồng hồ giờ phát; cảnh báo `HFDF_FIX`/`ESCORT`/`DEPTH_CHARGE`. (R6)

## Stage 5 — Tàu, chân dung, sonar, khẩn cấp, tổng kết, responsive
- [ ] **S5.1** Cutaway phản ánh mode/tốc độ/hull/báo động; chân dung 5 trạng thái; `decorRng` riêng. (R7.1, R7.2, R1.4)
- [ ] **S5.2** Ngăn kéo sonar + hydrophone (không khoảng cách); khẩn cấp; tổng kết ca trực + chơi lại. (R7)
- [ ] **S5.3** Responsive: tablet 768–1024, mobile 320–480 (tab + ngăn kéo, mục tiêu chạm ≥ 44 px); reduced-motion; focus. (R9)
- [ ] **S5.4** `?ui=classic` giữ P4 làm dự phòng.

## Stage 6 — Kiểm chứng, tài liệu, báo cáo
- [ ] **S6.1** `tsc` strict cả hai gói; `vitest` sim-core (70) + radio-ui; invariants (grep `truthOf`, barrel-only, không Intel/hazard, không `innerHTML`); `git diff --stat packages/sim-core` rỗng; `python3 -I scripts/validate_repo.py`.
- [ ] **S6.2** Chromium: chơi trọn ca trực (receive, copy, decipher, challenge, repeat, lệnh bị từ chối, khẩn cấp, pause/resume, reload, tổng kết); ảnh ở 320–480, 768–1024, 1280+; console sạch; đọc số đo `?diag=1`.
- [ ] **S6.3** `docs/architecture.md`, ADR alias linking, nâng cấp/hoàn tác; cập nhật task record; hoàn tất task bằng `scripts/complete-task.ps1` tương đương (không có PowerShell trong cloud).
- [ ] **S6.4** Báo cáo cuối: liên kết kiến trúc, file đổi, bất biến gameplay, nguồn gốc asset (TEMPORARY), bảo mật/quan sát, kết quả kiểm chứng chính xác, giới hạn còn lại, các bước hoàn tác.

## Thứ tự
S1 → (duyệt) → S2 → (duyệt) → S3 → S4 → S5 → S6.
