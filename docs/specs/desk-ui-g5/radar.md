# Desk UI G5 addendum: enemy radar and the Metox

Trạng thái: **ĐÃ DUYỆT 2026-11-05** (người vận hành: "thêm luật phát hiện bằng radar của địch", sau đó "ok, toàn quyền"; quyết định theo đề xuất đã nêu).

## Yêu cầu

1. THE SYSTEM SHALL thêm module `radar` (mặc định bật, tắt được trong menu Endless, độc lập với độ khó và với `weather`). Save không có khoá này được hiểu là bật. WHERE ca không có options hoặc module tắt THE SYSTEM SHALL không có radar, không phát sự kiện radar nào và không rút thêm số ngẫu nhiên (D10).
2. THE SYSTEM SHALL tính các đợt tuần tra radar như **hàm thuần của (seed, thời gian)** (`radar.ts`): `windowCount` (48) đợt từ `derive(seed,"radar")`, đợt đầu bắt đầu sau `firstGapSec` (1800 s), mỗi đợt dài 180–420 s, cách nhau 1800–5400 s, lặp lại theo chu kỳ. Mô hình chỉ nói "có radar đang quét", không có vị trí hay đường đi tàu địch.
3. WHILE trong một đợt tuần tra THE SYSTEM SHALL tính hazard bị bắt mỗi giây: `hazardPerSecSurface × phơi bày × radarSeaFactor(cấp sóng) × radarEra(thời gian)`; phơi bày 1 khi nổi, `periscopeFactor` (0,3) ở độ sâu kính tiềm vọng, 0 khi lặn sâu. `radarSeaFactor`: 1 tới cấp sóng 3, `seaMinFactor` (0,4) ở cấp 8 (cấp sóng của thời tiết nếu module `weather` bật, cấp cố định nếu không). `radarEra`: 1 + 25%/giờ, trần ×2,5.
4. WHEN bị bắt và không trong thời gian nguội (`cooldownSec`, chung với HF/DF và nhìn thấy) THE SYSTEM SHALL phát `RADAR_DETECTED` và lên lịch `ESCORT_DISPATCHED` rồi `DEPTH_CHARGE` (cùng cách `visualContact`), không có `HFDF_FIX`. Mỗi tick rút một số từ `derive(seed,"radarhit")` khi đang trong đợt và lộ ra.
5. THE SYSTEM SHALL mô hình Metox: với xác suất `metoxReliability` (0,85, quyết định cố định theo seed cho mỗi đợt) phát `RADAR_WARNING` từ `warnLeadSec` (20–60 s) trước đợt, khi cột ăng-ten còn thò lên (độ sâu ≤ kính tiềm vọng + 1 m; nếu lặn sâu lúc đó thì phát khi nhô lên trong đợt); sau đợt phát `RADAR_CLEAR`. Metox hỏng thì không cảnh báo.
6. THE UI SHALL KHÔNG nhận hay hiển thị `RADAR_DETECTED` (người chơi chỉ thấy hộ tống được điều tới). THE DESK SHALL hiện toast cảnh báo và toast "radar đã im", ghi nhật ký; Helm SHALL hiện dòng "METOX: RADAR HOẠT ĐỘNG. LẶN" khi cảnh báo mới hơn lần xoá và chưa quá 20 phút.
7. THE SYSTEM SHALL tái dựng được từ seed + options + log (D9); `SIM_VERSION` là 4.

## Ghi chú
- Radar bổ khuyết cho nhìn thấy: sương mù không che được radar, nhưng sóng lớn thì có (và bão cũng làm tàu nổi chậm), nên mỗi thời tiết có thế được-mất riêng.
- Test chốt phiên bản (`simversion.test.ts`) nay chạy 7200 s để bao cả đợt radar đầu tiên: bản cũ chỉ chạy 1800 s và đã không bắt được thay đổi này, nên được kéo dài.
- Mọi con số nằm trong `balance.json` (`radar`).
