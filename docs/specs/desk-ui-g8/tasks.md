# Desk UI G8 — Tasks (bản nháp)

Trạng thái: **BẢN NHÁP, CHỜ DUYỆT**. Mỗi nhiệm vụ kiểm chứng được. `R#` là yêu cầu trong `requirements.md`.

## Cổng S0 — Duyệt spec (bắt buộc, chưa xong)
- [ ] **S0.1** Người vận hành trả lời các câu hỏi mở (design mục 5) và duyệt ba file.
- [x] **S0.2a** Tra giấy phép nguồn dữ liệu bản đồ (design mục 4): Natural Earth và GEBCO đều ở miền công cộng; kết quả dựa trên bản sao điều khoản, nên phải đọc lại trang chính thức lúc nạp (T3.1).
- [ ] **S0.2b** Duyệt ảnh phác Dashboard (AGENTS.md mục 2.7).
- [ ] **S0.3** Cổng sửa `packages/sim-core` được mở rõ ràng (R4); chưa duyệt thì chỉ làm Stage 1.

## Stage 1 — Dashboard khung và điều khiển dời từ bàn (mở khóa G7 T4.4)
- [ ] **T1.1** Màn hình Dashboard khung: bật/đóng, giữ sim chạy; dời cần độ sâu, tốc độ, Silence, Report, đồng hồ TX từ bàn sang Dashboard giữ chức năng và phím tắt; giải phóng vùng `{8,240,132,112}` của bàn. (R1.1, R1.2, G7 R11)
- [ ] **T1.2** Quyết định thay hay thêm Helm (câu hỏi mở 1); chuyển nội dung Helm nếu thay. (R1.3)

## Stage 2 — Công cụ thước và compa (thuần, chạy trên bản đồ hiện có)
- [ ] **T2.1** `desk/chart-tools.ts` (`ruler`, `dividers`) và test. (R3.1, R3.2)
- [ ] **T2.2** Lớp vẽ thước/compa trên bản đồ, kéo bằng chuột, bàn phím tương đương, xóa được. (R3.3, R3.5)

## Stage 3 — Sim-core: bản đồ thật và định vị (cổng riêng)
- [ ] **T3.1** Đọc lại điều khoản Natural Earth và GEBCO trên trang chính thức; script ngoại tuyến rút gọn dữ liệu bản đồ, tệp JSON có băm, ghi nguồn, phiên bản, ngày tải và giấy phép vào `docs/`. (R2.1, R2.4)
- [ ] **T3.2** `WatchOptions.world: "classic" | "ww2"`, cảng xuất phát làm `origin`, `SIM_VERSION` tăng, test replay bit-exact. (R2.2, R4.1, R4.4)
- [ ] **T3.3** Lệnh `fix` và `actions.fix`; kiểm tra phạm vi; test tất định. (R3.4, R4.2)
- [ ] **T3.4** Nối va chạm bờ lên bản đồ thật; các luật G5 còn lại nối từng cái hoặc ghi rõ tạm tắt. (R4.3)

## Stage 5 — Lưới đồng hồ, chu kỳ 24 giờ, đếm ngược
- [ ] **T5.1** Lưới ô đồng hồ trên Dashboard từ dữ liệu sim hiện có; ô cảnh báo có chữ; thêm ô chỉ là thêm mục định nghĩa. (R1.2)
- [ ] **T5.2** Tạm dừng đồng hồ đếm ngược: `timer` tắt mặc định ở ván mới, ô ẩn, mã và luật `timeout` giữ nguyên; ván cũ replay đúng. (R7)
- [ ] **T5.3** `daypart` và `terrainOf` thuần, có test; khung tàu ghép lớp trời, biển, đất, thời tiết; cross-fade và chế độ giảm chuyển động. (R6.1–R6.4)
- [ ] **T5.4** (tùy chọn, sau cổng sim-core) đồng hồ cần trạng thái mới: ắc quy, oxy, nhiên liệu, độ nghiêng; `SIM_VERSION` riêng. (R1.4, R4.5)

## Stage 6 — Dòng thời gian lịch sử (cổng nghiên cứu nguồn)
- [ ] **T6.1** Nghiên cứu sự kiện quanh 17/03/1942 từ tài liệu công khai; danh sách có nguồn trích dẫn để người vận hành duyệt. (R5.1–R5.3)
- [ ] **T6.2** `history.json` và script kiểm tra (nguồn, ngày, nhãn hư cấu); nạp qua `WatchOptions.world: "ww2"`; sự kiện tất định theo ngày ván; test. (R5.2, R5.4)
- [ ] **T6.3** Hiệu ứng từng loại sự kiện (vùng cấm/mìn, đoàn tàu, đổi mật mã) và mục "dòng thời gian" trong Manual có nhãn thật/hư cấu. (R5.3, R5.5)

## Stage 4 — Nối UI và hoàn thiện
- [ ] **T4.1** Dashboard hiện bản đồ thật, cảng xuất phát, mốc định vị; lui về bản đồ cũ khi thiếu hay hỏng dữ liệu. (R2.3, R2.4)
- [ ] **T4.2** Định vị từ mốc bằng thước rồi gửi `fix`; ảnh chụp EN và VI ở 1280px, 1920px, 1024px. (R3.4, R1.4)
- [ ] **T4.3** `tsc --noEmit`, `vitest run` (radio-ui và sim-core), `scripts/check-repo.ps1` xanh; cập nhật `docs/specs/README.md` và `docs/architecture.md`; đóng task record.
