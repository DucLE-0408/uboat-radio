# Desk UI G5 addendum: depth charge in shallow water

Trạng thái: **ĐÃ DUYỆT 2026-11-05** (người vận hành: "cho nước nông ảnh hưởng đến depth charge", sau đó "cho bạn toàn quyền nhé"; các quyết định theo đề xuất đã nêu).

## Yêu cầu

1. WHERE ca có `opts` THE SYSTEM SHALL cho mìn sâu nổ ở độ sâu `dropM = min(100, max(seabed.minDropM, đáy − seabed.dropAboveFloorM))` (mặc định 10 m / 5 m), tính theo đáy tại **vị trí thật**; ở nước sâu `dropM` vẫn là 100 m như cũ.
2. WHEN `đáy − độ sâu tàu < seabed.reflectUnderKeelM` (20 m) THE SYSTEM SHALL nhân sát thương với `seabed.reflectMult` (1,5): sóng nổ phản xạ từ đáy.
3. THE SYSTEM SHALL phát `CHARGE_EFFECT { tSec, dropM, shallow, reflected, hit }` cho mỗi lượt mìn nổ (`shallow` = đáy < 100 m; `hit` = trong bán kính sát thương). Ca trực thường không có mô hình này: không phát sự kiện, sát thương như cũ (D10).
4. THE SYSTEM SHALL giữ tính tất định và tái dựng được từ seed + options + log (D9).
5. THE DESK SHALL hiện toast khi một lượt mìn nổ ở nước nông trúng tàu, ghi dòng nhật ký, và Helm SHALL hiện dòng "NƯỚC NÔNG: MÌN SÂU NGUY HIỂM" khi có mối đe dọa (hộ tống đã được điều tới, hoặc mìn nổ trong 300 s qua) và hải đồ cho thấy nước nông hơn 100 m tại vị trí ước lượng.

## Ghi chú
- Tàu nổi (độ sâu 0) ở nước < ~35 m là mục tiêu của mìn sâu; ở nước sâu tàu nổi vẫn an toàn như trước.
- Hiệu ứng nằm ở `Boat.takeDepthCharge` qua `setChargeModel`; `boat.ts` vẫn không import module sim khác.
