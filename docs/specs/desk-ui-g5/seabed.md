# Desk UI G5 addendum: shallow water and depth

Trạng thái: **ĐÃ DUYỆT 2026-11-05** (người vận hành: "thêm luật nước nông và độ sâu", sau đó "cho bạn toàn quyền nhé"; các quyết định là của trợ lý theo đề xuất đã nêu).

## Yêu cầu

1. WHERE ca có `opts` THE SYSTEM SHALL có đáy biển tất định theo seed (`seabed.ts`): sâu dần từ 0 m ở bờ tới `seabed.maxM` (200 m) cách bờ `slopeKm` (30 km), cộng `seabed.shoals.count` (6) bãi cạn hình nón (bán kính 3–8 km, nâng đáy 120–190 m) rải trong 70 km quanh điểm xuất phát. Ca trực thường không có đáy biển (D10).
2. THE SYSTEM SHALL tính độ sâu đáy tại **vị trí thật**; hải đồ (`Watch.chartDepth`, `Watch.chartShoals`) công bố độ sâu đã khảo sát, và Helm tra theo **vị trí ước lượng**.
3. WHEN nước dưới sống tàu (đáy − độ sâu tàu) ≤ `seabed.warnUnderKeelM` (20 m) THE SYSTEM SHALL phát `SHOAL_WARNING { underKeelM }` một lần cho mỗi lần tiến sát (đặt lại khi > 35 m).
4. WHEN nước dưới sống tàu ≤ 0 THE SYSTEM SHALL phát `BOAT_BOTTOMED`, trừ `seabed.bottomHull` (15) hull qua `BOAT_DAMAGED`, làm tàu mất đà và đặt độ sâu lệnh lên `đáy − clearanceM` (10 m); một lần cho mỗi đợt (kết thúc khi dưới sống > 10 m); gửi Private Message `bottomed` từ Máy trưởng.
5. THE SYSTEM SHALL coi tàu nổi có mớn nước `seabed.draftM` (6 m), trừ 3 km cuối trước bờ (nơi chỉ luật bờ áp dụng, để không tính phạt hai lần).
6. THE SYSTEM SHALL không tự chặn lệnh lặn: người chơi có thể ra lệnh lặn ở nước nông và chịu hậu quả; Helm vô hiệu hóa nút lặn/kính tiềm vọng khi hải đồ cho thấy nước nông hơn độ sâu cần (60 m / 12 m cộng 10 m dự phòng).
7. THE SYSTEM SHALL để desk trừ 15 Ration mỗi lần chạm đáy, hiện toast cảnh báo và chạm đáy, và Helm tô độ sâu (nông hơn thì nhạt hơn), khoanh và ghi độ sâu nhỏ nhất của từng bãi cạn, hiện dòng "ĐÁY ~N m / DƯỚI SỐNG ~N m".
8. THE SYSTEM SHALL tái dựng toàn bộ từ seed + options + log (D9) và không đổi sự kiện nào của ca trực thường.

## Ghi chú
- Độ dốc bãi cạn nhỏ so với tốc độ tàu, nên chạm đáy xảy ra khi tàu lặn sâu mà đáy dâng lên dưới nó (hoặc lặn ở nơi nước nông), chứ không do đáy "dựng đứng".
- Nước nông chưa thay đổi sát thương depth charge.
