# Desk UI G8 (Dashboard, bản đồ Thế chiến 2, thước và compa) — Requirements

Trạng thái: **BẢN NHÁP, CHỜ DUYỆT** (xem `tasks.md`, cổng S0). Sinh ra từ yêu cầu của người vận hành ngày 2026-11-05 khi bàn bàn giao G7 (`docs/specs/desk-ui-g7/`, R11). Khác G7, **G8 cần sửa `packages/sim-core`** (dữ liệu bản đồ thế giới), nên có cổng duyệt riêng.

## Giới thiệu

Bàn điện báo hiện giữ bảng điều khiển tàu ở góc trái dưới, và màn hình Helm (G5) có bản đồ giả lập, la bàn, bánh lái. Người vận hành muốn:

1. Một **màn hình Dashboard mới** gom các đồng hồ, bản đồ lộ trình, la bàn và các điều khiển tàu (dời từ bàn, để nhường chỗ cho tủ Orders của G7).
2. **Nạp bản đồ Thế chiến 2** thật, ván bắt đầu ở **một cảng Đức**.
3. Một **bộ công cụ thước và compa (dividers)** để xác định vị trí và hướng di chuyển của tàu trên bản đồ.

Tiêu chí viết theo EARS.

## Bất biến (kế thừa)

- **D1′, D9.** Sim headless, tất định, một PRNG có seed; save = seed + tùy chọn + commandLog. Mọi thay đổi bản đồ phải tất định và tăng `SIM_VERSION` (bảo vệ phiên bản của G5): save cũ bị từ chối rõ ràng, không đọc sai.
- **D3, D4.** UI không đọc sự thật. Vị trí thật của tàu vẫn nằm trong sim; người chơi chỉ có **ước lượng** (dead reckoning) và các lần **định vị** bằng công cụ. Công cụ không tiết lộ vị trí thật.
- **Dữ liệu.** Chỉ dùng dữ liệu bản đồ có giấy phép cho phép (ưu tiên miền công cộng); ghi nguồn, giấy phép và băm vào `docs/`; không chép bản đồ có bản quyền.
- **Thiết kế.** Mở rộng giao diện hiện có (AGENTS.md mục 2.7); ảnh phác và tham chiếu của người vận hành là nguồn duyệt.

## Yêu cầu

### R1. Màn hình Dashboard
1. THE SYSTEM SHALL có màn hình **Dashboard** bật bằng nút trên desk (đóng bằng nút hoặc Esc), chiếm khung 640×360; sim vẫn chạy, Morse vẫn phát, toast vẫn hiện (như Helm, G5 R3).
2. THE SYSTEM SHALL đặt trên Dashboard một **lưới nhiều ô đồng hồ**, **la bàn**, **bản đồ lộ trình**, và các điều khiển tàu dời từ bàn (cần độ sâu, tốc độ, Silence, Report) với chức năng và phím tắt giữ nguyên. Các ô đồng hồ dùng **dữ liệu sim hiện có**: tốc độ, độ sâu, hướng, tình trạng thân tàu (`hull`), nhiệt độ nước và tầng nhiệt (`water`), sai số định vị (độ trôi `navFix`), đồng hồ TX, giờ trong ngày và ngày tháng.
3. THE SYSTEM SHALL **thay thế Helm bằng Dashboard**: nút HELM mở Dashboard, và các chức năng của Helm (bản đồ ba mức phóng, bánh lái, lệnh di chuyển) nằm trong Dashboard. *(Người vận hành chốt 2026-11-05: "dashboard thay nhưng bổ sung thêm nhiều ô đồng hồ và một số tính năng liên quan".)*
4. WHERE người vận hành muốn thêm đồng hồ cần dữ liệu mới (ắc quy, oxy, nhiên liệu, độ nghiêng) THE SYSTEM SHALL làm chúng như một **giai đoạn tùy chọn sau cổng sim-core** (R4.5), vì sim hiện chưa có các trạng thái đó.
5. THE SYSTEM SHALL tắt đồng hồ **đếm ngược hạn trả lời** của từng tin theo mặc định (xem R7), và hiện thay vào đó đồng hồ giờ trong ngày.
4. THE SYSTEM SHALL đặt toàn bộ chữ ở `en.ts` và `vi.ts`, hoạt động ở 1280×720 trở lên, đủ trợ năng (R9 của G7).

### R2. Bản đồ Thế chiến 2 và cảng xuất phát
1. THE SYSTEM SHALL nạp bản đồ thật của Bắc Hải và Bắc Đại Tây Dương (phạm vi chốt ở câu hỏi mở 2): bờ biển, đảo, và địa danh/hải đăng dùng làm mốc định vị.
2. THE SYSTEM SHALL bắt đầu ván ở **Wilhelmshaven** (người vận hành giao cho tôi chọn, 2026-11-05; gần Bắc Hải), tàu ở vị trí cảng và bờ biển thật quanh cảng.
3. THE SYSTEM SHALL giữ nguyên bản đồ giả lập cũ ở chế độ `?ui=classic`/P4/P5 để không phá các chế độ khác (D10 của G4).
4. THE SYSTEM SHALL tải dữ liệu bản đồ như tài nguyên tĩnh có kiểm tra băm; thiếu hay hỏng thì lui về bản đồ cũ kèm mã lỗi ngắn, không dừng game.

### R3. Thước và compa (dividers)
1. THE SYSTEM SHALL có **thước**: người chơi đặt hai điểm trên bản đồ, thước hiện **khoảng cách** (km hoặc hải lý) và **phương vị** từ điểm đầu đến điểm sau, đo theo thang của bản đồ.
2. THE SYSTEM SHALL có **compa (dividers)**: người chơi mở hai chân theo một khoảng bằng thang đo, rồi "bước" dọc một đoạn để đo độ dài đường đi; số bước và phần dư hiện trên màn hình.
3. WHEN người chơi đặt thước hoặc compa THE SYSTEM SHALL để các công cụ vẽ trên lớp riêng của bản đồ, có thể xóa; công cụ không đổi trạng thái sim.
4. THE SYSTEM SHALL cho người chơi **đánh dấu vị trí ước lượng** của tàu trên bản đồ; IF người chơi nhập vị trí định vị từ mốc (khoảng cách và phương vị tới một mốc đã biết) THEN THE SYSTEM SHALL tính vị trí mới từ phép đo và gửi lệnh sửa ước lượng (R4). Sim không xác nhận ước lượng đúng hay sai.
5. THE SYSTEM SHALL dùng chuột là cách chính (kéo hai đầu thước, mở chân compa) và có cách tương đương bằng bàn phím (nhập tọa độ hoặc nhích điểm bằng phím mũi tên).

### R4. Sim-core: bản đồ và ước lượng (cổng riêng)
1. THE SYSTEM SHALL thay `world` của sim bằng dữ liệu bản đồ thật (R2) khi bật chế độ Thế chiến 2, qua một tùy chọn trong `WatchOptions`, tất định và có test replay bit-exact.
2. THE SYSTEM SHALL giữ cơ chế dead reckoning hiện có (`deadReckon`, trôi theo quãng đường) và thêm lệnh `fix` nhận một ước lượng mới từ phép định vị của người chơi, có kiểm tra phạm vi.
3. THE SYSTEM SHALL **nối các luật G5 vào bản đồ thật** (va chạm bờ, thềm lục địa và đáy biển, thang độ sâu của mìn nước, bão và thời tiết, radar, nhiệt độ nước), từng luật một và có test cho từng luật. *(Người vận hành chốt: "nối các luật đi".)*
4. THE SYSTEM SHALL ghi mọi thay đổi vào `docs/architecture.md` (tương thích save) và tăng `SIM_VERSION`.
5. WHERE có đồng hồ cần trạng thái sim mới (R1.4) THE SYSTEM SHALL thêm chúng trong một giai đoạn riêng có test xác định và `SIM_VERSION` riêng.

### R5. Yếu tố lịch sử theo mốc thời gian
1. THE SYSTEM SHALL gắn ván với **một ngày thật** (mặc định 17/03/1942, như game tham chiếu và ngày trên bàn hiện nay) và chạy một **dòng thời gian lịch sử** trên bản đồ: các sự kiện có ngày, khu vực và tác động lên chơi. *(Người vận hành chốt: "thêm các yếu tố lịch sử vì có mốc thời gian".)*
2. THE SYSTEM SHALL lưu sự kiện lịch sử như **dữ liệu tĩnh có nguồn** (ngày, khu vực, mô tả, hiệu ứng, nguồn trích dẫn) trong một tệp có băm; mỗi sự kiện phải có nguồn; thiếu nguồn thì không nạp.
3. THE SYSTEM SHALL dùng các loại yếu tố: tuyến và đoàn tàu đã biết, vùng thả mìn và vùng cấm, thay đổi mật mã hoặc quy trình điện báo (ví dụ chuyển khóa Enigma), và biến cố thời tiết lớn. Mỗi loại cần dữ liệu có nguồn trước khi làm. *(Danh sách sự kiện cụ thể chốt ở giai đoạn nghiên cứu, câu hỏi mở 5.)*
4. THE SYSTEM SHALL làm sự kiện lịch sử **tất định** theo ngày ván và seed; không đọc ngày giờ thật của máy.
5. THE SYSTEM SHALL ghi rõ trên giao diện (Manual hoặc màn hình tổng kết) khi một yếu tố là sự kiện lịch sử thật và khi là hư cấu, để người chơi không nhầm; yếu tố hư cấu đặt cạnh nguồn thật phải được gắn nhãn.

### R6. Chu kỳ 24 giờ và khung tàu thay đổi theo địa hình và thời gian
1. THE SYSTEM SHALL thêm **chu kỳ 24 giờ** (sáng, trưa, chiều, tối, đêm) tính từ giờ ván (sim đã có `startMin` và `tSec`) thay vì chỉ một ca đêm; thời gian trôi qua ngày và đêm theo giờ ván.
2. THE SYSTEM SHALL làm **khung tàu** (banner cắt ngang tàu ngầm ở đầu desk) **đổi theo giờ trong ngày**: màu trời, ánh sáng trên mặt biển và độ tối của khoang.
3. THE SYSTEM SHALL làm khung tàu **đổi theo địa hình** nơi tàu đang ở (cảng, gần bờ, biển khơi, thềm nông, biển sâu) và theo thời tiết G5 có sẵn (bão, sương, mây). Mỗi tổ hợp giờ và địa hình có một biến thể nền; số biến thể có giới hạn để kích thước tài nguyên hợp lý (design mục 7).
4. THE SYSTEM SHALL suy ra giờ trong ngày và địa hình từ trạng thái sim bằng hàm thuần ở UI (không thêm lệnh sim, chỉ đọc), trừ khi chu kỳ 24 giờ cần ánh sáng thật ảnh hưởng lên luật chơi (tầm nhìn của hộ tống ban ngày ban đêm), khi đó dùng cổng sim-core (R4.5).

### R7. Tạm dừng đồng hồ đếm ngược
1. THE SYSTEM SHALL **tạm dừng** đồng hồ đếm ngược hạn trả lời của từng tin: mặc định mô-đun `timer` tắt ở các ván mới, ô đếm ngược trên desk ẩn đi, không có lỗi `timeout`. *(Người vận hành chốt: "tạm thời dừng thời gian đếm ngược".)*
2. THE SYSTEM SHALL giữ mã mô-đun và luật `timeout` của sim nguyên vẹn (không xóa), và cho bật lại bằng cấu hình mô-đun hoặc khi sau này có yêu cầu mới; ván cũ đã lưu với `timer` bật vẫn tái dựng đúng (D9).

## Ngoài phạm vi

- Luật giấy tờ, tủ, ấn, máy bên phải (G7).
- Mô phỏng thủy triều và hải lưu thực: chưa có dữ liệu đủ tin cậy.
- Đồng hồ ắc quy, oxy, nhiên liệu: làm sau cổng sim-core riêng (R1.4, R4.5), không nằm trong giai đoạn đầu.
