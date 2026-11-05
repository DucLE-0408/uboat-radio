# Desk UI G5 (bản đồ, lệnh di chuyển, màn hình Helm) — Requirements

Trạng thái: **ĐÃ DUYỆT 2026-11-05** (người vận hành trả lời bốn câu hỏi mục tiêu: hết hạn thì mất tiếp tế và bị trừ điểm; bản đồ chỉ có vị trí ước lượng; có mô-đun `map`; thêm la bàn và bánh lái, tách phần lái tàu ra một màn hình riêng). Spec cha: `docs/specs/desk-ui/`, G3 và G4 ở `docs/specs/desk-ui-g3/`, `docs/specs/desk-ui-g4/`.

## Giới thiệu

Thế giới có lưới 26×26 ô (90 km mỗi ô, 3 cột đông cùng là đất liền, tọa độ dạng `AB12`), nhưng người chơi không có bản đồ và các lệnh HQ chưa bắt tàu đi đâu. G5 thêm:

1. **Lệnh di chuyển** `NAVIGATIONSBEFEHL`: HQ ra lệnh đưa tàu tới một tọa độ trước một hạn chót.
2. **Dead-reckoning**: người chơi chỉ biết vị trí **ước lượng** (có sai số tăng theo quãng đường), sim giữ vị trí thật.
3. **Màn hình Helm riêng**: bản đồ, la bàn, bánh lái, cần tốc độ và độ sâu tách khỏi bàn điện báo.
4. **Mô-đun `map`** (thứ bảy) để bật/tắt bản đồ và lệnh di chuyển trong Endless.

Định dạng tiêu chí: EARS. Mọi hậu quả đi qua `Command` và `SimEvent`.

## Bất biến (kế thừa)

- **D1′, D3, D4, D8, D9, D10** như G3/G4. Đặc biệt D3: bản đồ không bao giờ hiện vị trí thật của tàu, vị trí địch hay thông tin thật của tin; D8: tin giả (kể cả lệnh di chuyển giả) luôn có ít nhất một tell kiểm chứng được; D10: ca trực thường (không có `opts`) không đổi từng bit trong log sự kiện.

## Yêu cầu

### R1. Lệnh di chuyển
1. WHERE ca có `opts` và mô-đun `map` bật THE SYSTEM SHALL thỉnh thoảng (xác suất từ `balance.json` `move.chance`) phát lệnh di chuyển thay cho lệnh tấn công trong luồng Endless; kiểu tin mới `MOVE`, mạng `HQ`, nội dung `NAVIGATIONSBEFEHL ZIEL <ô> FRIST <phút> MINUTEN` (chữ A–Z để đi qua máy Enigma).
2. THE SYSTEM SHALL chọn đích là một ô con (10 km) trên biển cách vị trí tàu `move.minKm`–`move.maxKm` km, và hạn chót = quãng đường / `move.assumedKn` × `move.marginFactor`, làm tròn lên theo phút.
3. WHEN người chơi chấp nhận một lệnh `MOVE` THE SYSTEM SHALL phát `ORDER_ACCEPTED { rxId, grid, deadlineSec }` (chỉ nội dung người chơi đã chấp nhận, không lộ thật/giả) và coi đó là lệnh đang hiệu lực; một lệnh mới thay lệnh cũ.
4. WHILE có lệnh hiệu lực THE SYSTEM SHALL so **vị trí thật** của tàu với đích mỗi bước; vào bán kính `move.arriveKm` trước hạn thì phát `ORDER_REACHED { rxId }`.
5. IF tới hạn mà chưa tới THEN THE SYSTEM SHALL phát `ORDER_FAILED { rxId, lostItem }`: thu hồi một điểm tiếp tế (mục `supply*`, nếu hết thì mục bất kỳ còn lại) và gửi một Private Message `orderFailed` từ Thuyền trưởng; desk trừ Ration. Không tính là cảnh cáo G3. *(Chốt 2026-11-05.)*
6. IF người chơi chấp nhận một lệnh `MOVE` giả THEN THE SYSTEM SHALL xử như mọi lệnh giả được chấp nhận (đòn phục kích hiện có); lệnh di chuyển giả vẫn có tell (R1.7).
7. THE SYSTEM SHALL giữ D8 cho `MOVE`: pool tell của lệnh giả chỉ gồm `fist` và `timestamp` (không dùng `grid`/`bearing` vì đích không phải vị trí người gửi) và `assessTells` bỏ qua kiểm `grid`/`bearing` với `MOVE`, nên tin thật không bao giờ dính tell sai.
8. THE SYSTEM SHALL từ chối sinh `MOVE` khi không có biển hợp lệ trong tầm; không có `opts` thì không có `MOVE`.

### R2. Dead-reckoning
1. THE SYSTEM SHALL giữ cho mỗi ca một **sai số trôi** tích lũy theo quãng đường đã đi (`nav.driftPerKm` × quãng đường, hướng ngẫu nhiên tất định từ `derive(seed, "drift")`) và cung cấp `Watch.navFix()` = `{ xKm, yKm, errKm, headingDeg }`, trong đó `(xKm, yKm)` là vị trí **ước lượng** (thật + trôi) và `errKm` là bán kính sai số hiển thị.
2. THE SYSTEM SHALL không đổi bất kỳ sự kiện nào của ca trực thường (luồng ngẫu nhiên mới không dịch luồng cũ).
3. THE SYSTEM SHALL cho UI chỉ đọc `navFix()` (quan sát), không đọc vị trí thật.

### R3. Màn hình Helm
1. THE SYSTEM SHALL có màn hình **Helm** bật bằng nút HELM trên desk (đóng bằng nút hoặc Esc), chiếm cả khung 640×360; sim vẫn chạy, Morse vẫn phát, toast vẫn hiện.
2. THE SYSTEM SHALL đặt trên Helm: **bản đồ** (R4), **la bàn** (hoa gió xoay theo hướng tàu, kim hướng lệnh), **bánh lái** (kéo để đặt hướng lệnh; các nút ±1° và ±10°), **cần tốc độ** (− / +), **chế độ nổi/kính tiềm vọng/lặn**, và số đọc (hướng, tốc độ, độ sâu).
3. THE SYSTEM SHALL chuyển các bộ phận lái khỏi bàn điện báo: cần gạt độ sâu và tốc độ trên bảng điều khiển tàu của desk bị ẩn; im lặng, báo cáo, đồng hồ phát và đèn ăng-ten ở lại bàn.
4. THE SYSTEM SHALL dùng lại các `Actions` hiện có (`steerHeading`, `steerSpeed`, `setMode`); không thêm lệnh sim cho việc lái.

### R4. Bản đồ
1. THE SYSTEM SHALL vẽ bản đồ trên Helm với ba mức phóng: **cục bộ** (≈ 60 km, lưới 10 km theo ô con), **khu vực** (≈ 600 km, lưới ô 90 km) và **toàn cục** (cả 26×26 ô với dải đất liền), có nhãn tọa độ `AB12` theo định dạng thế giới.
2. THE SYSTEM SHALL hiện vị trí **ước lượng** của tàu với vòng sai số `errKm`, hướng tàu và vệt đã đi (theo ước lượng), đích và hạn chót của lệnh hiệu lực, và các điểm an toàn/tiếp tế còn trên Daily Orders (điểm bị thu hồi không hiện).
3. THE SYSTEM SHALL không hiện vị trí địch, vị trí thật hay thông tin thật của tin (D3).
4. WHEN người chơi bấm một điểm trên bản đồ THE SYSTEM SHALL đặt hướng lệnh về điểm đó (tính từ vị trí ước lượng) qua `steerHeading`; không có autopilot.
5. WHERE mô-đun `map` tắt THE SYSTEM SHALL ẩn bản đồ (la bàn và bánh lái vẫn dùng được) và không sinh lệnh di chuyển.

### R5. Điểm
1. THE SYSTEM SHALL để desk cộng Ration khi `ORDER_REACHED` và trừ Ration khi `ORDER_FAILED` (bảng điểm nằm ở desk, như G3/G4).

### R6. Lưu, replay, tương thích
1. THE SYSTEM SHALL đưa mô-đun `map` vào `ModuleSet`; `parseOptions` coi thiếu `map` là bật (save v3 cũ nạp được).
2. THE SYSTEM SHALL tái dựng lệnh hiệu lực, vị trí ước lượng và thu hồi tiếp tế từ seed + options + commandLog (D9); không thêm lệnh người chơi mới.
3. THE SYSTEM SHALL giữ P4/P5/`?ui=classic` chạy: `navFix()` chỉ là hàm quan sát, không phát sự kiện.

### R7. Phi chức năng
1. Không dependency mới; bản đồ vẽ bằng SVG/DOM; số phần tử cập nhật mỗi khung bị chặn (vệt tối đa 200 điểm).
2. Chuỗi mới có `en` và `vi`; không dùng lại sprite hay văn bản của game tham chiếu; hình vẽ gán `TEMPORARY`.
