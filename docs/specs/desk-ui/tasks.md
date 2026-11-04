# Desk UI — Tasks

Trạng thái: **ĐÃ DUYỆT 2026-11-04**. `R#` là yêu cầu trong `requirements.md`. Mỗi nhiệm vụ nhỏ, kiểm chứng được. Commit chỉ khi người dùng cho phép; không push/tag/publish khi chưa được duyệt.

## Stage 0 — Duyệt spec
- [x] **S0.0** Quyết định §13 (khóa ngày, mặc định, font, tên điểm) đã trả lời.
- [x] **S0.1** Người dùng duyệt ba file spec (2026-11-04).
- **Cổng duyệt:** chưa duyệt thì không viết code.

## G1 — Bàn làm việc chơi được (chỉ trình bày, sim-core không đổi)

### Stage 1 — Khung và lát cắt hình ảnh (chờ duyệt hình)
- [x] **T1.1** `src/i18n/` (`en`, `vi`, `t()`), test đủ khóa; chọn ngôn ngữ trong Settings; thêm subset font tiếng Việt (hash + OFL). (R11)
  - Silkscreen **không có** subset tiếng Việt (@fontsource/silkscreen@5.3.0 chỉ có latin, latin-ext). Thêm `vt323-vietnamese-400-normal.woff2` từ @fontsource/vt323@5.3.0 (sha256 84b335a5…, cùng OFL). Desk ở `vi` dùng VT323 cho nhãn; các điểm mã tiếng Việt của Silkscreen mượn glyph VT323. Menu chính mới có mục chọn ngôn ngữ, chưa dịch toàn bộ.
- [x] **T1.2** `src/desk/` mount theo `?ui=desk`; khung 640×360 scale nguyên; cutaway P5 tái dùng. (R1, R9.1)
  - Dưới 1280×720 hiện thông báo kèm liên kết sang phòng điện đài. `?lang=en|vi` ghi đè Settings. Settings có thêm `ui: "desk"`, `lang`.
- [x] **T1.3** Art lát cắt: mặt bàn, cột trái, bảng điều khiển, Teletyper, Echo Stamper, một tờ Input hai mặt. (R1.2)
  - `tools/art/desk.ts`: 11 sprite TEMPORARY (desk-bg, desk-door, desk-controls, desk-tty, desk-tty-lamp, desk-stamper, desk-st-switch, desk-st-lamp, desk-machine-tab, paper-input 2 mặt, desk-mission). Tờ Input mặt trước đọc tin hiện tại từ store (`watch.copy(tokens)`), nút lật là trạng thái trình bày.
- [x] **T1.4** Ảnh chụp lát cắt; so với tham chiếu; ghi `unverified` cho thẩm mỹ.
  - `evidence/stage1-*.png` (en/vi, 1280/1920, mặt sau, cửa sổ 1024). Thẩm mỹ so với tham chiếu: `unverified`, chờ người dùng.
- **Cổng duyệt:** người dùng xem lát cắt trước khi nhân rộng.

### Stage 2 — Giấy và Teletyper
- [x] **T2.1** Mô hình giấy + test: lật, kéo thả, đường thay thế bàn phím, xếp chồng, `desk.v1` có validate. (R2)
  - `src/desk/papers.ts` + `sheets.ts`. Chuột: kéo (giấy luôn chừa 24 px trên bàn để nhặt lại). Bàn phím: Tab tới tờ, Enter/Space nhấc, mũi tên đi 4 px (Shift 16), Enter đặt, Esc trả về; phím chữ vẫn gõ copy. Tờ mới xếp so le 8 px và nằm trên cùng. `uboat-radio.desk.v1` lưu vị trí/mặt/thứ tự theo seed, validate từng mục. Trạng thái kẹp/giao/hủy để Stage 3.
- [x] **T2.2** Teletyper: đèn, in dần `watch.copy(tokens)` theo nhịp Morse, nút xin lặp, silent rebuild. (R3)
  - `src/desk/printer.ts`: mỗi chữ in khi phần token của nó kết thúc, trên tổng thời lượng `planMorse(...).endSec` của attempt (cùng kế hoạch với âm thanh, không phụ thuộc âm thanh có bật hay không). Đèn nháy khi đang in. Repeat gọi `actions.repeat()`; mỗi attempt một tờ Input riêng, tờ cũ giữ nguyên. Tờ đã có lúc mount (khôi phục) in sẵn đủ.
- [x] **T2.3** Tờ Output: bản rõ theo nhóm, đánh dấu nhóm hỏng. (R4.2)
  - Tờ Output xuất hiện khi bắt đầu gõ copy: trước khi giải hiện copy đang gõ, sau Enter hiện bản rõ theo nhóm, nhóm hỏng viền đỏ nét đứt, dòng "Nhóm hỏng: n". Mặt sau có ô dấu đỏ. Gõ vẫn qua keymap P5 (máy mã ở T3.1).
  - Evidence: `evidence/stage2-*.png`.

### Stage 3 — Máy, đóng dấu, giao
- [x] **T3.1** Máy Enigma G1: gõ phím ghi copy, lampboard, kéo ra/vào. (R4.1)
  - Dùng lại nguyên `scene/machine.ts` của P5, dịch sang trái 208 px để trượt phủ phần phải mặt bàn; nút Kéo ra/Đẩy vào. Phím vật lý vẫn gõ copy khi máy đẩy vào. Đèn lampboard chạy theo bản rõ sau mỗi lần giải (Reveal như P5). Bấm một tờ Input/Output sẽ chọn bức điện và attempt đó để gõ/giải.
- [x] **T3.2** Echo Stamper: công tắc, đèn, tay đóng → đúng một `resolve`; dựng lại dấu từ `MSG_RESOLVED`; test. (R6.1–R6.3)
  - `src/desk/echo.ts`: mỗi bức điện gửi `resolve` tối đa một lần (bấm lại báo "mực không xóa được"; bị sim từ chối thì không có dấu và bấm lại được). Đèn READY sáng khi tờ đang chọn là Input chưa quyết, mặt sau lên. Dấu TRUE/FALSE ECHO vẽ từ `rx.resolved` (dựng lại từ log), không lưu trong `desk.v1`. Edge: bấm hai lần, save chỉ có 1 lệnh resolve.
- [x] **T3.3** Dấu thường hai màu, bút ký, ghim, giao cho người ở cửa, thùng rác + luật. (R6.4–R6.6)
  - Ngăn kéo ở mép trái mặt bàn: dấu xanh, dấu đỏ, bút, ghim (cầm dụng cụ rồi bấm tờ giấy; Esc để cất). Dấu và chữ ký chỉ ở mặt sau, hai ô dấu, mực không xóa. Ghim gộp thành xấp, kéo xấp đi cùng nhau. Giao: thả xấp vào cửa hoặc nút Giao; cần tờ Input đã có dấu Echo và một bức điện mỗi xấp; vi phạm khác chỉ được liệt kê (G1 chưa phạt, phạt ở G3). Luật G1 (`src/desk/rules.ts`): Input = Echo + chữ ký, không dấu thường; Output = một dấu đỏ. Thùng rác từ chối mọi giấy nhiệm vụ. Người ở cửa và phản ứng ở T4.1.
- [x] **T3.4** Mission tự tick. (R7)
  - 7 bước cho bức điện đang chọn: in xong Input, giải mã, dấu Echo, dấu đỏ Output, ký Input, ghim Input với Output, giao. Tick từ trạng thái thật, không tick tay. Bước "đặt máy" ở G2, "soát" (challenge/check) ở T4.2.
  - Evidence: `evidence/stage3-*.png`.

### Stage 4 — Người, thoại, tàu, tài liệu
- [x] **T4.1** Chân dung người ra vào + Transcript + bảng thoại `en`/`vi` theo sự kiện. (R8)
  - 5 thủy thủ (Brandt · Thuyền trưởng, Keller · Sĩ quan phó, Vogt · Máy trưởng, Lorenz · Lính thủy âm, Hahn · Liên lạc viên): `crewMember()` mới trong `tools/art/portrait.ts` (pixel của operator không đổi) và đổi màu theo người. Người chơi là "Bạn · Điện báo viên" (không tên riêng). `src/desk/dialogue.ts`: thoại en/vi cho mở ca, tín hiệu đầu, giao giấy, chấp nhận/từ chối, auth đúng/sai, HF/DF, bom chìm, báo động; chọn bằng RNG thẩm mỹ. Không nói đúng/sai của quyết định (D4). Phím bất kỳ: câu tiếp; giữ Space: bỏ qua cảnh; phím không lọt vào bản chép. Khôi phục không phát lại thoại cũ.
- [x] **T4.2** Bảng điều khiển tàu; ngăn kéo sonar/auth; khẩn cấp. (R9.2–R9.3)
  - Cần gạt 3 nấc (`setMode`), − / + tốc độ (`steerSpeed`), im lặng (`toggleSilence`), báo cáo 10 s (`report`), đọc tốc độ/hướng/giờ phát, đèn ăng-ten; phím mũi tên vẫn lái như P5. Nút Auth/Sonar/Nhật ký ở bảng trên mở ngăn kéo của P5; bảng khẩn cấp dùng của P5 (cả hai không sửa).
- [x] **T4.3** Daily Orders tĩnh và Manual (văn bản mới, hai ngôn ngữ). (R5.1, R5.3)
  - `src/desk/docs.ts`. Daily Orders 5 trang: nhiệm vụ xác minh, luật đóng dấu, đài đã biết (từ `worldCtx()`: callsign + fist), tin tức (3 tin chọn bằng RNG thẩm mỹ), hết lệnh. Manual 7 trang có mục lục. Lấy ra/cất vào từ kệ dưới của ngăn kéo; lật trang ◀ ▶; vị trí và chỗ cất lưu trong `desk.v1`. Không đóng dấu, ký, ghim, giao hay vứt được.
  - Evidence: `evidence/stage4-*.png`.

### Stage 5 — Kiểm chứng G1
- [x] **T5.1** `tsc`, vitest cả hai gói, invariants, `git diff packages/sim-core` rỗng, `check-repo`.
- [x] **T5.2** Chơi trọn ca `?ui=desk` qua Edge headless; reload; `en`/`vi`; ảnh chụp; console sạch.
  - Đã chạy (en, seed 12, speed 60, URL mặc định không có `?ui`): vào thẳng Desk, xử lý bức #1 tới dấu TRUE ECHO, reload giữa ca (T 13:11, dấu còn), tới T 30:00 hiện bảng tổng kết "1 of 1 correct", console sạch. Lượt `vi` (seed 12, speed 60) chạy tới T 30:00, reload giữa ca, console sạch (Playwright/Chromium trên cloud); `?ui=p5` và `?ui=classic` vẫn nạp, console sạch. Evidence: `evidence/stage5-vi-*.png`.
- [x] **T5.4** Đổi mặc định sang Desk, P5 thành tùy chọn Settings. (D7)
  - `defaultSettings().ui = "desk"`; người đã lưu `p5` vẫn giữ P5; `?ui=p5` và `?ui=classic` vẫn ưu tiên.
- [x] **T5.3** Cập nhật `docs/architecture.md`, task record, báo cáo.

## G2 — Máy thật, khóa ngày, điểm
- [x] **T6.1** Máy giả lập bằng `Enigma` + `dayEnigma`; công tắc nguồn; nắp rotor; lăn chuột đặt 4 vòng; odometer + double-step; đồng bộ lại theo nhóm. Property test so với `decipherCopy`. (R4.3–R4.7)
  - `src/desk/machine.ts` (thuần): `replayCopy` dựng cửa sổ/đèn từ (khóa ngày, 4 chữ người chơi đặt, bản chép) theo đúng luật `decipherCopy` (đặt lại ở đầu mỗi nhóm, nhóm ngắn/dài chỉ hỏng chính nó); `DeskMachine`: nguồn, nắp (chỉ mở khi tắt, không bật khi nắp mở), lăn chuột/mũi tên/gõ chữ đặt 4 vòng. Odometer + double-step + Greek không bước do `Enigma` của sim-core. Controller có `hooks.typingGate` (máy tắt thì phím và Enter bị chặn, báo bằng toast) và `hooks.decodeSetting` (decode dùng vị trí người chơi đặt qua `Watch.decipher`, không thêm lệnh sim). Property test 300 ca so với `decipherCopy` (`test/desk-machine.test.ts`). Máy trở về vị trí đã đặt khi tắt (đơn giản hóa có chủ đích).
- [x] **T6.2** Daily Orders in khóa ngày (Obscura Setup). (R5.2)
  - Trang "Obscura Setup" (phản xạ, rotor, vòng, dây cắm từ `dayEnigma(seed, 1)`) trong Daily Orders; khóa không hiện ở chỗ nào khác (R4.7). Manual mục 3 viết lại cho G2.
- [x] **T6.3** Điểm +1/−1, màu xanh/đỏ, thưởng hoàn thành, lưu `desk.v1`. (R10.1, R10.2, R10.4)
  - `src/desk/ration.ts`: +1/−1 mỗi phím so với tờ Input đã in (mỗi vị trí chỉ tính một lần, backspace + gõ lại không cày điểm), thưởng một lần cho mỗi bước nhiệm vụ mỗi bức điện + thưởng hoàn thành; chữ xanh/đỏ từng ký tự trên Output; lưu `desk.v1` (`mach`, `ration`, validate từng trường, bản cũ vẫn nạp).
- [x] **T6.4** Đồng hồ 2 phút tùy chọn (chỉ báo). (R10.3)
  - Settings `timer` (mặc định tắt): chỉ báo 2 phút thời gian thực cho bức điện đang chọn, dừng khi pause/đã giao, toast một lần khi hết giờ; chưa phạt (G3).
- [x] **T6.5** Kiểm chứng G2 như T5.
  - Playwright/Chromium: tắt máy gõ không ghi; nắp mở không bật được; đặt YAKM bằng gõ chữ, lăn chuột, mũi tên; bật máy, gõ, đèn/cửa sổ chạy; Ration +1/−1 xanh/đỏ; Enter ra bản rõ đúng (seed 12) và sai khi đặt sai; reload giữ máy; timer; trang Obscura (vi); console sạch. Evidence: `evidence/g2-*.png`.

## G3 — Cần spec sim-core riêng (spec DRAFT: `docs/specs/desk-ui-g3/`, chờ duyệt, chưa sửa sim-core)
- Citation và hậu quả (3 lần: nguy hiểm, lộ vị trí; 5 lần: bị xử tử); lỗi đóng sai màu, vứt sai giấy, hết giờ thành lệnh có log.
- Tell dạng giấy tờ: dấu xác thực in sẵn (không có / thật / giả y hệt), chữ ký so mẫu, người gửi được duyệt, Sender ID mã hóa; giữ bất biến "tin giả luôn có ít nhất một tell".
- Plugboard cắm dây; lưu trữ hoặc hủy giấy theo lệnh; tin tức dùng để soát nội dung.

## G4 — Sau G3
- Endless (mô-đun + độ khó), mã hóa và gửi tin, Private Message, Roster.

## Thứ tự
S0 → (duyệt) → Stage 1 → (duyệt hình) → Stage 2 → 3 → 4 → 5 → G2 → spec G3.
