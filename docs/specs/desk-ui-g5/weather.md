# Desk UI G5 addendum: weather and visibility

Trạng thái: **ĐÃ DUYỆT 2026-11-05** (người vận hành: "thêm luật thời tiết ảnh hưởng tầm nhìn", sau đó "ok, toàn quyền"; quyết định theo đề xuất đã nêu: tầm nhìn cho cả hộ tống nhìn thấy tàu ta và hiển thị trên hải đồ; thời tiết là module riêng, không tác động ngoài tầm nhìn).

## Yêu cầu

1. THE SYSTEM SHALL thêm module `weather` (mặc định bật, tắt được trong menu Endless, độc lập với độ khó). Save cũ không có khoá này được hiểu là bật. WHERE ca không có options hoặc module tắt THE SYSTEM SHALL không có thời tiết, không phát sự kiện thời tiết nào và không rút thêm số ngẫu nhiên (D10).
2. THE SYSTEM SHALL tính thời tiết như **hàm thuần của (seed, thời gian)** (`weather.ts`): `knotCount` (48) điểm nút cách nhau `knotSec` (1800 s) lấy một lần từ `derive(seed,"weather")`, nội suy mượt và quay vòng. Tầm nhìn `visKm` trong [1, 20] km (thiên về quang), gió (hướng, cấp 1–9) và cấp sóng 0–8 theo gió.
3. WHILE tàu ở độ sâu ≤ kính tiềm vọng + 1 m THE SYSTEM SHALL phát `WEATHER_REPORT { tSec, visKm, windDeg, force, seaState }` mỗi `reportEverySec` (600 s) từ cầu tàu. Giá trị là **ước lượng có nhiễu** (±`reportNoise` = 20% với tầm nhìn; hướng gió làm tròn 10°); UI không bao giờ thấy giá trị thật (D3).
4. WHILE tàu nổi hoặc ở độ sâu kính tiềm vọng THE SYSTEM SHALL tính hazard bị tàu hộ tống nhìn thấy: `sightHazardPerSecClear × clearness(visKm) × phơi bày × (1 + intelHazardStep × cấp Intel)`, với `clearness` = 0 ở sương mù (1 km) tới 1 ở quang đãng (20 km), phơi bày 1 khi nổi và `periscopeFactor` (0,25) ở độ sâu kính tiềm vọng; lặn sâu thì bằng 0. Mỗi tick rút một số từ dòng riêng `derive(seed,"sight")`.
5. WHEN bị nhìn thấy và không trong thời gian nguội (`cooldownSec`) THE SYSTEM SHALL phát `SIGHTED { tSec, visKm }` và lên lịch `ESCORT_DISPATCHED` rồi `DEPTH_CHARGE` (phản ứng 60–180 s, đến nơi 240–600 s). Không phát `HFDF_FIX`: bị nhìn thấy, không phải bị nghe. Lặn sâu huỷ đòn tấn công như với HF/DF.
6. THE DESK SHALL hiện toast khi bị nhìn thấy, ghi nhật ký; Helm SHALL phủ lớp sương lên hải đồ (đậm theo tầm nhìn **đã báo cáo**, mờ đi khi báo cáo cũ hơn 40 phút) và thêm dòng "TẦM NHÌN ~N km · cấp F hướng°" vào bảng đo. Menu Endless có công tắc module; nhãn điểm có thêm một bit (`weather`), điểm cũ của nhãn 7 bit không còn khớp.
7. THE SYSTEM SHALL tái dựng được từ seed + options + log (D9).

## Ghi chú
- Sương mù là bảo vệ: ở tầm nhìn tối thiểu hazard bằng 0, đổi lại tàu không nhìn xa (UI chỉ có ước lượng).
- Tin `WEATHER` tự sinh trong `messages.ts` (chuỗi trang trí cũ) vẫn không được phát vào game; thời tiết đến người chơi qua báo cáo cầu tàu, không qua đường giấy tờ/xác thực.
- Mọi con số nằm trong `balance.json` (`weather`) để chỉnh sau khi chơi thử.
