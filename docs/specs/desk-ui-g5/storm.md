# Desk UI G5 addendum: storms slow the boat

Trạng thái: **ĐÃ DUYỆT 2026-11-05** (người vận hành: "thêm luật bão làm tàu chậm", sau đó "ok, toàn quyền"; quyết định theo đề xuất đã nêu: bão là hệ quả của cấp sóng, thuộc module `weather`, không đổi công thức hạn lệnh di chuyển, không đổi hazard bị nhìn thấy).

## Yêu cầu

1. WHERE module `weather` bật THE SYSTEM SHALL tính hệ số biển `seaSpeedFactor(sea)`: 1 khi cấp sóng ≤ `calmSeaState` (3), giảm tuyến tính xuống `stormMinFactor` (0,55) ở cấp sóng 8. Cấp sóng liên tục `sea` (0..8) đi theo gió (`force × 0,9`).
2. WHILE tàu nổi THE SYSTEM SHALL nhân trần tốc độ nổi (`maxSpeedSurfaceKn`) với hệ số đó; ở độ sâu kính tiềm vọng nhân trần tốc độ lặn với `1 − (1 − hệ số)/2`; lặn sâu không đổi. Đặt trước `Boat.tick` mỗi tick qua `Boat.setSeaFactor`; tăng/giảm tốc vẫn theo gia tốc cũ.
3. THE SYSTEM SHALL gọi gió cấp ≥ `stormForce` (7) là bão. Cấp gió rút từ `rand^2` (thay `rand^1.3`) để bão chiếm khoảng 13% thời gian.
4. THE SYSTEM SHALL không đổi công thức hạn lệnh di chuyển (`assumedKn`) và hazard bị nhìn thấy: lách bão hoặc lặn là quyết định của người chơi.
5. WHERE ca không có options hoặc module tắt THE SYSTEM SHALL giữ nguyên tốc độ (D10).
6. THE DESK SHALL đọc **cấp sóng đã báo cáo** (không phải giá trị thật, D3) để hiện trên Helm dòng "BIỂN ĐỘNG: TỐI ĐA ~N kn" (hoặc "BÃO: …" khi gió báo ≥ 7) khi trần nổi thấp hơn 17 kn và báo cáo mới hơn 40 phút, và một toast khi báo cáo chuyển sang bão.
7. THE SYSTEM SHALL tăng `SIM_VERSION` lên 2: save cũ không còn tiếp tục được.

## Ghi chú
- Giá trị trên Helm là ước lượng từ cấp sóng làm tròn của báo cáo cầu tàu (nhiễu), nên có thể lệch vài kn so với trần thật.
- Mọi con số nằm trong `balance.json` (`weather.calmSeaState`, `stormMinFactor`, `stormForce`).
