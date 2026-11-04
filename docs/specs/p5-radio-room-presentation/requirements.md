# P5 Radio Room Presentation — Requirements

Trạng thái: **DRAFT, chờ người dùng duyệt (Stage 1)**. Chưa có code P5.

Nguồn hình ảnh: ảnh tham chiếu người dùng gửi (cutaway tàu ngầm trên cùng, chân dung operator bên trái, điện tín ở giữa, máy mật mã bên phải; tông tím/navy trầm, giấy hồng-xám, máy cũ, đèn xanh tiết chế). Ảnh chỉ là **tham chiếu bố cục và phong cách**; không dùng lại sprite của nó (xem R10).

Quan hệ với P4: P4 (`docs/specs/p4-radio-ui`, PR #8) là radio room chức năng. P5 thay **lớp trình bày** và giữ nguyên gameplay, controller, store, session, loop và audio của P4 (có sửa nhỏ ghi ở R6, R8). Màn Bridge đầy đủ chuyển từ "P5" cũ sang **P6**; save slot/MessagePack sang **P7**.

Thuật ngữ: *copy* = bản chép tay Morse; *group* = Vierergruppe 4 chữ; *check letter* = chữ cuối tin; *tell* = dấu hiệu kiểm chứng được của tin giả; *scene* = khung logic 640×360 vẽ bằng sprite; *slot* = vùng DOM thật đặt trong scene để chứa chữ/điều khiển.

Định dạng tiêu chí: EARS.

## Bất biến gameplay (không đổi)

- B1. `packages/sim-core` không bị sửa: balance, RNG, thuật toán, bước 1 s.
- B2. UI chỉ import `@uboat/sim-core` qua barrel; chỉ gửi `Command` bằng `Watch.dispatch`; chỉ dựng trạng thái từ `EventBus` và các helper quan sát đã công bố (`decipher`, `assess`, `checkMatches`, `worldCtx`, `dayTable`, `listen`, `summary`, `boat.state()/radio()`).
- B3. Không gọi `truthOf`, không đọc trạng thái private, không hiện Intel, hazard hay khoảng cách địch thật.
- B4. Đúng/sai/giả chỉ lộ sau khi xử lý tin (`MSG_RESOLVED`) hoặc ở tổng kết.
- B5. Enigma **M4** giữ nguyên (4 chữ indicator). Ảnh tham chiếu có 3 cửa sổ; P5 vẽ **4 cửa sổ**.
- B6. Toàn bộ gameplay P4 còn đủ: nhận/nghe Morse, chép tay, copy riêng theo `rxId`/`attempt`, ký tự không rõ `?`, decipher, check letter, tells, bảng auth, challenge/reply/check, xin lặp, accept/reject, rủi ro phát, radio silence, sonar, lệnh tàu, hư hại, kết thúc ca trực.

## Yêu cầu

### R1. Bố cục và phong cách hình ảnh
1. THE SYSTEM SHALL dựng scene logic 640×360 gồm: cutaway tàu (trên cùng, có nút pause), chân dung operator + bảng đồng hồ (trái), điện tín + dãy lệnh + giấy "SECRET" (giữa), máy mật mã (phải).
2. THE SYSTEM SHALL vẽ sprite bằng nearest-neighbor (`image-rendering: pixelated`) và chỉ scale **số nguyên** ở chế độ desktop; phần dư làm viền.
3. THE SYSTEM SHALL dùng bảng màu token (tím/navy trầm, giấy hồng-xám, đồng/đen cũ, đèn xanh tiết chế) định nghĩa ở một nơi; cảnh báo không chỉ dựa vào màu (có chữ/biểu tượng).
4. WHERE người dùng bật hiệu ứng CRT/noise THE SYSTEM SHALL vẽ nhẹ và tắt được; mặc định TẮT khi `prefers-reduced-motion`.
5. THE SYSTEM SHALL KHÔNG làm một ảnh nền duy nhất với hotspot cố định: chữ và điều khiển là DOM thật đặt trong slot.

### R2. Nhận và nghe Morse
1. WHEN `MSG_RX` đến THE SYSTEM SHALL phát Morse bằng Web Audio từ `schedule()` với RNG thẩm mỹ **riêng** (không dùng RNG của sim); phát lại cùng `(rxId, attempt)` cho cùng lịch.
2. IF âm thanh chưa được mở THEN THE SYSTEM SHALL hiện lời nhắc và bật khi có thao tác người dùng đầu tiên (keydown/click/touch).
3. THE SYSTEM SHALL hiện đèn tone/sóng đồng bộ với âm đang phát.
4. WHEN trang khôi phục sau reload THE SYSTEM SHALL KHÔNG phát lại âm thanh hay báo động của sự kiện lịch sử.
5. WHEN phiên kết thúc, tạm dừng, hoặc trang bị dọn THE SYSTEM SHALL dừng mọi nguồn âm đã lên lịch và hủy đăng ký sự kiện.

### R3. Chép tay trên bàn phím máy
1. THE SYSTEM SHALL cho nhập bằng bàn phím vật lý (`event.code`: A–Z, 0–9, Space, Backspace, Enter, `/` = `?`) và bằng phím trên máy (nút thật, chạm/chuột).
2. THE SYSTEM SHALL giữ copy riêng cho từng `rxId` và `attempt`; chuyển tin hoặc attempt không làm mất copy.
3. THE SYSTEM SHALL lưu bản chép chưa xong **riêng** khỏi save game (khóa khác), theo `rxId:attempt`, có giới hạn độ dài và kích thước, validate khi tải.
4. IF cửa sổ mất focus THEN THE SYSTEM SHALL giữ nguyên copy.
5. THE SYSTEM SHALL tách chế độ phím: *copy*, *lookup bảng auth*, *emergency*, *điều hướng focus*. WHILE focus nằm trên một điều khiển, Tab/Shift+Tab SHALL hoạt động bình thường và Enter/Space SHALL kích hoạt điều khiển đó.

### R4. Giải mã Enigma
1. WHEN người chơi xác nhận copy THE SYSTEM SHALL gọi `watch.decipher(indicator, copy)`; đèn lamp trên máy sáng lần lượt theo bản rõ, cửa sổ hiện 4 chữ indicator.
2. THE SYSTEM SHALL lấy **số** nhóm hỏng từ `damagedGroups`; vị trí nhóm bị đánh dấu do UI suy từ độ dài từng nhóm trong bản copy và SHALL ghi rõ đó là suy từ bản copy, không phải dữ liệu sim.
3. THE SYSTEM SHALL KHÔNG tự quyết thật/giả thay người chơi.
4. THE SYSTEM SHALL KHÔNG hiện cấu hình rotor/plugboard của khóa ngày.

### R5. Xác thực
1. WHEN giải mã xong THE SYSTEM SHALL hiện "khớp / không khớp" của `checkMatches` mà không nêu nguyên nhân.
2. THE SYSTEM SHALL hiện header quan sát (callsign, DTG, fist đo vs fist đã biết, hướng HF/DF) và các `assess` tell kèm lý do ngắn.
3. THE SYSTEM SHALL cho tra bảng auth 26×26 bằng con trỏ hàng/cột (phím, chạm, hoặc nhấp) trong ngăn kéo phóng to; lưới nhỏ trên điện tín hiện ô challenge.
4. WHEN gửi challenge, reply, hoặc kiểm tra THE SYSTEM SHALL hiện đúng ô, reply và kết quả; ô đã dùng không dùng lại.
5. THE SYSTEM SHALL gán `AUTH_RESULT` (không có `rxId`) cho đúng tin bằng tương quan tường minh: `check` lệnh được dispatch trước sự kiện, đối chiếu theo `tick` và thứ tự lệnh khi dựng lại sau replay; có test cho nhiều `check` cùng tick.

### R6. Phát, rủi ro, từ chối lệnh
1. THE SYSTEM SHALL cung cấp: repeat, challenge, check, accept, reject, report, radio silence, dưới dạng cần gạt/dấu triện nhưng là `<button>` thật.
2. THE SYSTEM SHALL hiện tổng giờ phát và đèn ăng-ten/đang phát; KHÔNG hiện hazard hay Intel dạng số hay đồ thị.
3. IF `dispatch` trả `false` THEN THE SYSTEM SHALL hiện "lệnh không được chấp nhận" cùng **sự kiện quan sát được** (đèn silence, ăng-ten xuống, tin đã xử lý) và SHALL KHÔNG khẳng định nguyên nhân chính xác. (Sửa `refusal.ts` của P4 vốn suy đoán lý do.)
4. WHEN `HFDF_FIX`, `ESCORT_DISPATCHED`, `DEPTH_CHARGE` xảy ra THE SYSTEM SHALL báo trên scene bằng chữ + hiệu ứng.

### R7. Tàu, chân dung, sonar, khẩn cấp
1. THE SYSTEM SHALL hiển thị cutaway phản ánh chế độ (surface/periscope/dive), tốc độ (chong chóng), thân tàu (vết nứt/đèn chập chờn), báo động (đèn đỏ + bóng thủy thủ).
2. THE SYSTEM SHALL hiển thị chân dung với các trạng thái nghe / chép / báo động / bị thương, chỉ suy từ store.
3. THE SYSTEM SHALL cung cấp ngăn kéo sonar: bearing nhiễu, blade rate, phân loại escort/slow, nghe hydrophone; KHÔNG hiện khoảng cách thật.
4. WHEN `BRIDGE_ALERT` đến (sự kiện mới, không phải từ replay) THE SYSTEM SHALL bật chế độ khẩn cấp: viền cảnh báo + chữ, điều khiển lặn/tốc độ/hướng lớn, phím nhanh; có thể tắt bằng Esc.
5. THE SYSTEM SHALL hiện mode, hull, tốc độ, hướng tàu.

### R8. Vòng lặp, session, save/replay
1. THE SYSTEM SHALL chạy sim bằng bộ tích lũy bước cố định 1 s, bù tối đa N bước/khung, bỏ phần dư; pause không gửi tick; tab ẩn tự pause và người chơi tự tiếp tục.
2. THE SYSTEM SHALL xử lý lệnh theo thứ tự xác định: lệnh người chơi dispatch giữa hai bước, ghi log cùng `tick`.
3. THE SYSTEM SHALL lưu `{v, seed, untilTick, commands}`, validate khi tải (kiểu, miền giá trị, tick không giảm, tối đa số lệnh, tối đa byte) và khôi phục bằng `replay(seed, commands, untilTick)`.
4. WHEN khôi phục THE SYSTEM SHALL dựng lại store ở chế độ *silent* (không xếp hàng audio, không bật khẩn cấp quá hạn) rồi mới đăng ký lắng nghe sự kiện mới.
5. IF lưu trữ lỗi hoặc bị chặn THEN THE SYSTEM SHALL báo một lần và vẫn chơi được.

### R9. Responsive, truy cập, nhập liệu
1. **Desktop ≥ 1280px:** bố cục tham chiếu, scale nguyên.
2. **Tablet 768–1024px:** hai cột (điện tín + máy), ngăn kéo cho sonar, bảng auth, log.
3. **Mobile 320–480px:** KHÔNG thu nhỏ cả cảnh desktop. Dải tàu/chân dung gọn ở trên (sprite crop riêng), các trạm đổi thành tab: Radio, Máy, Auth, Sonar, Log; ngăn kéo cho phần phụ; mục tiêu chạm ≥ 44 px.
4. THE SYSTEM SHALL dùng `<button>`, `<table>`, nhãn truy cập, focus nhìn thấy, tương phản đủ, trạng thái loading/lỗi/rỗng/disabled rõ; mọi điều khiển thao tác được bằng bàn phím và cảm ứng.
5. WHERE `prefers-reduced-motion` THE SYSTEM SHALL tắt hoạt ảnh trang trí, nhấp nháy và rung.
6. THE SYSTEM SHALL không có cuộn ngang trang ở 320–1920px.

### R10. Tài sản và nguồn gốc
1. THE SYSTEM SHALL dùng asset cục bộ tách lớp: khung, tàu, chân dung, giấy, vỏ máy, phím, đèn lamp, chữ.
2. THE SYSTEM SHALL có `assets/manifest.json` ghi từng asset: đường dẫn, kích thước, thông tin frame/sprite sheet, nguồn gốc, license, hash.
3. THE SYSTEM SHALL gán nhãn `TEMPORARY` cho mọi asset do trợ lý tạo tạm và SHALL KHÔNG tuyên bố hoàn thiện hình ảnh khi còn asset TEMPORARY.
4. THE SYSTEM SHALL không dùng lại sprite, chân dung, hay bố cục pixel của ảnh tham chiếu.
5. THE SYSTEM SHALL dùng font OFL cục bộ (Silkscreen cho nhãn, VT323 cho chữ máy đánh chữ) kèm file LICENSE; không tải font từ bên ngoài lúc chạy.
6. IF asset lỗi tải THEN THE SYSTEM SHALL rơi về nền CSS cùng token màu, vẫn chơi được, và ghi mã lỗi chẩn đoán.

### R11. Bảo mật, riêng tư, quan sát
1. THE SYSTEM SHALL hiển thị chữ do người chơi/tin nhắn chỉ qua `textContent` hoặc API an toàn tương đương; không `innerHTML`/`eval`.
2. THE SYSTEM SHALL validate đầu vào lệnh và dữ liệu lưu ở biên trình duyệt; không tracking bên ngoài; asset cục bộ; CSP chặt.
3. THE SYSTEM SHALL ghi chẩn đoán đã khử nhạy: session id ngẫu nhiên, tick, mã lỗi, thời gian khung, số lần chạm trần bù bước, lỗi asset/audio/save. THE SYSTEM SHALL KHÔNG ghi nội dung tin hay bản chép, và dữ liệu chẩn đoán SHALL tách khỏi thông tin hiển thị cho người chơi.

### R12. Phi chức năng
1. Hiệu năng: ≥ 30 fps trên desktop thường; chỉ chạm DOM phần tử đổi.
2. Dependency: **không thêm** runtime hay dev dependency mới; giữ `vite@8.3.5`, `typescript@7.0.2`, `vitest@5.1.0`. Node ≥ 22.12 (yêu cầu của vitest 5.1.0).
3. `VERSION` giữ `v0.0.0.0`; không bump trong giai đoạn phát triển.

## Ngoài phạm vi
Màn Bridge đầy đủ (P6), save slot/MessagePack (P7), mạng/đa người chơi, NPC boats, campaign nhiều đêm, nhạc nền/voice, asset do họa sĩ thật làm (placeholder được thay sau).

## Tiêu chí nghiệm thu P5
1. `tsc` strict sạch (sim-core và radio-ui); sim-core 70/70; test radio-ui pass, gồm: vòng lặp, save/replay, reducer, cô lập attempt, tương quan challenge, tách chế độ phím, validate save và transcript, rebuild silent.
2. Grep `truthOf` rỗng; test tĩnh: barrel-only import, không đọc Intel/hazard, không `innerHTML`; không sửa `packages/sim-core`.
3. Chơi trọn một ca trực trên Chromium thật: nhận, chép, decipher, challenge, repeat, lệnh bị từ chối, khẩn cấp, pause/resume, reload, tổng kết. Ảnh chụp ở 320–480, 768–1024, 1280+; không lỗi console.
4. Số đo chẩn đoán có mặt: thời gian khung, số lần chạm trần bù bước, lỗi asset/audio/save.
5. Báo cáo cuối ghi `unverified` cho mọi mục chưa thực sự thử: chất lượng âm thanh khi nghe thật, độ khớp hình ảnh so với ảnh tham chiếu, độ căng/vui, Firefox/Safari, thiết bị cảm ứng thật. Hình ảnh **không** được tuyên bố hoàn thiện khi còn asset TEMPORARY.
