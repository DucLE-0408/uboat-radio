# P4 Radio Room UI — Requirements

Trạng thái: **DRAFT, chờ người dùng duyệt**. Chưa có dòng code UI nào.

> **Cập nhật:** lớp trình bày của P4 được thay bằng P5 (`docs/specs/p5-radio-room-presentation/`). Gameplay, controller, store, session, loop và audio của P4 được giữ nguyên. Mục R9.3 (chỉ desktop) được thay bởi R9 của P5 (desktop/tablet/mobile). Màn Bridge đầy đủ nay là P6.

## Giới thiệu

Người chơi là Funkmaat của một U-boat. P4 xây Radio Room chạy trên trình duyệt để chơi trọn một ca trực của `Watch` (vertical slice đã có trong `packages/sim-core`). UI chỉ **đọc Event Bus** và **gửi `Command`**; mọi quy tắc game nằm trong sim-core.

Thuật ngữ: *copy* = bản chép Morse của người chơi; *group* = Vierergruppe (4 chữ); *check letter* = chữ xác thực cuối tin; *tell* = dấu hiệu kiểm chứng được của tin giả.

Định dạng tiêu chí: EARS (`WHEN … THE SYSTEM SHALL …`).

## Yêu cầu

### R1. Nhận và nghe Morse
**User story:** Là Funkmaat, tôi muốn nghe tín hiệu Morse nhiễu để chép tay như thật.
1. WHEN sim phát `MSG_RX` THE SYSTEM SHALL phát âm Morse của `tokens` bằng Web Audio, dựng từ `schedule()` với `Fist` của đài gửi.
2. THE SYSTEM SHALL dùng một RNG thẩm mỹ **riêng** cho jitter âm thanh, không bao giờ dùng RNG của sim.
3. WHEN người chơi bấm phím phát lại THE SYSTEM SHALL phát lại đúng bản `tokens` đã nhận, không sinh nhiễu mới.
4. IF trình duyệt chưa cho phép âm thanh THEN THE SYSTEM SHALL hiện lời nhắc "bấm phím để bật âm" và không phát lỗi im lặng.
5. THE SYSTEM SHALL hiện thanh sóng/đèn tone đồng bộ với âm đang phát.

### R2. Chép tay (copy)
1. THE SYSTEM SHALL nhận ký tự chép từ `event.code` và chỉ chấp nhận A–Z, 0–9, Space, Backspace, Enter và các phím điều khiển đã khai báo.
2. WHEN người chơi bấm Space THE SYSTEM SHALL kết thúc nhóm hiện tại; WHEN bấm Backspace THE SYSTEM SHALL xóa ký tự cuối.
3. WHEN người chơi bấm `?` hoặc phím "không rõ" THE SYSTEM SHALL ghi ký tự `?` vào copy (giữ rotor đồng bộ khi giải mã).
4. THE SYSTEM SHALL giữ copy riêng cho từng `rxId` và từng `attempt`.
5. IF cửa sổ mất focus THEN THE SYSTEM SHALL không mất copy đã gõ.

### R3. Giải mã Enigma
1. WHEN người chơi xác nhận copy THE SYSTEM SHALL gọi `watch.decipher(indicator, copy)` và hiện bản rõ theo từng group.
2. THE SYSTEM SHALL đánh dấu group có độ dài khác 4 (từ `damagedGroups`) để người chơi quyết định xin phát lại.
3. THE SYSTEM SHALL hiện `indicator` của tin và ngày/khóa đang dùng, nhưng không hiện cấu hình rotor chi tiết như thể là nhiệm vụ của người chơi.
4. THE SYSTEM SHALL không bao giờ tự quyết định tin thật/giả thay người chơi.

### R4. Xác thực
1. WHEN giải mã xong THE SYSTEM SHALL hiện kết quả `watch.checkMatches` là "khớp / không khớp" mà **không** nói nguyên nhân (nhiễu hay giả).
2. THE SYSTEM SHALL hiện header quan sát được (callsign, DTG, fist đo được, hướng HF/DF) và các `assess` tell tìm thấy, mỗi tell kèm lý do ngắn.
3. THE SYSTEM SHALL cho tra bảng auth 26×26 của ngày bằng con trỏ hàng/cột.
4. WHEN người chơi gửi challenge THE SYSTEM SHALL phát lệnh `challenge`, hiện ô (row, col) đã phát, và hiện `CHALLENGE_REPLY` khi đến.
5. WHEN người chơi bấm kiểm tra THE SYSTEM SHALL gửi `check` và hiện `AUTH_RESULT`; ô đã dùng không dùng lại được.

### R5. Phát và rủi ro lộ
1. THE SYSTEM SHALL cung cấp lệnh: xin lặp (`repeat`), challenge, chấp nhận/từ chối (`resolve`), phát báo cáo tự do (`transmit`).
2. THE SYSTEM SHALL hiện đồng hồ **tổng giờ phát** và đèn "ăng-ten lộ" (từ `Boat.radio()`/`BOAT_MODE`), nhưng **không** hiện giá trị hazard thật hay mức Intel dạng số.
3. IF `dispatch` trả `false` THEN THE SYSTEM SHALL báo lý do (đang lặn, im lặng vô tuyến, tin đã xử lý) thay vì bỏ qua.
4. WHEN `HFDF_FIX` xảy ra THE SYSTEM SHALL báo "bị định vị" và hiện `ESCORT_DISPATCHED`/`DEPTH_CHARGE` khi đến.
5. THE SYSTEM SHALL cho bật/tắt radio silence.

### R6. Sonar và Bridge tối thiểu
1. WHEN `SONAR_CONTACT` đến THE SYSTEM SHALL hiện bearing nhiễu, blade rate và phân loại "escort / slow"; SHALL NOT hiện khoảng cách thật.
2. THE SYSTEM SHALL cho nghe hydrophone (âm chân vịt theo blade rate) cho contact đang nghe được.
3. WHEN `BRIDGE_ALERT` đến THE SYSTEM SHALL chớp cảnh báo toàn màn hình và bật chế độ khẩn cấp với lệnh lặn/tốc độ/hướng gõ nhanh.
4. THE SYSTEM SHALL hiện chế độ thuyền (surface/periscope/dive), thân tàu và tốc độ.
5. Màn Bridge đầy đủ nằm ngoài P4 (P5).

### R7. Vòng lặp mô phỏng và bất biến kiến trúc
1. THE SYSTEM SHALL chạy sim bằng bộ tích lũy thời gian với bước cố định 1 s; tốc độ vẽ không được ảnh hưởng kết quả sim.
2. THE SYSTEM SHALL chỉ import từ `@uboat/sim-core` qua barrel `index.ts`, và chỉ gọi các helper quan sát đã công bố; SHALL NOT gọi `truthOf`.
3. THE SYSTEM SHALL chỉ cập nhật giao diện bằng cách subscribe `EventBus` hoặc đọc `summary()/listen()`.
4. WHEN người chơi tải lại trang THE SYSTEM SHALL khôi phục ca trực từ `seed + commandLog` (dùng `replay()`).
5. THE SYSTEM SHALL cho tạm dừng; tạm dừng không gửi tick.

### R8. Kết thúc ca trực
1. WHEN `WATCH_END` đến THE SYSTEM SHALL hiện tổng kết: lý do kết thúc, thân tàu, tổng giờ phát, các quyết định đúng/sai từ `MSG_RESOLVED`.
2. THE SYSTEM SHALL hiện nút chơi lại với cùng seed hoặc seed mới.

### R9. Phi chức năng
1. Hiệu năng: giao diện giữ ≥ 30 fps trên desktop thường; mỗi lần cập nhật DOM chỉ chạm phần tử thay đổi.
2. Khả năng truy cập: mọi điều khiển thao tác được bằng bàn phím; có chỉ báo focus; cảnh báo không chỉ dựa vào màu (kèm chữ/biểu tượng).
3. Mục tiêu nền tảng: desktop trình duyệt hiện đại; mobile ngoài phạm vi.
4. Không dependency runtime mới; chỉ `vite@8.3.5` (devDependency).

## Ngoài phạm vi
Màn Bridge đầy đủ (P5), NPC boats và campaign nhiều đêm, MessagePack/save slot (P6), mạng/đa người chơi, nhạc nền và voice.

## Tiêu chí nghiệm thu P4
- Chơi trọn một ca trực trên trình duyệt thật, có ảnh chụp màn hình làm bằng chứng.
- `tsc`, test sim-core, test UI và `scripts/check-repo.ps1` đều pass.
- Bằng chứng R7.2: tìm kiếm mã nguồn UI không có `truthOf`.
- Độ căng/độ vui **không** được tuyên bố đã kiểm chứng nếu chưa có người chơi.
