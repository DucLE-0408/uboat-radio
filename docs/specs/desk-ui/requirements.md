# Desk UI (bàn làm việc kiểu False Echo) — Requirements

Trạng thái: **ĐÃ DUYỆT 2026-11-04** (người dùng: "Duyệt, làm Stage 1").

## Giới thiệu

Người chơi là sĩ quan mật mã trên U-boat. Desk UI là một **lớp trình bày mới** (`?ui=desk`) dựng theo bố cục của game tham chiếu *False Echo* (bản demo người dùng cung cấp ảnh) và theo **phong cách art của P5** (palette `tools/art/tone.ts`, pixel art sinh bằng code). Lõi mô phỏng, luật Enigma M4, xác thực, HF/DF và save/replay giữ nguyên.

Vòng chơi một bản tin:
1. Tín hiệu Morse đến (vẫn nghe được, vẫn có nhiễu). **Teletyper tự in** chuỗi chữ mã hóa (có `?` ở chỗ nhiễu) lên tờ *Input*.
2. Người chơi đọc **Daily Orders**, đặt máy Enigma, **gõ chuỗi đầu vào lên bàn phím máy**; đèn sáng ra bản rõ trên tờ *Output*.
3. Người chơi soát tin (check letter, tell, challenge), lật tờ Input và **đóng dấu Echo** TRUE/FALSE (không xóa được), đóng dấu thường, ký, kẹp, **giao** cho thủy thủ.
4. Thủy thủ phản ứng bằng lời thoại (Transcript).

**Nguồn tham chiếu và bản quyền:** False Echo chỉ là tham chiếu *cơ chế và bố cục*. Không dùng lại sprite, chữ ký, dấu, văn bản hay tên riêng của game đó (giống R10.4 của P5). Mô tả cơ chế của False Echo trong spec này dựa trên ảnh chụp và chuỗi trong file game; chỗ nào là **suy luận** đều ghi rõ.

Thuật ngữ: *Input* = tờ chuỗi mã hóa do Teletyper in; *Output* = tờ bản rõ; *Echo stamp* = dấu kết luận TRUE/FALSE; *dấu thường* = dấu tròn hai màu; *mission* = danh sách bước của một bản tin; *transcript* = lời thoại trên giấy kẻ dòng; *citation* = giấy phạt khi mắc lỗi.

Định dạng tiêu chí: EARS. Giai đoạn (G1–G4) ghi ở cuối mỗi yêu cầu.

## Bất biến (không đổi)

- **D1.** `packages/sim-core` không bị sửa ở G1–G2. G3 có spec sim-core riêng.
- **D2.** UI chỉ import `@uboat/sim-core` qua barrel; chỉ gửi `Command` bằng `Watch.dispatch`; dựng trạng thái từ `EventBus` và helper quan sát. **Sửa đổi so với P5 B2 (đã duyệt 2026-11-04):** UI được gọi thêm các hàm thuần đã xuất qua barrel `dayEnigma`, `decipherCopy` và lớp `Enigma` với `seed` của phiên, vì người chơi là người giữ khóa ngày hợp lệ. Không có hàm nào trong số này tiết lộ dữ liệu sự thật.
- **D3.** Không gọi `truthOf`, không đọc trạng thái private, không hiện Intel, hazard hay khoảng cách địch thật.
- **D4.** Đúng/sai/giả của một tin chỉ lộ sau `MSG_RESOLVED` hoặc ở tổng kết. Lời thoại phản ứng trước đó chỉ dựa trên điều quan sát được.
- **D5.** Enigma **M4** giữ nguyên: 4 cửa sổ, rotor Greek (thứ tư) không bước.
- **D6.** Mọi gameplay P4/P5 còn đủ: nhận Morse, nhiễu, copy theo `rxId`/`attempt`, `?`, decipher, check letter, tell, bảng auth, challenge/reply/check, xin lặp, accept/reject, rủi ro phát, radio silence, báo cáo, sonar, lệnh tàu, hư hại, khẩn cấp, kết thúc ca.
- **D7.** P5 và P4 (`?ui=classic`) giữ nguyên trong G1; sau khi G1 được duyệt, Desk thành mặc định và P5 thành tùy chọn trong Settings.

## Yêu cầu

### R1. Bàn làm việc và bố cục (G1)
1. THE SYSTEM SHALL dựng scene logic 640×360, scale nguyên, theo bố cục tham chiếu: cutaway tàu trên cùng; cột trái gồm chân dung người ra vào và bảng điều khiển tàu; giữa là mặt bàn đặt giấy tự do; phải là Teletyper, Echo Stamper và máy Enigma (kéo ra/vào bằng tay cầm).
2. THE SYSTEM SHALL vẽ theo style P5 (palette, nearest-neighbor, không noise phủ đều) và dùng sprite sinh bằng `tools/art`, gán `TEMPORARY`.
3. THE SYSTEM SHALL hiện tooltip tên đồ vật khi rê chuột hoặc focus bàn phím (ví dụ "Thùng rác", "Ghim giấy").
4. THE SYSTEM SHALL nhắm **desktop** (≥ 1280×720). Mobile và tablet ngoài phạm vi theo chỉ dẫn người dùng; điều hướng bàn phím và focus nhìn thấy vẫn bắt buộc.

### R2. Giấy hai mặt (G1)
1. THE SYSTEM SHALL mô hình mỗi tờ giấy gồm loại, mặt trước (nội dung), mặt sau (ô dấu, chữ ký), vị trí trên bàn và trạng thái (đang giữ, đã kẹp, đã giao, đã hủy).
2. WHEN người chơi lật một tờ THE SYSTEM SHALL đổi mặt hiển thị; nội dung mặt trước là DOM thật (`textContent`).
3. THE SYSTEM SHALL cho kéo thả giấy bằng chuột, và có đường thay thế bằng bàn phím (chọn tờ, chọn đích, xác nhận).
4. THE SYSTEM SHALL có các loại giấy G1: Input (Teletyper), Output (bản rõ), Daily Orders, Manual, Transcript, Mission. Loại khác ở G3–G4.
5. IF số giấy trên bàn vượt giới hạn hiển thị THEN THE SYSTEM SHALL xếp chồng có thứ tự, không làm mất giấy.

### R3. Teletyper và nhận tin (G1)
1. WHEN `MSG_RX` đến THE SYSTEM SHALL nháy đèn tin đến, phát Morse như P5 (RNG thẩm mỹ riêng), và **in dần** lên tờ Input chuỗi `watch.copy(tokens)` theo nhịp âm thanh.
2. THE SYSTEM SHALL ghi trên tờ Input: người gửi, mạng, DTG, indicator 4 chữ, số attempt; giữ nhiễu dưới dạng `?`.
3. WHEN người chơi bấm nút xin lặp trên Teletyper THE SYSTEM SHALL gửi `repeat` và in attempt mới ra tờ riêng; tờ cũ không mất.
4. WHEN trang khôi phục sau reload THE SYSTEM SHALL dựng lại giấy từ log ở chế độ silent, không phát lại âm thanh.

### R4. Máy Enigma tương tác (G1 cơ bản, G2 đầy đủ)
1. (G1) THE SYSTEM SHALL cho gõ chuỗi Input lên bàn phím máy (chuột hoặc phím vật lý `event.code`); mỗi phím ghi vào copy của `rxId`/`attempt` đang mở, đèn lampboard sáng chữ tương ứng.
2. (G1) WHEN người chơi xác nhận THE SYSTEM SHALL tính bản rõ bằng `decipher` và in lên tờ Output; nhóm hỏng đánh dấu như P5 R4.2.
3. (G2) THE SYSTEM SHALL có công tắc nguồn; WHILE máy tắt, bàn phím không làm sáng đèn và không ghi copy.
4. (G2) THE SYSTEM SHALL cho mở nắp rotor (chỉ khi máy tắt), **lăn chuột** từng vòng để đặt vị trí 4 chữ, đóng nắp. Vòng thứ tư (Greek) đặt được nhưng không bước khi gõ.
5. (G2) WHEN người chơi gõ một phím THE SYSTEM SHALL bước rotor kiểu odometer (gồm double-step) và cập nhật cửa sổ ngay; WHEN người chơi kết thúc một nhóm (Space) THE SYSTEM SHALL đồng bộ lại vị trí đầu nhóm kế tiếp như `decipherCopy`.
6. (G2) THE SYSTEM SHALL tính bản rõ bằng `decipherCopy(seed, ngày, vị trí người chơi đặt, copy)`; đặt sai vị trí thì ra bản rõ sai và check letter không khớp, không có thông báo nguyên nhân.
7. THE SYSTEM SHALL không hiện cấu hình khóa ngày ngoài Daily Orders.

### R5. Daily Orders và Manual (G1 tĩnh, G2 khóa ngày)
1. (G1) THE SYSTEM SHALL có tờ Daily Orders nhiều trang (lật trang), gồm: Verification Tasks (các tell cần soát: fist, DF bearing, DTG, grid, check letter), Stamping Rules (dấu nào lên tờ nào, màu dấu thường), danh sách đài đã biết (từ `worldCtx()`), tin tức, trang kết thúc.
2. (G2) THE SYSTEM SHALL in **khóa ngày** (rotor, ring, plugboard từ `dayEnigma`) ở mục "Obscura Setup" và nhắc đặt vị trí theo indicator của từng tin.
3. (G1) THE SYSTEM SHALL có Manual (sổ lò xo, mục lục): luật chung, sơ đồ bàn, máy, Echo Stamper, Teletyper, loại giấy, dấu.
4. THE SYSTEM SHALL viết mọi văn bản mới, không chép văn bản của game tham chiếu.

### R6. Đóng dấu, ký, kẹp, giao (G1)
1. THE SYSTEM SHALL có Echo Stamper: tay kéo đưa máy ra bàn, công tắc TRUE/FALSE đổi màu, đèn READY, tay đóng.
2. WHEN người chơi đóng dấu Echo lên mặt sau tờ Input THE SYSTEM SHALL gửi `resolve` (TRUE = accept, FALSE = reject) **đúng một lần**; dấu không xóa được.
3. IF `dispatch` trả `false` THEN THE SYSTEM SHALL không in dấu và báo theo P5 R6.3 (chỉ nêu sự kiện quan sát).
4. THE SYSTEM SHALL có dấu thường hai màu, bút để ký, ghim để kẹp; Stamping Rules quyết định màu cần dùng.
5. WHEN người chơi kéo xấp giấy đã kẹp tới người ở cửa THE SYSTEM SHALL ghi "đã giao" và kích hoạt phản ứng (R8).
6. THE SYSTEM SHALL có thùng rác; IF người chơi vứt giấy không được phép vứt THEN THE SYSTEM SHALL từ chối và giải thích bằng luật trong Manual (G1), ghi lỗi (G3).

### R7. Mission (G1)
1. THE SYSTEM SHALL hiện bảng Mission cho tin đang xử lý với các bước: in xong Input, đặt máy, giải mã, soát, đóng Echo, đóng dấu thường, ký, kẹp, giao.
2. THE SYSTEM SHALL tick bước theo **thao tác thật**, không cho tick tay; bảng đổi trạng thái khi hoàn thành.

### R8. Người ở cửa và Transcript (G1)
1. THE SYSTEM SHALL hiện chân dung người đến cửa (thủy thủ, sĩ quan) và lời thoại trên tờ Transcript, có tên và chức vụ, có lời của người chơi; "phím bất kỳ để tiếp, giữ Space để bỏ qua".
2. THE SYSTEM SHALL kích hoạt thoại từ sự kiện: mở ca, tin đến, giao giấy, `MSG_RESOLVED`, `AUTH_RESULT`, `HFDF_FIX`, `DEPTH_CHARGE`, `BRIDGE_ALERT`.
3. THE SYSTEM SHALL chọn câu thoại bằng RNG thẩm mỹ riêng, tất định theo seed.

### R9. Lệnh tàu và an toàn (G1)
1. THE SYSTEM SHALL giữ cutaway tàu của P5 trên cùng (mode, chong chóng, hư hại, báo động).
2. THE SYSTEM SHALL đặt lệnh tàu ở bảng điều khiển dưới chân dung: cần lặn/periscope/nổi, tốc độ, hướng, nút radio silence, nút báo cáo, đồng hồ tổng giờ phát, đèn ăng-ten, ngày.
3. THE SYSTEM SHALL giữ sonar và bảng auth dạng ngăn kéo; `BRIDGE_ALERT` bật chế độ khẩn cấp như P5.

### R10. Điểm và đồng hồ (G2)
1. THE SYSTEM SHALL tính điểm (đơn vị *Ration* / *Khẩu phần*): +1 mỗi ký tự gõ khớp tờ Input, −1 mỗi ký tự lệch (được âm), thưởng theo loại bước khi hoàn thành.
2. THE SYSTEM SHALL hiện chữ vừa gõ xanh khi khớp, đỏ khi lệch, chỉ so với tờ Input mà người chơi nhìn thấy (không so với sự thật).
3. WHERE người chơi bật đồng hồ trong Settings THE SYSTEM SHALL giới hạn mỗi tin 2 phút thời gian thực; hết giờ thì báo (G2), tính lỗi (G3).
4. THE SYSTEM SHALL lưu điểm riêng khỏi save game, có validate, không ảnh hưởng replay.

### R11. Đa ngôn ngữ (G1)
1. THE SYSTEM SHALL có bảng chuỗi `en` và `vi` cho mọi chữ giao diện, giấy tờ và thoại; chọn ngôn ngữ ở Settings, lưu cục bộ.
2. THE SYSTEM SHALL không bake chữ vào sprite; font cần đủ glyph tiếng Việt: thêm subset tiếng Việt của cùng font OFL (đã duyệt), dùng VT323 nếu Silkscreen không có.

### R12. Phi chức năng
1. Không dependency mới; ≥ 30 fps desktop; chỉ chạm DOM phần tử đổi.
2. `textContent` cho mọi chữ động; không `innerHTML`.
3. Dọn audio, animation, event subscription khi đổi phiên.
4. Asset mới ghi nguồn, license, kích thước, frame trong manifest.

## Giai đoạn sau (phác, spec riêng)

- **G3 (cần spec sim-core):** citation (sai 3 lần: tàu gặp nguy hiểm, lộ vị trí; sai 5 lần: bị xử tử, thua ca); tell dạng giấy tờ (dấu xác thực in sẵn: không có / thật / giả y hệt; chữ ký so mẫu; danh sách người gửi được duyệt; Sender ID mã hóa giải bằng máy); cắm dây plugboard; lưu trữ hoặc hủy giấy theo lệnh; tin tức dùng để soát nội dung.
- **G4:** chế độ Endless (bật tắt mô-đun Timer, Rotors, Stamps, Signatures, Cables, Teletyper; độ khó), mã hóa và gửi tin, Private Message (nhắc nhở hoặc đe dọa từ thủy thủ), Roster (danh sách chức vụ thủy thủ đoàn).

## Ngoài phạm vi
Mobile và tablet, chơi trên web (game chỉ tải về; chỉnh trang landing là quyết định riêng), Bridge đầy đủ, mạng, art do họa sĩ.

## Tiêu chí nghiệm thu G1
1. `tsc` strict sạch; test sim-core và radio-ui pass; `git diff packages/sim-core` rỗng; không có `truthOf` trong UI.
2. Chơi trọn một ca trên desktop bằng `?ui=desk`: tin đến, Teletyper in, gõ máy, giải mã, challenge, đóng Echo cả TRUE và FALSE, dấu thường, ký, kẹp, giao, thoại phản ứng, xin lặp, lệnh tàu, khẩn cấp, tổng kết.
3. Save/reload khôi phục giấy và trạng thái, không phát lại âm thanh; replay cho cùng log sự kiện.
4. Chuyển `en`/`vi` toàn bộ giao diện.
5. Ảnh chụp các trạng thái chính; mọi mục chưa thử ghi `unverified`; art ghi `TEMPORARY`.
