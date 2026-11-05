# Desk UI G5 addendum: water temperature, thermocline and the temperature chart

Trạng thái: **ĐÃ DUYỆT 2026-11-05** (người vận hành: "thêm bản đồ nhiệt độ nước", sau đó "ok, toàn quyền"; quyết định theo đề xuất đã nêu, gồm cả việc tầng nhiệt giúp trốn ASDIC). Không có thiết kế Pencil: UI chỉ mở rộng Helm và ngăn kéo sonar hiện có.

## Sim (`SIM_VERSION` 5)

1. THE SYSTEM SHALL thêm module `water` (mặc định bật, tắt được trong menu Endless; save không có khoá này được hiểu là bật; nhãn điểm có thêm một bit). WHERE ca không có options hoặc module tắt THE SYSTEM SHALL không có nước, không phát sự kiện nhiệt nào và không đổi gì (D10).
2. THE SYSTEM SHALL tính nhiệt độ nước như **hàm thuần của (seed, vị trí)** (`water.ts`): khí hậu trơn (`baseC` 14 °C, +1,5 °C mỗi 100 km về phía nam, mát `coastCoolC` 3 °C tới sát bờ với thang 25 km) cộng 8 xoáy Gauss có gốc từ `derive(seed,"water")` (bán kính 8–25 km, biên độ tới ±3,5 °C). Độ sâu tầng nhiệt đi theo nhiệt độ (lạnh 8 °C tới ấm 20 °C ứng với 30 tới 90 m). Thời gian không ảnh hưởng (khác đề xuất ban đầu: không có biến thiên theo giờ).
3. WHILE tàu ở độ sâu lớn hơn tầng nhiệt tại vị trí THẬT THE SYSTEM SHALL trừ `hydroLossDb` (20 dB) khỏi SNR của mọi liên lạc hydrophone (tàu mặt nước bị át tiếng), và nhân tốc độ khoá ASDIC với `asdicBelowLayerFactor` (0,35), cùng với hệ số cấp sóng.
4. THE SYSTEM SHALL phát `WATER_SAMPLE { tSec, tempC, layerM, xKm, yKm }` mỗi `sampleEverySec` (60 s): nhiệt kế của tàu đọc nước thật tại vị trí thật, kèm nhiễu (±0,3 °C, ±5 m, hai số rút cố định, tầng làm tròn 5 m), nhưng báo cáo ở vị trí ƯỚC LƯỢNG (`navFix`), nên chấm đo mang sai số hoa tiêu.
5. THE SYSTEM SHALL cung cấp `Watch.chartWater(x, y)`: khí hậu đã khảo sát (không có xoáy), làm tròn 0,5 °C và 5 m; null khi không có module.

## UI

6. THE HELM SHALL có nút "NHIỆT" bật tắt lớp phủ trên hải đồ (ở hai mức phóng to gần): ô khí hậu tô theo thang lạnh-xanh dương, vừa-xanh lá, ấm-hổ phách (độ sáng tăng theo nhiệt độ, không chỉ dựa vào màu), chú giải có số 8 ° và 20 °, các chấm đo của tàu kèm số độ ở mức phóng to gần nhất. Dòng đo "BIỂN 13,3 °C · TẦNG ~55 m" trong bảng đo khi số đo mới hơn 10 phút.
7. THE SONAR DRAWER SHALL thêm dòng điều kiện nghe: tàu đang ở dưới hay trên tầng đo gần nhất (kèm độ sâu tầng) và hệ quả (tàu mặt nước bị át tiếng, ASDIC yếu).
8. THE UI SHALL không bao giờ đọc nước thật: chỉ số đo (nhiễu, ở vị trí ước lượng) và khí hậu công bố.

## Ghi chú
- Lặn xuống dưới tầng là cách trốn ASDIC, đổi lại ta nghe kém tàu mặt nước. Với tầng sâu 30 tới 90 m và độ sâu lặn 60 m, ở nước lạnh (tầng nông) lặn sẽ ở dưới tầng, ở nước ấm (tầng sâu) thì không: xoáy ấm và lạnh có ý nghĩa chiến thuật.
- Test chốt phiên bản đã có đoạn lặn nên bao được thay đổi này; digest và `SIM_VERSION` cập nhật cùng lúc.
- Ngoài phạm vi: pin, tốc độ âm chi tiết, dòng chảy, mùa.
