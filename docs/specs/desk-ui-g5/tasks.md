# Desk UI G5 — Tasks

Trạng thái: **ĐÃ DUYỆT 2026-11-05**.

## Stage 1 — Sim-core
- [x] **T1.1** Cân bằng `move`/`nav`, kind `MOVE`, tell hợp lệ, `assessTells` bỏ grid/bearing cho `MOVE`; test D8 trên nhiều seed. (R1.1, R1.2, R1.7, R1.8)
  - Xong: `balance.json` `move`/`nav`; `MOVE` trong `messages.ts` (`posToGrid`, `moveBrief`, nội dung `NAVIGATIONSBEFEHL ZIEL <ô> FRIST <phút> MINUTEN`); pool tell của `MOVE` chỉ fist/timestamp, `verifyTells` và `assessTells` bỏ grid/bearing cho `MOVE`. Test 300 seed × 5 mức Intel: tin thật không có tell, tin giả luôn còn ≥1.
- [x] **T1.2** Mô-đun `map` trong options; Endless chọn `MOVE`; lệnh hiệu lực, `ORDER_ACCEPTED/REACHED/FAILED`, thu hồi tiếp tế, PM `orderFailed`. (R1.3–R1.6, R4.5, R6.1)
  - Xong: mô-đun `map` (thiếu `map` trong save cũ = bật); Endless chọn `MOVE` khi `map` bật; lệnh hiệu lực (`ORDER_ACCEPTED` khi chấp nhận, kể cả lệnh giả), `ORDER_REACHED` (≤ 5 km theo vị trí thật), `ORDER_FAILED` (thu hồi điểm tiếp tế trước, PM `orderFailed` từ Thuyền trưởng, không phải cảnh cáo).
- [x] **T1.3** `navFix()` dead-reckoning; test tất định, không đổi log ca trực thường (D10), replay bit-exact. (R2, R6.2)
  - Xong: `Watch.navFix()` (ước lượng = thật + trôi 3% quãng đường, vòng sai số 0.3 km + 3%), luồng `derive(seed,"drift")` chỉ rút khi tàu di chuyển; test: bắt đầu chính xác, trôi trong vòng sai số, replay giống hệt, log ca trực thường không đổi dù gọi `navFix()`.

## Stage 2 — Helm và bản đồ (sau Stage 1)
- [x] **T2.1** Màn Helm: la bàn, bánh lái, cần tốc độ, chế độ độ sâu, số đọc; ẩn bộ phận lái trên bàn điện báo. (R3)
  - Xong: `desk/helm.ts` màn Helm (nút LÁI/HELM trong bảng điều khiển tàu, Esc để đóng): la bàn xoay theo hướng + kim hướng lệnh, bánh lái kéo bằng con trỏ hoặc phím mũi tên, nút ±1°/±10°, tốc độ −/+, nổi/kính tiềm vọng/lặn, số đọc; cần gạt độ sâu và tốc độ trên bàn điện báo bị ẩn (im lặng, báo cáo, đồng hồ phát ở lại).
- [x] **T2.2** Bản đồ SVG ba mức phóng, nhãn tọa độ, vị trí ước lượng + vòng sai số + vệt, đích và hạn chót, điểm an toàn/tiếp tế, bấm để đặt hướng. (R4)
  - Xong: bản đồ SVG ba mức phóng (60 km lưới 10 km nhãn `AB12`, 600 km, toàn cục 26×26 với dải đất liền), vị trí ước lượng + vòng sai số + vệt, đích với vòng bán kính tới và hạn chót, điểm an toàn/tiếp tế còn trên Orders, bấm để đặt hướng; ẩn khi mô-đun `map` tắt.
- [x] **T2.3** Store và desk xử lý sự kiện lệnh: thưởng/phạt Ration, toast, Orders cập nhật; menu Endless có mô-đun `map`. (R5)
  - Xong: store (`moveOrder`, `ordersReached`, `ordersFailed`), desk thưởng +30 / phạt −25 Ration và toast, Orders gạch điểm bị thu hồi, menu Endless có mô-đun `map` (nhãn điểm cao 7 bit, nhãn cũ 6 bit vẫn đọc được).

## Stage 3 — Kiểm chứng
- [x] **T3.1** `tsc`, vitest cả hai gói, replay, `git diff` sim-core đúng phạm vi, validate_repo.
  - Xong: tsc cả hai gói, sim-core 123, radio-ui 194 test, build, validate_repo.
- [x] **T3.2** Chạy Endless: nhận lệnh di chuyển, chấp nhận, lái bằng Helm tới đích; một lần hết hạn; `en`/`vi`; console sạch; ảnh chụp.
  - Xong ở mức runtime Playwright: Helm (điều khiển, kéo bánh lái, bấm bản đồ, đổi tỷ lệ, Esc); Endless: giải mã được `NAVIGATIONSBEFEHL`, chấp nhận qua dấu Echo ("Movement order LM14 accepted"), nạp lại trang vẫn giữ lệnh, lái bằng bản đồ tới đích ("Position reached. HQ is satisfied.", +30 Ration); console sạch. Ảnh `evidence/g5-*.png`. Chưa lái ở runtime: nhánh hết hạn (chỉ test đơn vị), bản `vi` của Helm, chấp nhận nhầm lệnh di chuyển giả.
- [x] **T3.3** Cập nhật `docs/architecture.md`, task record.
  - Xong: mục G5 trong `docs/architecture.md`, task record.
