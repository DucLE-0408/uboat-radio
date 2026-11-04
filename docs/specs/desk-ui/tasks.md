# Desk UI — Tasks

Trạng thái: **ĐÃ DUYỆT 2026-11-04**. `R#` là yêu cầu trong `requirements.md`. Mỗi nhiệm vụ nhỏ, kiểm chứng được. Commit chỉ khi người dùng cho phép; không push/tag/publish khi chưa được duyệt.

## Stage 0 — Duyệt spec
- [x] **S0.0** Quyết định §13 (khóa ngày, mặc định, font, tên điểm) đã trả lời.
- [x] **S0.1** Người dùng duyệt ba file spec (2026-11-04).
- **Cổng duyệt:** chưa duyệt thì không viết code.

## G1 — Bàn làm việc chơi được (chỉ trình bày, sim-core không đổi)

### Stage 1 — Khung và lát cắt hình ảnh (chờ duyệt hình)
- [x] **T1.1** `src/i18n/` (`en`, `vi`, `t()`), test đủ khóa; chọn ngôn ngữ trong Settings; thêm subset font tiếng Việt (hash + OFL). (R11)
  - Silkscreen **không có** subset tiếng Việt (@fontsource/silkscreen@5.3.0 chỉ có latin, latin-ext). Thêm `vt323-vietnamese-400-normal.woff2` từ @fontsource/vt323@5.3.0 (sha256 84b335a5…, cùng OFL). Desk ở `vi` dùng VT323 cho nhãn; các điểm mã tiếng Việt của Silkscreen mượn glyph VT323. Menu chính mới có mục chọn ngôn ngữ, chưa dịch toàn bộ.
- [x] **T1.2** `src/desk/` mount theo `?ui=desk`; khung 640×360 scale nguyên; cutaway P5 tái dùng. (R1, R9.1)
  - Dưới 1280×720 hiện thông báo kèm liên kết sang phòng điện đài. `?lang=en|vi` ghi đè Settings. Settings có thêm `ui: "desk"`, `lang`.
- [x] **T1.3** Art lát cắt: mặt bàn, cột trái, bảng điều khiển, Teletyper, Echo Stamper, một tờ Input hai mặt. (R1.2)
  - `tools/art/desk.ts`: 11 sprite TEMPORARY (desk-bg, desk-door, desk-controls, desk-tty, desk-tty-lamp, desk-stamper, desk-st-switch, desk-st-lamp, desk-machine-tab, paper-input 2 mặt, desk-mission). Tờ Input mặt trước đọc tin hiện tại từ store (`watch.copy(tokens)`), nút lật là trạng thái trình bày.
- [x] **T1.4** Ảnh chụp lát cắt; so với tham chiếu; ghi `unverified` cho thẩm mỹ.
  - `evidence/stage1-*.png` (en/vi, 1280/1920, mặt sau, cửa sổ 1024). Thẩm mỹ so với tham chiếu: `unverified`, chờ người dùng.
- **Cổng duyệt:** người dùng xem lát cắt trước khi nhân rộng.

### Stage 2 — Giấy và Teletyper
- [ ] **T2.1** Mô hình giấy + test: lật, kéo thả, đường thay thế bàn phím, xếp chồng, `desk.v1` có validate. (R2)
- [ ] **T2.2** Teletyper: đèn, in dần `watch.copy(tokens)` theo nhịp Morse, nút xin lặp, silent rebuild. (R3)
- [ ] **T2.3** Tờ Output: bản rõ theo nhóm, đánh dấu nhóm hỏng. (R4.2)

### Stage 3 — Máy, đóng dấu, giao
- [ ] **T3.1** Máy Enigma G1: gõ phím ghi copy, lampboard, kéo ra/vào. (R4.1)
- [ ] **T3.2** Echo Stamper: công tắc, đèn, tay đóng → đúng một `resolve`; dựng lại dấu từ `MSG_RESOLVED`; test. (R6.1–R6.3)
- [ ] **T3.3** Dấu thường hai màu, bút ký, ghim, giao cho người ở cửa, thùng rác + luật. (R6.4–R6.6)
- [ ] **T3.4** Mission tự tick. (R7)

### Stage 4 — Người, thoại, tàu, tài liệu
- [ ] **T4.1** Chân dung người ra vào + Transcript + bảng thoại `en`/`vi` theo sự kiện. (R8)
- [ ] **T4.2** Bảng điều khiển tàu; ngăn kéo sonar/auth; khẩn cấp. (R9.2–R9.3)
- [ ] **T4.3** Daily Orders tĩnh và Manual (văn bản mới, hai ngôn ngữ). (R5.1, R5.3)

### Stage 5 — Kiểm chứng G1
- [ ] **T5.1** `tsc`, vitest cả hai gói, invariants, `git diff packages/sim-core` rỗng, `check-repo`.
- [ ] **T5.2** Chơi trọn ca `?ui=desk` qua Edge headless; reload; `en`/`vi`; ảnh chụp; console sạch.
- [ ] **T5.4** Đổi mặc định sang Desk, P5 thành tùy chọn Settings. (D7)
- [ ] **T5.3** Cập nhật `docs/architecture.md`, task record, báo cáo.

## G2 — Máy thật, khóa ngày, điểm
- [ ] **T6.1** Máy giả lập bằng `Enigma` + `dayEnigma`; công tắc nguồn; nắp rotor; lăn chuột đặt 4 vòng; odometer + double-step; đồng bộ lại theo nhóm. Property test so với `decipherCopy`. (R4.3–R4.7)
- [ ] **T6.2** Daily Orders in khóa ngày (Obscura Setup). (R5.2)
- [ ] **T6.3** Điểm +1/−1, màu xanh/đỏ, thưởng hoàn thành, lưu `desk.v1`. (R10.1, R10.2, R10.4)
- [ ] **T6.4** Đồng hồ 2 phút tùy chọn (chỉ báo). (R10.3)
- [ ] **T6.5** Kiểm chứng G2 như T5.

## G3 — Cần spec sim-core riêng (chưa làm)
- Citation và hậu quả (3 lần: nguy hiểm, lộ vị trí; 5 lần: bị xử tử); lỗi đóng sai màu, vứt sai giấy, hết giờ thành lệnh có log.
- Tell dạng giấy tờ: dấu xác thực in sẵn (không có / thật / giả y hệt), chữ ký so mẫu, người gửi được duyệt, Sender ID mã hóa; giữ bất biến "tin giả luôn có ít nhất một tell".
- Plugboard cắm dây; lưu trữ hoặc hủy giấy theo lệnh; tin tức dùng để soát nội dung.

## G4 — Sau G3
- Endless (mô-đun + độ khó), mã hóa và gửi tin, Private Message, Roster.

## Thứ tự
S0 → (duyệt) → Stage 1 → (duyệt hình) → Stage 2 → 3 → 4 → 5 → G2 → spec G3.
