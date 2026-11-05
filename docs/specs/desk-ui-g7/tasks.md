# Desk UI G7 — Tasks

Trạng thái: **CHỜ DUYỆT**. Mỗi nhiệm vụ kiểm chứng được. `R#` là yêu cầu trong `requirements.md`. Giao diện thuần túy: **không sửa `packages/sim-core`** ở bất kỳ giai đoạn nào.

## Cổng S0 — Duyệt spec (bắt buộc, chưa xong)
- [x] **S0.1** Người vận hành trả lời các câu hỏi mở (design mục 8) — 2026-11-05.
- [ ] **S0.2** Người vận hành duyệt ba file (đã sửa theo các câu trả lời) và ảnh phác bố cục (AGENTS.md mục 2.7); vị trí chính xác chốt bằng ảnh chụp thật ở T1.
- [ ] **S0.3** Spec `desk-ui-g8/` (Dashboard) được duyệt, vì T4.4 và T5 phụ thuộc R11.

## Stage 1 — Hình và bố cục (sau S0)
- [ ] **T1.1** Sprite mới trong `tools/art/desk.ts` (`desk-cabinet`, `desk-orders-drawer`, `desk-stamp`, `desk-handle-r`); `node tools/art/generate.ts` chỉ thêm các sprite này. (R9.4)
- [ ] **T1.2** Khung tĩnh: vẽ tủ kéo trái (đóng/mở), hộc Orders, cây ấn + hai ô mực + bút, ba tay nắm phải, chưa có logic; ảnh chụp 1280px để người vận hành duyệt vị trí. (R1.1, R3.1, R4.1, R6.1)

## Stage 2 — Mô hình tủ và giấy (thuần, có test)
- [ ] **T2.1** `desk/cabinet.ts`: `Compartment`, `compartmentFor`, `acceptsCab`; test nhận loại nào, thả sai ngăn. (R1.2, R1.3)
- [ ] **T2.2** `PaperModel.stow`/`pull`, `place` mới `cab:*`, nhóm kẹp, giao nộp chỉ tính tờ trên bàn; test. (R1.3, R1.5, R8.5)
- [ ] **T2.3** `parseLayout`/`parseExtra` đọc và kiểm `cab` và `place` mới; test dữ liệu giả, bản cũ, bản lệch. (R7)

## Stage 3 — Ấn và mực
- [ ] **T3.1** `desk/ink.ts` (máy trạng thái) và test: không đóng khi chưa có mực, một lần chấm một dấu, không lưu qua tải lại. (R4.2–R4.4, R4.7)
- [ ] **T3.2** Nối vào `applyTool` (thay nhánh `blue`/`red`), con trỏ theo trạng thái, `actions.paperwork` không đổi. (R4.5)
- [ ] **T3.3** Lớp công cụ cầm bằng chuột (`held`: ấn, kẹp, bút), con trỏ đi theo chuột, trả về chỗ đặt bằng bấm hoặc Esc; cảm ứng "chạm công cụ, chạm đích". (R4.2, R4.3)
- [ ] **T3.4** Cách dùng bàn phím tương đương (chọn ấn, chọn mực, đóng lên tờ đang chọn); kiểm với `input/keymap.ts` để không đụng phím có sẵn. (R4.7)

## Stage 4 — Tủ kéo trái và Orders
- [ ] **T4.1** Tủ kéo trái: kéo, bấm, Enter, hoạt ảnh trượt, Esc đóng, `aria-expanded`. (R1.1, R1.6, R9.2)
- [ ] **T4.2** Chuyển thùng rác vào ngăn trên: nhận mọi loại trừ Input; Input bị từ chối và sim vẫn trích `wrongBin`; Output/slip/encode bỏ rác không gọi `bin`; xác nhận khi bỏ Output chưa giao nộp; nút bàn phím giữ. Test. (R2)
- [ ] **T4.3** Kẹp vào ngăn giữa, cầm bằng chuột, gắn vào tờ rồi kéo tờ thả lên Input để liên kết (`attachClip`, `clipTo`); test các từ chối. (R5)
- [ ] **T4.4** Tủ Orders riêng, bỏ Orders/Manual khỏi ngăn dụng cụ cũ; đặt vào vùng bảng điều khiển đã dời (sau T1.1 của G8). (R3, R11)
- [ ] **T4.5** Giao nộp thiếu Echo: bỏ nhánh từ chối `noEcho`, gọi `paperwork` với `echo: false`, trạng thái thất bại trên Mission kèm số cảnh cáo, không trừ Ration thêm (lỗi tính là một trong năm cảnh cáo của sim); test. (R10)

## Stage 5 — Ba máy cất được
- [ ] **T5.1** Lớp trượt bọc `tty`, `stamper`, `machine`; tay nắm chung; `inert` khi cất. (R6.1, R6.2, R6.5)
- [ ] **T5.2** Lời nhắc khi thao tác cần máy đang cất; kiểm Teletyper cất vẫn in đủ tin, Mission không kẹt. (R6.3, R6.4)

## Stage 6 — Giấy lấy ra từ ngăn
- [ ] **T6.1** `syncPapers` cất Output/slip/encode vào ngăn của chúng; kéo ra khi cần. (R8.2, R8.4)
- [ ] **T6.2** Lời nhắc khi gõ bản sao mà chưa có giấy giải mã; kiểm không mất ký tự. (R8.3)

## Stage 7 — Hoàn thiện
- [ ] **T7.1** Chuỗi `en.ts`/`vi.ts`; ảnh chụp EN và VI ở 1280px, 1920px, 1024px; không cắt chữ. (R9.1, R9.3)
- [ ] **T7.2** Chạy thật trong trình duyệt: mở/đóng từng tủ và máy, kéo giấy vào ra, chấm mực và đóng dấu, tải lại giữ nguyên; ghi bằng chứng vào `docs/specs/desk-ui-g7/evidence/`.
- [ ] **T7.3** `tsc --noEmit`, `vitest run` (radio-ui và sim-core), `scripts/check-repo.ps1` xanh; cập nhật `docs/specs/README.md`, `docs/architecture.md`; đóng task record. (D1′, D9)
