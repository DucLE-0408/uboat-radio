# Desk UI G4 (Endless, mã hóa và gửi tin, Private Message, Roster) — Requirements

Trạng thái: **DRAFT — CHƯA DUYỆT**. Không được sửa `packages/sim-core` cho tới khi người vận hành duyệt spec này (xem `tasks.md`, cổng S0). Spec cha: `docs/specs/desk-ui/` (G1–G3 đã xong và đã merge; G3 ở `docs/specs/desk-ui-g3/`).

## Giới thiệu

G1–G3 là **một ca trực cố định** 30 phút với 2 bức điện theo kịch bản (`balance.json` `watch.messages`), và người chơi chỉ **nhận** tin. G4 mở rộng thành:

1. **Endless**: ca trực không có hạn giờ, tin đến liên tục với độ khó tăng dần; người chơi **bật/tắt từng mô-đun** (Timer, Rotors, Stamps, Signatures, Cables, Teletyper) và chọn **độ khó**.
2. **Mã hóa và gửi tin**: chiều ngược lại. Người chơi soạn bản rõ, **mã hóa bằng chính máy** (đã đặt rotor, cắm plugboard), rồi phát; thời gian phát đi vào HF/DF như `transmit` hiện có.
3. **Private Message**: thủy thủ gửi giấy riêng (nhắc nhở hoặc đe dọa) do sim phát sinh từ hành vi của người chơi.
4. **Roster**: danh sách chức vụ và tên thủy thủ đoàn, dùng cho lời thoại, Private Message và Endless.

G4 cần sửa `packages/sim-core` (tùy chọn ca trực, bộ phát tin vô hạn, lệnh gửi, sự kiện mới) và định dạng save, nên cũng cần cổng duyệt riêng.

Định dạng tiêu chí: EARS. Mọi hậu quả đi qua `Command` vào `Watch.dispatch` và sinh `SimEvent`.

## Bất biến (kế thừa, không đổi)

- **D1′.** Sim headless, tất định, một PRNG có seed, bước cố định, không `Math.random`, không đồng hồ thật. Mầm mới dùng `derive(seed, "endless" | "roster" | "pm" | "send", ...)` để không làm dịch các luồng cũ.
- **D3, D4.** UI không đọc sự thật (`truthOf`), không biết tin đúng/giả trước `MSG_RESOLVED`. Private Message không được nói đúng/sai của một quyết định.
- **D5.** Enigma M4 giữ nguyên.
- **D8.** Tin giả luôn có ít nhất một tell kiểm chứng được, kể cả ở độ khó cao nhất và khi mô-đun Signatures hoặc Stamps tắt: mô-đun tắt **không được** làm mất tell cuối cùng (xem R1.6).
- **D9.** Save = seed + tùy chọn ca + commandLog. Mọi trạng thái dựng lại được từ đó.
- **D10.** Chế độ ca trực hiện tại (30 phút, `watch.messages`) giữ nguyên hành vi khi không truyền tùy chọn; P4/P5/`?ui=classic` không đổi.

## Yêu cầu

### R1. Endless và mô-đun
1. THE SYSTEM SHALL cho `Watch` nhận tùy chọn `WatchOptions { mode: "night" | "endless"; modules: ModuleSet; difficulty: Difficulty }`; thiếu tùy chọn = ca trực hiện tại (D10).
2. WHILE mode là `endless` THE SYSTEM SHALL không kết thúc theo thời gian; ca chỉ kết thúc bằng `sunk`, `executed` (G3) hoặc người chơi rời ca (R1.8).
3. THE SYSTEM SHALL phát bức điện kế tiếp bằng bộ phát riêng (`derive(seed, "endless", n)`): khoảng cách giữa hai tin, tỷ lệ tin giả, mức nhiễu và hạn giờ lấy từ bảng độ khó (R1.5), tăng dần theo số tin đã nhận.
4. THE SYSTEM SHALL có sáu mô-đun bật/tắt được: `timer` (hạn giờ), `rotors` (phải đặt rotor; tắt = máy tự đặt theo indicator), `stamps` (luật đóng dấu và lỗi `wrongStamp`/`badHandover`), `signatures` (tell chữ ký, dấu in, Sender ID), `cables` (phải cắm plugboard; tắt = dùng khóa ngày), `teletyper` (tắt = tờ Input hiện đủ ngay thay vì in dần).
5. THE SYSTEM SHALL đọc bảng độ khó từ `balance.json` (`endless.difficulties`): ít nhất `easy`, `normal`, `hard`; mỗi mức có khoảng cách tin, tỷ lệ giả, Intel khởi đầu, nhiễu, hạn giờ và mức tăng theo thời gian.
6. WHEN một mô-đun tắt THE SYSTEM SHALL tắt cả phần phán xử liên quan trong sim (không cảnh cáo vì thứ không còn trên bàn) **và** bảo đảm tin giả vẫn còn ít nhất một tell trong các mô-đun còn bật hoặc trong tell cổ điển (fist/bearing/timestamp/grid) (D8).
7. THE SYSTEM SHALL tính điểm Endless (số tin xử đúng liên tiếp, tổng Ration, thời gian sống sót) ở desk; sim chỉ phát sự kiện, không giữ điểm (như R8 của G3).
8. THE SYSTEM SHALL cho người chơi rời ca Endless có chủ đích bằng lệnh `leave` (có log) để tổng kết, không bị tính là chìm tàu.

### R2. Menu và cấu hình Endless
1. THE SYSTEM SHALL thêm vào menu chính mục **Endless**, mở màn cấu hình: chọn độ khó và bật/tắt sáu mô-đun, bắt đầu bằng seed ngẫu nhiên hoặc nhập seed.
2. THE SYSTEM SHALL lưu cấu hình lần chơi gần nhất cục bộ (khóa riêng, validate từng trường) và đưa tùy chọn vào file save (R7).
3. THE SYSTEM SHALL dùng lại kiểu dáng menu hiện có (không hướng UI mới); màn cấu hình dùng cùng thành phần radio/checkbox như Settings.

### R3. Mã hóa và gửi tin
1. THE SYSTEM SHALL có **Outbox** trên desk: tờ *Outgoing* (giấy mới) để soạn bản rõ A–Z, hiện mẫu yêu cầu của lệnh cần trả lời (ví dụ "báo nhận lệnh #n", "báo vị trí").
2. WHEN người chơi bật máy, đã đặt rotor theo indicator gửi đi và cắm plugboard THE SYSTEM SHALL cho gõ bản rõ lên máy; đèn sáng chữ mã, và chữ mã được ghi lên tờ Outgoing theo nhóm 4 (cùng quy tắc đồng bộ nhóm với G2).
3. THE SYSTEM SHALL cho chọn indicator gửi đi (4 chữ do người chơi chọn); dùng lại một indicator đã dùng là lỗi mật mã (tăng Intel như `Intel.indicator` hiện có).
4. WHEN người chơi bấm *Phát* THE SYSTEM SHALL gửi lệnh `send { rxId | null, indicator, groups }` vào sim; sim tính thời gian phát từ độ dài chuỗi Morse (`encode`) và tốc độ phát, cộng vào `transmit` hiện có (tích lũy HF/DF, Intel, bị khóa khi lặn).
5. THE SYSTEM SHALL để sim kiểm tra bản mã bằng khóa ngày: giải `groups` với `indicator` và so với bản rõ yêu cầu; đúng → `SEND_RESULT { ok: true }` và phần thưởng ở desk; sai → `SEND_RESULT { ok: false, reason }` với lý do **quan sát được** (ví dụ "HQ không đọc được"), không lộ bản rõ đúng.
6. WHILE antenna không dùng được (lặn hoặc radio silence) THE SYSTEM SHALL từ chối lệnh `send` như `transmit` hiện nay.
7. THE SYSTEM SHALL tính độ dài tối đa của một tin gửi và số tin gửi chờ (bounded) để chặn nhập vô hạn; vượt thì từ chối ở biên.
8. WHERE mô-đun `rotors` hoặc `cables` tắt THE SYSTEM SHALL dùng cấu hình khóa ngày thay cho cấu hình người chơi (R1.4), nhưng vẫn bắt gõ và phát.

### R4. Private Message
1. THE SYSTEM SHALL phát sự kiện `PRIVATE_MSG { tSec, fromRole, tone, topic }` từ sim, với `tone ∈ {"remind","threat"}` và `topic` chỉ nói về **hành vi quan sát được** của người chơi (đã bị cảnh cáo mấy lần, chưa giao tin nào quá lâu, gửi tin quá dài, phát lộ vị trí), không bao giờ nói tin nào đúng hoặc giả (D4).
2. THE SYSTEM SHALL chọn người gửi từ Roster theo chức vụ phù hợp với `topic` (R5) và chọn mẫu câu từ bảng văn bản `en`/`vi` bằng RNG thẩm mỹ, không ảnh hưởng replay.
3. THE SYSTEM SHALL in Private Message lên giấy loại mới *Private*; đây là giấy **được phép vứt thùng rác** (đúng ghi chú G1: chỉ giấy riêng được vứt), không bao giờ bị cảnh cáo `wrongBin`.
4. THE SYSTEM SHALL giới hạn tần suất Private Message theo bảng (tối thiểu giãn cách, tối đa mỗi ca/phút) để không spam.
5. THE SYSTEM SHALL cho Private Message `threat` chỉ xuất hiện sau khi có cảnh cáo hoặc hạn giờ trượt, và `remind` trước đó; lời `threat` không được thay đổi hậu quả sim (hậu quả vẫn do G3 quyết).

### R5. Roster
1. THE SYSTEM SHALL sinh Roster từ seed (`derive(seed, "roster")`): chức vụ cố định (Thuyền trưởng, Sĩ quan phó, Máy trưởng, Lính thủy âm, Liên lạc viên, đã dùng ở Stage 4 G1) và tên lấy từ một bảng tên bịa sẵn, không dùng tên của game tham chiếu.
2. THE SYSTEM SHALL thay danh sách thủy thủ hardcode ở `desk/dialogue.ts` bằng Roster của sim (tên, chức vụ), giữ nguyên chân dung và thoại.
3. THE SYSTEM SHALL hiện Roster như một tờ tham chiếu mới (trong ngăn kéo cùng Daily Orders và Manual): chức vụ, tên, và trạng thái quan sát được (có mặt / bị thương nếu có `BOAT_DAMAGED`); không hiện thông tin địch.
4. IF boat bị hư hỏng nặng THEN THE SYSTEM SHALL cho một thành viên Roster vắng mặt (sự kiện `ROSTER_CHANGE`) và các thoại/PM của người đó chuyển cho người kế nhiệm; phạm vi tối thiểu: một thành viên vắng mặt mỗi ca (câu hỏi mở 6).

### R6. Điểm và tổng kết
1. THE SYSTEM SHALL hiện tổng kết Endless (số tin xử đúng, chuỗi dài nhất, Ration, số cảnh cáo, thời gian sống sót, độ khó, mô-đun, seed) và lưu điểm cao cục bộ theo (độ khó, bộ mô-đun) trong khóa riêng, có validate, không ảnh hưởng replay.
2. THE SYSTEM SHALL gắn nhãn bộ mô-đun lên điểm cao để điểm của bộ nhẹ không so với bộ đầy đủ.

### R7. Lưu, replay, tương thích
1. THE SYSTEM SHALL ghi `WatchOptions` vào file save (version tăng lên v3; trường `opts` tùy chọn). Save v2 nạp như ca trực cũ (`opts` mặc định, D10).
2. THE SYSTEM SHALL đưa mọi lệnh mới (`send`, `leave`) vào `commandLog`; replay từ seed + opts + log cho kết quả giống từng bit (có test).
3. THE SYSTEM SHALL validate `opts` và lệnh mới ở biên (UI khi nạp save, sim khi nhận lệnh); giá trị lạ bị từ chối, không đoán.
4. THE SYSTEM SHALL giữ P4/P5/`?ui=classic` chạy được: không truyền `opts` thì không có Endless, Outbox hay Private Message.
5. THE SYSTEM SHALL tách `send` thành hợp đồng đủ nhỏ để sau này server có thẩm quyền nhận được (nhận bản mã, tự kiểm tra), nêu giới hạn chống gian lận ở design (như G3 R7.4).

### R8. Phi chức năng
1. Không dependency mới; mọi thay đổi sim-core có test đơn vị, test bất biến (D8) và test replay; `tsc` strict.
2. Toàn bộ chuỗi mới có `en` và `vi`; không dùng lại văn bản hay sprite của game tham chiếu.
3. Giấy mới (Outgoing, Private, Roster) dùng sprite/DOM cùng hệ thiết kế desk, gán `TEMPORARY`.
4. ≥ 30 fps desktop khi Endless chạy lâu: số giấy trên bàn bị chặn (giấy cũ tự vào ngăn hồ sơ theo R2.5 của spec cha).
