# Desk UI G3 (hậu quả, tell trên giấy, plugboard) — Requirements

Trạng thái: **DRAFT — CHƯA DUYỆT**. Không được sửa `packages/sim-core` cho tới khi người vận hành duyệt spec này (xem `tasks.md`, cổng S0). Spec cha: `docs/specs/desk-ui/` (G1–G2 đã xong và đã merge).

## Giới thiệu

G1–G2 làm bàn giấy và máy mã chạy được nhưng **không có hậu quả**: đóng sai dấu, vứt sai giấy, hết giờ chỉ được liệt kê hoặc báo bằng toast. G3 biến những lỗi đó thành **luật của mô phỏng** (có log, replay được), thêm **tell dạng giấy tờ** để soát tin giả bằng mắt, và bắt người chơi **cắm plugboard** theo khóa ngày thay vì để máy tự cắm.

Vì có hậu quả và có dữ liệu sim mới, G3 **bắt buộc sửa `packages/sim-core`**. Đây là lý do spec riêng và cổng duyệt riêng (D1 của spec cha).

Định dạng tiêu chí: EARS. Mọi quyết định có hậu quả đi qua `Command` vào `Watch.dispatch` và sinh `SimEvent`; UI không tự phạt.

## Bất biến (kế thừa, không đổi)

- **D1′.** Sim-core vẫn headless, tất định, một PRNG có seed, bước thời gian cố định, không phụ thuộc framerate/DOM. Mọi mầm ngẫu nhiên mới dùng `derive(seed, "paper", ...)` hoặc đường dẫn con khác, không dùng `Math.random`.
- **D3.** UI không gọi `truthOf`, không đọc trạng thái private, không hiện Intel hay thông tin địch thật.
- **D4.** Đúng/sai/giả của một tin chỉ lộ sau `MSG_RESOLVED` hoặc ở tổng kết. Tell trên giấy chỉ là **quan sát được**; dấu xác thực "giả y hệt" không phải tell và **không được tính** vào bất biến bên dưới.
- **D5.** Enigma M4 giữ nguyên.
- **D8 (bất biến forgery).** Mọi tin giả luôn có **ít nhất một tell kiểm chứng được** (fist, bearing, timestamp, grid, hoặc tell giấy tờ ở R2). Tell giấy không làm giảm số tell tối thiểu đã có.
- **D9.** Save = seed + event log. Mọi trạng thái hậu quả (số lần cảnh cáo, mức phạt) phải **dựng lại được** từ log; không lưu cờ ngoài log.

## Yêu cầu

### R1. Cảnh cáo (citation) và hậu quả
1. THE SYSTEM SHALL có sổ cảnh cáo trong sim (`Watch`), tăng khi một *lỗi giấy tờ* xảy ra; mỗi lần phát sinh sự kiện `CITATION { tSec, rxId | null, reason, count }`.
2. THE SYSTEM SHALL định nghĩa lỗi giấy tờ gồm: đóng dấu sai màu hoặc sai loại giấy; vứt vào thùng rác giấy không được vứt; giao bức điện thiếu dấu Echo, thiếu chữ ký hoặc sai bó (Input không kèm đúng Output); **hết giờ** bức điện (R4); vi phạm lệnh lưu/hủy (R5).
3. WHEN số cảnh cáo là 1 hoặc 2 THE SYSTEM SHALL phát `CONSEQUENCE { level: "warning" }`: nhắc nhở, **trừ Ration**, **mất một thông tin quan trọng** (R1.9) và **bị địch đánh dấu** (tăng `Intel` một bậc, làm tăng hazard HF/DF theo `intelHazardStep` sẵn có). *(Người vận hành chốt 2026-11-04.)*
4. WHEN số cảnh cáo đạt 3 THE SYSTEM SHALL phát `CONSEQUENCE { level: "located" }`: địch biết khoảng **80% vị trí** tàu (một `HFDF_FIX` với độ tin cậy 0.8 từ dữ liệu cân bằng) và **tàu bị tấn công**: `ESCORT_DISPATCHED` rồi `DEPTH_CHARGE` theo cơ chế escort sẵn có của sim. Cảnh cáo thứ 4 giữ mức này (không có bậc mới) và tăng điểm trừ. *(Chốt 2026-11-04 cho lần 3; lần 4 là giả định chờ xác nhận.)*
5. WHEN số cảnh cáo đạt 5 THE SYSTEM SHALL phát `CONSEQUENCE { level: "executed" }`: thuyền trưởng kéo người chơi ra ngoài tàu để hành quyết; kết thúc ca (`WATCH_END`, lý do mới `"executed"`) kèm cảnh kết ở desk. *(Chốt 2026-11-04.)*
6. THE SYSTEM SHALL đọc ngưỡng, loại lỗi và trọng số từ dữ liệu cân bằng (`packages/sim-core/data`), không hardcode.
7. THE SYSTEM SHALL phát cảnh cáo **một lần** cho mỗi (bức điện, loại lỗi); gửi lại cùng lỗi (kể cả sau reload) không cộng thêm (idempotent theo khóa).
8. THE SYSTEM SHALL hiện cảnh cáo ở desk bằng tờ *Citation* (giấy mới) và lời thoại; **không** nói lỗi đó vì sao đúng/sai về nội dung tin (D4), chỉ nói luật giấy tờ nào bị vi phạm.
9. THE SYSTEM SHALL cho "mất thông tin quan trọng" là mất có kiểm soát một dữ liệu hữu ích đang có trên bàn (đề xuất: một trang Daily Orders bị gạch/thu hồi, chọn từ bảng cân bằng); chi tiết ở câu hỏi mở 8 của design.

### R2. Tell dạng giấy tờ
1. THE SYSTEM SHALL sinh cho mỗi bức điện (trong sim, từ seed) một *hồ sơ giấy* quan sát được: `authMark` (`none` | `genuine` | `forged`), `signatureVariant`, `senderApproved`, `senderId` (mã hóa bằng khóa ngày, cần máy để đọc).
2. THE SYSTEM SHALL in lên tờ Input: dấu xác thực (nếu có), chữ ký người gửi và Sender ID; người chơi so với **mẫu chữ ký** và **danh sách người gửi được duyệt** trên Daily Orders (R3).
3. THE SYSTEM SHALL cho tin thật có `authMark` `genuine` hoặc `none` (theo mạng) và `signatureVariant` khớp mẫu; tin giả có thể có `authMark` `forged` **giống hệt** `genuine` (không phải tell), chữ ký lệch mẫu, hoặc người gửi không được duyệt.
4. THE SYSTEM SHALL bảo đảm D8: nếu tin giả chỉ có `authMark` giả y hệt thì vẫn phải có ít nhất một tell khác (fist/bearing/timestamp/grid/chữ ký/người gửi). `verifyTells` được mở rộng để trả về cả tell giấy, và có test bất biến trên nhiều seed.
5. THE SYSTEM SHALL đưa `senderId` vào `MSG_RX` hoặc sự kiện riêng dưới dạng **bản mã**; giải mã bằng khóa ngày nằm ở UI qua máy (R6) — sim không phát bản rõ.
6. THE SYSTEM SHALL không để hồ sơ giấy làm lộ `truth.forged` (D3, D4).

### R3. Daily Orders mở rộng
1. THE SYSTEM SHALL thêm vào Daily Orders: mẫu chữ ký của các đài đã biết, danh sách người gửi được duyệt, cách đọc dấu xác thực, **lệnh lưu/hủy** của ngày (R5), và khóa plugboard (R6).
2. THE SYSTEM SHALL dùng tin tức trong Orders để soát nội dung (ví dụ tin nói "tàu tiếp tế chậm" mâu thuẫn một lệnh giả); nội dung tin do sim sinh, không do UI.

### R4. Hết giờ thành lệnh có log
1. WHERE người chơi bật đồng hồ THE SYSTEM SHALL tính hạn **theo thời gian sim** (không phải thời gian thực) để replay tất định: hạn của một bức điện = `rxTSec + deadlineSec` từ dữ liệu cân bằng.
2. WHEN hạn trôi qua mà bức điện chưa được giao THE SYSTEM SHALL tự phát lỗi `timeout` (R1.2) qua một lệnh/sự kiện có log, một lần cho mỗi bức điện.
3. THE SYSTEM SHALL giữ đồng hồ G2 làm chỉ báo; chỉ báo phải dùng cùng hạn sim (không còn 2 phút thời gian thực).
4. WHERE đồng hồ tắt THE SYSTEM SHALL không phát lỗi `timeout`.

### R5. Lưu trữ và hủy giấy theo lệnh
1. THE SYSTEM SHALL cho Daily Orders ra lệnh theo ngày (ví dụ: "hủy Input sau khi giao", "lưu bản Output") từ bảng cân bằng.
2. THE SYSTEM SHALL có chỗ lưu (ngăn hồ sơ) và chỗ hủy (lò/máy hủy giấy) trên desk; việc làm trái lệnh là lỗi giấy tờ (R1.2).
3. THE SYSTEM SHALL ghi mọi lưu/hủy bằng lệnh có log để kiểm được theo D9.

### R6. Plugboard cắm dây
1. THE SYSTEM SHALL có bảng cắm 26 chữ ở máy (mở cùng nắp rotor, chỉ khi máy tắt) để người chơi nối tối đa 10 cặp theo khóa ngày trên Orders.
2. THE SYSTEM SHALL giải mã bằng plugboard **người chơi cắm** (hàm thuần mới trong sim-core, ví dụ `decipherCopy(..., plugboard?)`, mặc định là khóa ngày để P5/classic không đổi); cắm sai thì bản rõ sai, không có cảnh báo (R4.6 của spec cha).
3. THE SYSTEM SHALL kiểm đầu vào cắm: cặp hợp lệ A–Z, không trùng chữ, tối đa 10 cặp; dữ liệu đã lưu được validate từng trường.
4. THE SYSTEM SHALL cho `senderId` (R2.5) giải được bằng cùng máy.

### R7. Lưu, replay, tương thích
1. THE SYSTEM SHALL đưa mọi lệnh mới (`paperwork`/`fault`, `dispose`, `timeout`…) vào `commandLog`; replay từ seed + log cho kết quả giống từng bit (có test).
2. THE SYSTEM SHALL tăng phiên bản định dạng save nếu thêm kiểu lệnh/sự kiện; save cũ (v2) phải nạp được (không có hậu quả G3) hoặc bị từ chối với thông báo rõ. Chọn ở design (xem câu hỏi mở).
3. THE SYSTEM SHALL giữ P4/P5/`?ui=classic` chạy được: lệnh G3 là tùy chọn, UI cũ không gửi thì ca chơi không có cảnh cáo.
4. THE SYSTEM SHALL giữ thiết kế đủ sạch để sau này trở thành server có thẩm quyền: sim nhận **sự thật do UI báo** (`paperwork` với dấu, chữ ký, bó giấy) và tự chấm luật bằng bảng luật trong sim-core; nêu rõ giới hạn chống gian lận ở design.

### R8. Điểm
1. THE SYSTEM SHALL cho cảnh cáo trừ vào Ration theo bảng cân bằng (phần hiển thị của R10 spec cha), nhưng số cảnh cáo là của sim, Ration vẫn là của desk.

### R9. Phi chức năng
1. Không dependency mới. Mọi thay đổi sim-core có test đơn vị và test bất biến; `tsc` strict.
2. Toàn bộ chuỗi mới có `en` và `vi`.
3. Không dùng lại văn bản/sprite của game tham chiếu.
