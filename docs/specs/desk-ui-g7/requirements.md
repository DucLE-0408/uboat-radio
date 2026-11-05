# Desk UI G7 (tủ kéo, ấn và mực, máy cất được) — Requirements

Trạng thái: **CHỜ DUYỆT** (xem `tasks.md`, cổng S0). Spec cha: `docs/specs/desk-ui/` (G1–G2) và `docs/specs/desk-ui-g3/` đến `desk-ui-g5/`. G7 xây trên PR giấy slip và giấy mã hóa (`desk-papers-slip-encode`).

## Giới thiệu

Bàn làm việc hiện cố định: một ngăn kéo duy nhất ở mép trái (dấu xanh/đỏ, bút, kẹp, Orders, Manual), thùng rác riêng, ba máy cố định ở cột phải, và giấy tự hiện lên bàn. Ảnh tham chiếu của người vận hành (`docs/specs/desk-ui-g7/reference.md`) cho thấy một bàn có nhiều ngăn kéo và máy trượt ra vào. G7 chuyển bàn sang kiểu đó:

1. **Tủ kéo bên trái** trượt từ trái sang phải, ba ngăn xếp dọc: thùng rác (trên cùng), kẹp và giấy mã hóa (giữa), phiếu xác minh người gửi (slip) và giấy giải mã (dưới cùng).
2. **Tủ Orders riêng** (hộc tủ có tay nắm ở bảng điều khiển trái dưới): Daily Orders, Manual và các tờ tham chiếu.
3. **Một cây ấn và hai ô mực** (xanh, đỏ): chấm mực rồi đóng; mỗi lần chấm chỉ đóng được một dấu. Cây bút để cạnh cây ấn.
4. **Ba máy cất được ở bên phải** (máy Echo TRUE/FALSE, máy nhận Teletyper, Enigma): mỗi máy một tay nắm, kéo ra mặt bàn hoặc đẩy vào để cất.

G7 là **thay đổi giao diện thuần túy**: không sửa `packages/sim-core`, không đổi luật game hay luật giao nộp (xem Bất biến). Tiêu chí viết theo EARS.

## Bất biến (kế thừa, không đổi)

- **D1′, D9.** Sim không bị ảnh hưởng: không thêm lệnh, sự kiện hay trạng thái sim. Save = seed + tùy chọn + commandLog vẫn tái dựng đúng; test replay/xác định của sim-core giữ nguyên xanh.
- **D3, D4.** Giao diện không đọc sự thật (`truthOf`), không cho biết tin đúng hay giả trước `MSG_RESOLVED`.
- **G1–G3 (luật giấy).** Input cần dấu Echo và chữ ký; Output cần đúng một dấu đỏ; kẹp một Input với Output của cùng tin; giao nộp qua cửa. Các lệnh `actions.paperwork`/`actions.dispose` giữ nguyên dạng (`stampsBefore`, `sheet`, `color`). **Hai thay đổi có chủ ý so với G3 (người vận hành chốt 2026-11-05):** giao nộp không còn bị chặn khi thiếu dấu Echo mà làm nhiệm vụ thất bại (R10); và Output, slip, encode có thể bỏ vào thùng rác (chỉ Input không, R2).
- **R9 (G2).** Mọi thứ đạt được bằng bàn phím và chuột; không có thao tác nào chỉ kéo thả được.
- **Thiết kế.** Chỉ mở rộng giao diện bàn hiện có (AGENTS.md mục 2.7); ảnh phác bố cục và ảnh tham chiếu của người vận hành là nguồn duyệt thiết kế.
- **Lưu trữ.** `desk.v1` chỉ thêm trường tùy chọn; bản cũ không có các trường đó vẫn nạp được (mặc định: tủ đóng, máy kéo ra, giấy ở nơi chúng được tạo).

## Yêu cầu

### R1. Tủ kéo bên trái (ba ngăn)
1. THE SYSTEM SHALL có một tủ kéo ở mép trái mặt bàn, đóng mặc định, với một tay nắm; WHEN người chơi kéo tay nắm sang phải, bấm tay nắm, hoặc nhấn Enter/Space khi tay nắm có tiêu điểm THE SYSTEM SHALL trượt tủ ra mặt bàn (và ngược lại để đóng), có hoạt ảnh trượt từ trái sang phải.
2. THE SYSTEM SHALL chia tủ thành ba ngăn xếp dọc: **(a)** trên cùng: thùng rác; **(b)** giữa: kẹp và giấy mã hóa (encode); **(c)** dưới cùng: slip xác minh người gửi và giấy giải mã (decode).
3. THE SYSTEM SHALL cho phép kéo một tờ từ ngăn ra mặt bàn và kéo một tờ từ mặt bàn về đúng ngăn của nó; một tờ chỉ vào được ngăn dành cho loại của nó (Output vào ngăn dưới, Encode vào ngăn giữa, slip vào ngăn dưới); thả sai ngăn thì tờ trở về chỗ cũ kèm một dòng giải thích ngắn.
4. WHEN tủ đóng THE SYSTEM SHALL không vẽ các tờ đang cất; mở lại thì còn nguyên.
5. THE SYSTEM SHALL ghi lại ngăn của mỗi tờ để lưu trong layout (R7), và hiện số tờ đang cất trên tay nắm hoặc nhãn ngăn.
6. WHILE tủ đang mở THE SYSTEM SHALL không che các nút thao tác chính (cửa giao nộp, ấn, ô mực); tủ có thể đóng bằng Esc.

### R2. Thùng rác (ngăn trên cùng)
1. THE SYSTEM SHALL chuyển thùng rác từ vị trí hiện tại vào ngăn trên cùng của tủ; WHEN tủ đóng thì thùng rác không dùng được.
2. THE SYSTEM SHALL cho bỏ vào thùng rác **mọi loại giấy trừ giấy Input** (Output, slip, encode, và ghi chú riêng). *(Người vận hành chốt 2026-11-05: "nhận mọi thứ nhưng không nhận các thông tin input".)* Giấy tham chiếu (Mission, Orders, Manual) là đồ đạc của bàn, không bỏ rác (giả định, ghi ở design mục 8).
3. WHEN người chơi thả một tờ Input (hoặc một bó có Input) vào thùng rác THE SYSTEM SHALL từ chối: tờ về chỗ cũ, hiện lời từ chối, và gọi `actions.paperwork(rxId, { act: "bin", sheet: "input" })` như hiện nay (sim trích `wrongBin`).
4. WHEN người chơi bỏ Output, slip hoặc encode vào thùng rác THE SYSTEM SHALL xóa tờ khỏi bàn mà **không** gọi lệnh `bin` (sim không bị báo, D1′); hệ quả nằm ở bàn: thiếu Output thì giao nộp vẫn bị `noOutput` như hiện nay, và nhiệm vụ trong Mission của tin đó không đạt. Tờ đã bỏ rác không lấy lại được, nên cần xác nhận một lần khi bỏ Output chưa giao nộp.
5. THE SYSTEM SHALL giữ nút thùng rác bằng bàn phím (chọn tờ rồi bấm nút) như hiện có.

### R3. Tủ Orders riêng
1. THE SYSTEM SHALL có một hộc tủ có tay nắm ở bảng điều khiển trái dưới, **tách biệt với tủ kéo ba ngăn**, chứa Daily Orders, Manual và các tờ tham chiếu.
2. WHEN người chơi mở hộc THE SYSTEM SHALL cho lấy Orders hoặc Manual ra mặt bàn như ngăn kéo cũ; đẩy tờ về hộc thì cất lại.
3. THE SYSTEM SHALL bỏ Orders và Manual khỏi ngăn kéo dụng cụ cũ.
4. THE SYSTEM SHALL đặt hộc Orders vào chỗ bảng điều khiển trái dưới khi bảng đó đã được dời đi (R11).

### R4. Ấn và mực
1. THE SYSTEM SHALL có **một cây ấn** và **hai ô mực tròn** (xanh, đỏ) luôn nhìn thấy trên bàn, ngoài mọi tủ; cây bút (ký) để cạnh cây ấn.
2. THE SYSTEM SHALL cho người chơi **cầm cây ấn bằng chuột**: bấm hoặc nhấn giữ cây ấn ở chỗ đặt thì cây ấn đi theo con trỏ; bấm lại vào chỗ đặt hoặc nhấn Esc thì trả cây ấn về chỗ. *(Người vận hành chốt 2026-11-05: "dùng chuột để di chuyển cây ấn để đóng dấu".)*
3. WHEN người chơi đang cầm cây ấn và bấm vào một ô mực THE SYSTEM SHALL nạp cho cây ấn màu của ô mực đó (một lần đóng).
4. WHEN cây ấn đang có mực và người chơi bấm vào mặt sau của một tờ THE SYSTEM SHALL đóng đúng một dấu màu đó vào ô dấu kế tiếp, rồi cây ấn hết mực; muốn đóng tiếp phải chấm lại.
5. IF cây ấn chưa có mực THEN THE SYSTEM SHALL không đóng và hiện lời nhắc "chấm mực trước"; IF bấm vào mặt trước hoặc tờ tham chiếu THEN THE SYSTEM SHALL từ chối như hiện nay (`desk.tool.front`, `desk.tool.notAllowed`).
6. THE SYSTEM SHALL giữ luật đóng dấu của G1–G3 (ô dấu thường, hai ô mỗi tờ, mực không phai, dấu Echo do sim quyết định); chỉ thay thao tác. Mỗi dấu đóng thành công vẫn gọi `actions.paperwork(..., { act: "stamp", ... })` như hiện nay.
7. THE SYSTEM SHALL có **cách dùng bằng bàn phím tương đương** (trợ năng, R9 của G2): phím chọn ấn, phím chọn mực xanh/đỏ, Enter đóng lên tờ đang chọn; chuột là cách chính, bàn phím là cách thay thế.
8. THE SYSTEM SHALL không lưu cây ấn và trạng thái mực qua tải lại (về chỗ đặt, chưa nạp mực).

### R5. Kẹp
1. THE SYSTEM SHALL đặt kẹp ở ngăn giữa của tủ kéo; kẹp **không được đặt lên bàn như một vật**. WHEN người chơi lấy kẹp ra THE SYSTEM SHALL cho **cầm kẹp bằng chuột** như cây ấn: kẹp đi theo con trỏ cho đến khi trả về ngăn giữa (bấm vào ngăn hoặc Esc). *(Người vận hành chốt 2026-11-05.)*
2. WHEN người chơi đang cầm kẹp và bấm vào một tờ THE SYSTEM SHALL gắn kẹp vào tờ đó (tờ có kẹp, kẹp rời tay và hiện trên tờ).
3. WHEN người chơi kéo một tờ có kẹp và thả lên tờ Input của cùng tin THE SYSTEM SHALL liên kết hai tờ thành một bó: chúng di chuyển cùng nhau như hiện nay (`clipTo`).
4. THE SYSTEM SHALL giữ luật: chỉ liên kết tờ của cùng một tin; tờ tham chiếu không kẹp được; một nhóm một tin; bấm kẹp lần nữa trên tờ đã kẹp thì gỡ (như `unclip` hiện có).

### R6. Ba máy cất được (bên phải)
1. THE SYSTEM SHALL cho mỗi máy trong ba máy (**máy Echo TRUE/FALSE**, **Teletyper nhận tín hiệu**, **Enigma**) một tay nắm ở mép bàn phía phải; kéo tay nắm sang trái, bấm hoặc Enter thì máy trượt ra mặt bàn, làm lại thì cất vào.
2. WHILE một máy đang cất THE SYSTEM SHALL chỉ hiện tay nắm và nhãn của máy; máy không dùng được cho đến khi kéo ra.
3. WHEN Teletyper đang cất và có tin đến THE SYSTEM SHALL vẫn nhận tin (sim không đổi) và in vào giấy Input đúng thời gian; giấy hiện ra khi máy được kéo ra hoặc ngay khi in xong, theo R8.
4. IF máy Echo hoặc Enigma đang cất khi người chơi thao tác cần đến nó THEN THE SYSTEM SHALL hiện một lời nhắc ngắn "kéo máy ra" thay vì im lặng không phản hồi. Cất máy Echo **không chặn** giao nộp; hậu quả của việc thiếu dấu Echo theo R10.
5. THE SYSTEM SHALL giữ hành vi hiện có của Enigma (trượt ra phủ một phần mặt bàn, `PWR`/`LID`, đặt rotor, cắm plugboard) và đổi nút PULL OUT/PUSH IN thành tay nắm đồng bộ với hai máy kia.
6. THE SYSTEM SHALL ghi trạng thái cất/kéo ra của từng máy vào layout (R7).

### R7. Lưu và khôi phục
1. THE SYSTEM SHALL lưu vào `desk.v1` (chỉ trường tùy chọn): trạng thái đóng/mở của hai tủ, trạng thái cất/kéo ra của ba máy, và ngăn của từng tờ (`place`: `desk`, `handed`, `drawer`, hoặc `cab:<ngăn>`).
2. THE SYSTEM SHALL kiểm tra mọi trường đọc từ localStorage (không tin dữ liệu lưu): trường sai thì bỏ riêng mục đó; layout cũ không có trường mới nạp bình thường.
3. WHEN tải lại THE SYSTEM SHALL khôi phục đúng chỗ các tờ, kể cả tờ đang cất trong ngăn, mà không phụ thuộc vào thời điểm tải.

### R8. Giấy lấy ra từ ngăn
1. WHEN một tin đến THE SYSTEM SHALL tạo tờ Input trên mặt bàn như hiện nay (Input không nằm trong ngăn).
2. WHEN cần ghi bản sao hoặc giải mã THE SYSTEM SHALL cung cấp giấy giải mã, slip và giấy mã hóa **nằm sẵn trong ngăn của chúng**; người chơi kéo ra mặt bàn khi cần.
3. WHEN người chơi gõ bản sao mà chưa có giấy giải mã trên bàn THE SYSTEM SHALL hiện lời nhắc "lấy giấy giải mã từ ngăn dưới" và không mất ký tự đã gõ. *(Câu hỏi mở 1.)*
4. THE SYSTEM SHALL tạo giấy giải mã cho mỗi lần thu của mỗi tin khi cần, và slip khi Input in xong (có dữ liệu giấy), như hiện nay nhưng đặt vào ngăn thay vì lên mặt bàn.
5. THE SYSTEM SHALL giữ nội dung và chức năng của ba tờ (G7 không đổi chữ trên giấy), và các chi tiết bổ sung theo mẫu Schlüsselzettel nằm ngoài G7.

### R9. Giao diện, trợ năng, i18n
1. THE SYSTEM SHALL hoạt động ở 1280×720 trở lên (như G1) và không tràn khung. Khi tủ mở và máy kéo ra cùng lúc, thứ tự ưu tiên không bị che là: tay nắm, ấn và mực, tủ kéo trái, máy bên phải (design mục 2).
2. THE SYSTEM SHALL cho mọi tay nắm có tên truy cập (`aria-label`), `aria-expanded`, tiêu điểm nhìn thấy và thông báo trạng thái ngắn cho trình đọc màn hình.
3. THE SYSTEM SHALL thêm mọi chữ mới vào cả `en.ts` và `vi.ts`; bản tiếng Việt không cắt chữ trong ô hiện có.
4. THE SYSTEM SHALL dùng nghệ thuật pixel tạo bằng `tools/art` (TEMPORARY, như phần còn lại) và ghi vào `manifest.json`; không thêm thư viện.

### R10. Thiếu dấu Echo thì nhiệm vụ thất bại ngay
1. WHEN người chơi giao nộp một bó mà Input chưa có dấu Echo THE SYSTEM SHALL **không chặn** giao nộp (bỏ lời từ chối `noEcho` của G3) mà cho giao, gọi `actions.paperwork(rxId, { act: "handover", echo: false, ... })` (sim trích `badHandover` như luật hiện có), rồi đánh dấu **nhiệm vụ của tin đó thất bại ngay**. *(Người vận hành chốt 2026-11-05: "không chặn nhưng nếu không có ấn echo là task fail ngay".)*
2. THE SYSTEM SHALL tính thất bại này là **một lần sai trong năm lần dẫn tới bị hành quyết**: đó chính là cảnh cáo `badHandover` mà sim ghi (G3: cảnh cáo thứ năm là chết). *(Người vận hành chốt 2026-11-05: "tính vào 1 lần sai trong 5 lần bị hành quyết".)* Desk không trừ thêm Ration cho lỗi này ngoài cách xử lý cảnh cáo hiện có, để một lỗi không bị phạt hai lần.
3. WHEN nhiệm vụ thất bại THE SYSTEM SHALL hiện trạng thái "thất bại" trên tờ Mission của tin đó, hủy các phần thưởng Ration chưa trả của tin (không trả thêm), và phát một âm báo/toast thất bại kèm số cảnh cáo hiện có (ví dụ "2/5").
4. THE SYSTEM SHALL dùng cảnh cáo của sim làm nguồn sự thật (D1′, D9); trạng thái "thất bại" trên Mission suy ra từ log và không thêm lệnh hay sự kiện sim; tin đó vẫn chờ quyết định như hiện nay nếu chưa có `MSG_RESOLVED`.
5. THE SYSTEM SHALL giữ nguyên hành vi khi có dấu Echo: giao nộp bình thường như G3.

### R11. Dời bảng điều khiển để nhường chỗ cho tủ Orders
1. THE SYSTEM SHALL dời toàn bộ bảng điều khiển trái dưới (cần độ sâu, đồng hồ tốc độ, Silence, Report, đồng hồ TX) sang màn hình **Dashboard** mới (spec riêng `docs/specs/desk-ui-g8/`), giữ nguyên chức năng và phím tắt.
2. WHILE Dashboard chưa có THE SYSTEM SHALL tạm đặt các điều khiển đó trong màn hình Helm hiện có (đã có chế độ nổi/lặn và tốc độ), để bàn không mất chức năng khi chuyển.
3. WHEN các điều khiển đã dời THE SYSTEM SHALL giải phóng vùng `{8,240,132,112}` cho tủ Orders (R3.4).

## Ngoài phạm vi

- `packages/sim-core`, luật game, luật giao nộp, bảng điểm Ration.
- Thêm chi tiết mới trên giấy (số điện, số nhóm, tên gọi, nhãn tiếng Đức): việc riêng, theo mẫu Schlüsselzettel.
- Bàn phím mới hoàn toàn khác bố cục; Helm; màn hình chart.
