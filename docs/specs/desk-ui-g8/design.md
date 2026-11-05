# Desk UI G8 — Design (bản nháp)

Trạng thái: **BẢN NHÁP, CHỜ DUYỆT**. `R#` là yêu cầu trong `requirements.md`.

## 1. Hiện trạng đã đọc

- `packages/radio-ui/src/desk/helm.ts` (261 dòng): màn hình Helm G5 với bản đồ ba mức phóng, la bàn, bánh lái, cần tốc độ.
- `packages/sim-core/src/watch.ts`: `trueKm()` (vị trí thật), `deadReckon()` (ước lượng trôi theo quãng đường), `origin` của ca; các luật va chạm bờ, thềm lục địa, bão, radar, nước nằm ở các module sim-core riêng (xem `docs/specs/desk-ui-g5/*.md`).
- Bảng điều khiển trái dưới (`desk/index.ts`, `ctl`): cần độ sâu, đồng hồ, Silence, Report, TX.

## 2. Bố cục Dashboard (R1)

Khung 640×360, bốn vùng:

```
+-------------------------------+------------+
| bản đồ lộ trình (lớn)         | đồng hồ    |
| + lớp thước / compa           | (tốc độ,   |
|                               |  độ sâu,TX)|
+--------------+----------------+------------+
| thanh công cụ| la bàn         | điều khiển |
| thước, compa | hoa gió        | tàu (cần,  |
|              |                | Silence,   |
|              |                | Report)    |
+--------------+----------------+------------+
```

Giữ phong cách giấy và kim loại của desk (cùng bảng màu `T` trong `tools/art`); sprite mới TEMPORARY trong `tools/art`.

## 3. Công cụ thước và compa (R3)

- **Thuần, không DOM, không sim:** `desk/chart-tools.ts` với `ruler(a, b, scale) → { dist, bearing }` và `dividers(span, a, b) → { steps, rest }`. Bản đồ cung cấp `scale` (km mỗi pixel logic) theo mức phóng.
- **Lớp vẽ riêng** trên bản đồ (SVG hoặc canvas) xóa được; mức phóng đổi thì công cụ co theo (lưu bằng tọa độ thế giới).
- **Định vị (R3.4):** người chơi chọn một mốc (hải đăng, mũi đất), đo khoảng cách và phương vị tới mốc bằng thước, rồi bấm "định vị tại đây". `desk` tính điểm từ phép đo và gọi `actions.fix(x, y)` (lệnh sim mới, R4.2). Không có "đúng/sai"; sai số của phép đo là của người chơi, và độ trôi dead reckoning vẫn tăng theo quãng đường.
- **Bàn phím:** nhập tọa độ vào ô, hoặc nhích điểm bằng mũi tên (R3.5).

## 4. Dữ liệu bản đồ (R2, R4) — cổng sim-core

- **Nguồn đề xuất:** Natural Earth cho bờ biển và đảo, GEBCO cho độ sâu nếu dùng.
- **Giấy phép đã tra (2026-11-05, nguồn thứ cấp, xem mục 5):**
  - **Natural Earth:** miền công cộng, không cần xin phép hay ghi công; gợi ý ghi "Made with Natural Earth" cho lịch sự. Một vài lớp dữ liệu gói kèm có điều kiện của bên thứ ba, nên chỉ dùng lớp bờ biển và đảo của bộ chính và kiểm tra điều khoản từng lớp.
  - **GEBCO:** điều khoản hiện hành nói lưới GEBCO ở miền công cộng, dùng miễn phí, được sao chép, phát hành và chỉnh sửa; cần ghi nguồn theo mẫu trong tài liệu đi kèm bản phát hành đang dùng; không được ngụ ý có chứng nhận chính thức của GEBCO, IHO hay IOC. Một bản điều khoản cũ nói dữ liệu có bản quyền và quyền cơ sở dữ liệu, mâu thuẫn với điều khoản hiện hành, nên phải đọc lại trang gebco.net và tài liệu của chính bản phát hành lúc nạp.
  - **Việc bắt buộc khi nạp:** ghi nguồn, phiên bản, ngày tải và băm vào `docs/` (design mục 4); đọc lại điều khoản trên trang chính thức vì các kết quả tra đã dựa vào bản sao.
- **Xử lý ngoại tuyến:** một script trong `tools/` rút gọn dữ liệu thành ô lưới (26×26 như thế giới hiện có, hoặc lưới mịn hơn khi cần) và ghi vào một file JSON nhỏ có băm; sim chỉ đọc file này, không đọc mạng.
- **Cảng xuất phát:** một địa danh trong dữ liệu (tọa độ thật) làm `origin`.
- **Sim:** tùy chọn `WatchOptions.world: "classic" | "ww2"`; `ww2` nạp dữ liệu bản đồ, mặc định `classic` để không phá ca trực cũ (D10).
- **Phiên bản:** tăng `SIM_VERSION`; save cũ bị từ chối rõ ràng; thêm test replay bit-exact.

## 5. Câu hỏi mở — người vận hành đã chốt 2026-11-05

1. **Dashboard:** thay Helm và bổ sung nhiều ô đồng hồ cùng vài tính năng liên quan (R1). Đồng hồ cần dữ liệu sim mới (ắc quy, oxy, nhiên liệu, độ nghiêng) là giai đoạn tùy chọn sau cổng sim-core.
2. **Phạm vi bản đồ:** Bắc Hải đến Bắc Đại Tây Dương, thang thật (khoảng 3000×2500 km).
3. **Cảng:** Wilhelmshaven (giao cho tôi chọn).
4. **Luật G5:** nối vào bản đồ thật từng luật một (R4.3).
5. **Yếu tố lịch sử:** thêm (R5), có mốc thời gian. Cần một giai đoạn nghiên cứu nguồn trước khi chốt danh sách sự kiện. Tạm dừng đồng hồ đếm ngược (R7) và thêm chu kỳ 24 giờ cho khung tàu (R6).

6. **Nguồn dữ liệu và giấy phép:** người vận hành yêu cầu xác minh; kết quả ở mục 4. Natural Earth là miền công cộng; GEBCO ở miền công cộng, cần ghi nguồn. Cả hai cần đọc lại điều khoản trên trang chính thức lúc nạp.
7. **Năm bối cảnh:** 17/03/1942 (người vận hành chốt: "lấy bối cảnh đó đi"), như ngày trong ảnh tham chiếu và trên bàn hiện nay.

**Còn mở:**
- **Danh sách sự kiện lịch sử:** sẽ nghiên cứu có nguồn ở Stage 5; mỗi sự kiện cần ngày, khu vực, hiệu ứng và trích dẫn. Người vận hành duyệt danh sách trước khi nạp.
- **Số biến thể khung tàu (R6.3):** đề xuất 3 giờ (ngày, hoàng hôn/bình minh, đêm) × 4 địa hình (cảng, gần bờ, biển khơi, biển sâu) = 12 nền, ghép từ lớp trời, lớp biển và lớp đất để không phải vẽ 12 ảnh riêng.

## 5b. Lưới đồng hồ (R1.2)

- Mỗi ô đồng hồ là một thành phần nhỏ thuần hiển thị `{ id, nhãn, giá trị, đơn vị, trạng thái cảnh báo }` đọc từ trạng thái sim hiện có (qua `store`/`watch`), không tự suy ra sự thật: tốc độ, độ sâu, hướng, thân tàu (%), nhiệt độ nước, tầng nhiệt, sai số định vị, đồng hồ TX, giờ trong ngày, ngày tháng.
- Lưới 4×3 ô (khung 640×360, đồng hồ chiếm cột phải theo mục 2); thêm ô chỉ là thêm một mục vào bảng định nghĩa ô, không đổi bố cục.
- Ô cảnh báo (thân tàu thấp, sắp chạm đáy, sai số lớn) đổi màu và có chữ, không chỉ màu (trợ năng).

## 5c. Chu kỳ 24 giờ và khung tàu (R6)

- **Giờ:** `nowMin = startMin + tSec / 60` đã có trong sim (`watch.ts`); giờ trong ngày = `nowMin % 1440`. Hàm thuần `daypart(nowMin)` trả `"day" | "dusk" | "night"` (ngưỡng theo mùa và vĩ độ có thể thêm sau).
- **Địa hình:** hàm thuần `terrainOf(depth, coastDistance, portDistance)` trả `"port" | "coast" | "open" | "deep"` từ dữ liệu sim đã có (độ sâu đáy, khoảng cách tới bờ). Chỉ đọc, không đổi sim.
- **Ghép nền:** khung tàu ghép từ ba lớp sprite (trời theo `daypart`, biển theo `daypart`, đất theo `terrain`) nên không phải vẽ 12 ảnh riêng; thêm lớp thời tiết G5 hiện có. Chuyển giữa các biến thể bằng cross-fade ngắn, tắt khi người dùng chọn giảm chuyển động.
- **Nếu ánh sáng ảnh hưởng luật** (tầm nhìn của hộ tống ban ngày và ban đêm) thì cần cổng sim-core (R4.5); mặc định chỉ là trình bày.

## 5d. Dòng thời gian lịch sử (R5)

- **Dữ liệu:** `assets/history.json` (hoặc nằm cạnh dữ liệu bản đồ) có `{ id, date, region, kind, effect, source, fiction }`; script kiểm tra ở bước dựng: thiếu nguồn hoặc ngày ngoài phạm vi thì lỗi; `fiction: true` chỉ cho yếu tố hư cấu có nhãn.
- **Sim:** đọc bảng qua tùy chọn `WatchOptions.world: "ww2"`; sự kiện kích hoạt theo ngày ván (`startDate + tSec`), tất định theo seed; không đọc đồng hồ thật. Hiệu ứng ban đầu: vùng cấm hoặc mìn (va chạm), đoàn tàu xuất hiện trên tuyến (mục tiêu), thay đổi mật mã (đổi bảng ngày/khóa), tin tức.
- **Nghiên cứu nguồn (Stage 5):** danh sách sự kiện quanh ngày bắt đầu (ví dụ chuyển khóa Enigma hải quân, các đoàn tàu lớn, vùng mìn Bắc Hải) tìm từ tài liệu lịch sử công khai; mỗi mục ghi nguồn, và người vận hành duyệt trước khi nạp.
- **Giao diện:** Manual có mục "dòng thời gian" liệt kê sự kiện đã xảy ra đến thời điểm hiện tại, mỗi mục gắn nhãn thật/hư cấu (R5.5).

## 5e. Tạm dừng đếm ngược (R7)

Mặc định `modules.timer = false` cho ván mới (ở menu Endless và New Game), ô đếm ngược ẩn; mã mô-đun và luật `timeout` giữ nguyên để bật lại. Ván cũ đã lưu giữ nguyên tùy chọn của nó, nên replay không đổi.

## 6. Kiểm thử và bằng chứng

- vitest: `chart-tools` (đo, bước compa, làm tròn), phân tích và kiểm tra tệp bản đồ (băm, phạm vi), `fix` của sim (kiểm tra phạm vi, tất định), replay bit-exact với `world: "ww2"`.
- Chạy thật trong trình duyệt: mở Dashboard, đo bằng thước và compa, định vị tại một mốc, tàu rời cảng; ảnh chụp EN và VI.
- `tsc --noEmit`, `vitest run` (radio-ui và sim-core), `scripts/check-repo.ps1` xanh.
