# Desk UI G5 addendum: coast collision

Trạng thái: **ĐÃ DUYỆT 2026-11-05** (người vận hành: "thêm luật va chạm đất liền", sau đó "cho bạn toàn quyền quyết định"; các quyết định dưới đây là của trợ lý theo đề xuất đã nêu).

## Yêu cầu

1. WHERE ca có `opts` THE SYSTEM SHALL áp luật bờ: bờ là mép đông của cột đất liền đầu tiên (`coastKm`, 2070 km).
2. WHEN vị trí **thật** của tàu cách bờ ≤ `coast.warnKm` (10 km) THE SYSTEM SHALL phát `COAST_WARNING { distKm }` một lần cho mỗi lần tiến sát (đặt lại khi cách bờ > 15 km).
3. WHEN tàu chạm bờ THE SYSTEM SHALL giữ tàu ở mép đất (mất đà, tốc độ lệnh giữ nguyên nên quay mũi ra khỏi bờ là tàu đi lại được), phát `BOAT_GROUNDED`, trừ `coast.groundHull` (25) hull qua `BOAT_DAMAGED` (hull 0 là chìm như thường), tăng Intel một bậc (`Intel.mark`) và gửi Private Message chủ đề `grounded` từ Máy trưởng. Chỉ tính một lần cho mỗi đợt mắc cạn; đợt kết thúc khi tàu cách bờ > `coast.clearKm` (1 km).
4. THE SYSTEM SHALL cho Endless bắt đầu cách bờ `coast.endlessStartKm` (40 km) để luật có nghĩa; ca trực thường giữ nguyên vị trí xuất phát và **không** có luật bờ (D10, bờ cách xa hơn 1000 km).
5. THE SYSTEM SHALL giữ các điểm an toàn/tiếp tế trên Orders cách bờ ≥ `coast.itemMarginKm` (5 km) và các ô của lệnh di chuyển cách bờ ≥ `coast.moveMarginKm` (15 km).
6. THE SYSTEM SHALL để desk trừ 20 Ration mỗi lần mắc cạn, hiện toast cảnh báo/mắc cạn, và tô đường bờ trên bản đồ Helm màu đỏ khi vị trí ước lượng cách bờ ≤ 10 km hoặc vừa có cảnh báo; thanh vị trí ghi khoảng cách ước lượng tới bờ.
7. THE SYSTEM SHALL không đổi bất kỳ sự kiện nào của ca trực thường và tái dựng toàn bộ từ seed + options + log (D9).

## Ghi chú
- `Intel.mark` giờ đặt điểm cao hơn ngưỡng 5 điểm để bậc mới không bị phân rã mất ngay (ảnh hưởng cả cảnh cáo G3 và lệnh quá hạn).
- Boat có thêm `hold` và `takeDamage`; không đổi cơ chế depth charge.
