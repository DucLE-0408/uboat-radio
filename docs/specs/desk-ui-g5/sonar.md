# Desk UI G5 addendum: sonar screen and mechanics

Trạng thái: **ĐÃ DUYỆT 2026-11-05** (người vận hành: "cải thiện màn hình sonar và các cơ chế liên quan", sau đó "ok, toàn quyền"; gói 1 đến 7 theo đề xuất đã nêu; chưa có thiết kế Pencil, nên UI chỉ mở rộng trong hệ thiết kế ngăn kéo hiện có).

## Sim (`SIM_VERSION` 3)

1. WHERE module `weather` bật THE SYSTEM SHALL dùng cấp sóng liên tục của thời tiết (`weather.at(t).sea`) làm cấp sóng cho tiếng ồn sonar (`Watch.listen`, quét `scanSonar`) thay cho hằng `watch.seaState` (3). WHERE tắt module hoặc ca đêm THE SYSTEM SHALL giữ hằng cũ (bit-identical).
2. WHERE module bật THE SYSTEM SHALL nhân tốc độ khoá ASDIC với `asdicSeaFactor(sea)`: 1 khi cấp sóng ≤ `calmSeaState` (3), giảm tuyến tính xuống `asdicMinFactor` (0,6) ở cấp 8. Số lần rút ngẫu nhiên không đổi, chỉ đổi xác suất.
3. THE SYSTEM SHALL xuất `detectRangeKm(srcLevelDb, seaState, speedKn)`: tầm nghe tối đa của một nguồn ồn cho trước, tính bằng chia đôi trên ngân sách `SL − NL − ngưỡng` và tổn hao truyền. Đây là năng lực nghe của ta, không nói gì về vị trí ai.

## UI (ngăn kéo sonar)

4. THE DRAWER SHALL hiện vệt hướng (canvas 360×100: hướng ngang, thời gian dọc, mới nhất ở trên, 10 phút gần nhất, màu theo lớp, đậm theo dải tín hiệu, mũi tàu đánh dấu ở trên). Lịch sử chỉ dựng từ các quan sát hydrophone, giới hạn 600 s và 1500 điểm, rỗng sau khi tải lại.
5. THE DRAWER SHALL hiện dải tín hiệu thô (yếu < 6 dB, rõ < 14 dB, mạnh) bằng chữ trong bảng và bằng kích thước và độ đậm chấm trên vòng; chấm vẫn ở bán kính cố định (không có khoảng cách).
6. THE DRAWER SHALL hiện điều kiện nghe: ồn của ta (theo tốc độ), ồn biển (từ cấp sóng ĐÃ BÁO CÁO, mặc định cấp 3 khi chưa có), tầm nghe tàu buôn và tầm tốt nhất ở cấp biển này, kết luận TỐT/TẠM/KÉM (tỉ lệ ≥ 0,85 / ≥ 0,5) và lời khuyên (tạo bọt khí: dưới 7 kn; ồn của ta là giới hạn: giảm tốc).
7. WHEN `ASDIC_PING` THE DRAWER SHALL hiện biểu ngữ "ASDIC KHÓA" 40 s (nhấp nháy, tắt khi giảm chuyển động); không hiện hướng hay khoảng cách (giữ D3 như nhật ký).
8. THE UI SHALL đưa mọi chữ của ngăn kéo sang i18n en/vi, nhãn aria cho vệt và bảng, vùng aria-live cho điều kiện nghe và biểu ngữ.

## Ghi chú
- Bão giờ có hai mặt: làm tàu nổi chậm và làm ta khó nghe hơn, nhưng cũng làm ASDIC khó khoá.
- Ngoài phạm vi: ước lượng khoảng cách (TMA), tầng nhiệt, nghe chủ động.
