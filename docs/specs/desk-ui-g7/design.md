# Desk UI G7 — Design

Trạng thái: **CHỜ DUYỆT**. `R#` là yêu cầu trong `requirements.md`. Mọi tọa độ là px logic trên khung 640×360 (như `desk/index.ts`).

## 1. Hiện trạng và thay đổi

| Hiện nay | G7 |
|---|---|
| Một ngăn kéo `tray` (ấn xanh/đỏ, bút, kẹp, Orders, Manual) ở mép trái bàn, thùng rác riêng | Tủ kéo ba ngăn (rác, kẹp + encode, slip + decode), tủ Orders riêng, ấn + mực + bút ngoài tủ |
| Chọn công cụ `blue`/`red` rồi đóng nhiều lần | Một cây ấn, chấm mực, đóng một dấu mỗi lần |
| Teletyper, máy Echo cố định; Enigma có PULL OUT/PUSH IN | Ba máy có tay nắm, cất hoặc kéo ra |
| Giấy Output/slip/encode tự hiện trên mặt bàn | Nằm sẵn trong ngăn; lấy ra khi cần |

## 2. Bố cục (px logic)

Giữ nguyên các trạm ngoài vùng sửa: cửa `{8,104,132,132}`, bảng điều khiển `{8,240,132,112}`, mặt bàn `{144,104,280,248}`, Teletyper `{428,104,204,132}`, máy Echo `{428,240,204,60}`, tab Enigma `{428,304,204,48}`.

| Phần | Đóng | Mở / kéo ra |
|---|---|---|
| Tủ kéo trái | tay nắm dọc `{144,120,8,70}` ở mép trái bàn | panel `{144,104,112,248}` trượt sang phải, ba ngăn mỗi ngăn cao ~80 |
| Tủ Orders | tay nắm ngang ở vùng trái dưới đã giải phóng `{14,326,72,20}` (sau khi bảng điều khiển dời đi, R11) | khay `{8,240,132,112}`; Orders/Manual lấy ra mặt bàn |
| Cây ấn + hai ô mực + bút | cố định gần mép dưới bàn `{300,324,120,24}` | không có trạng thái mở |
| Tay nắm máy phải | ba tay nắm ở mép bàn phía phải `{420,y,8,40}` (y = 112, 244, 308) | máy trượt sang trái tới `x = 428 - rộng của máy` |

Thứ tự ưu tiên khi chồng nhau (cao hơn nằm trên): tay nắm, cây ấn/mực, tủ kéo trái, máy phải kéo ra, giấy trên bàn. Phần phác bố cục nằm ở ảnh người vận hành duyệt (tin nhắn 2026-11-05); vị trí chính xác chốt khi có ảnh chụp thật ở T1.

## 3. Mô hình trạng thái (R1, R6, R7)

Thêm `desk/cabinet.ts` (thuần, không DOM, không sim), kiểm thử bằng vitest:

```ts
type Compartment = "trash" | "mid" | "low";            // ngăn trên, giữa, dưới của tủ kéo trái
type Machine = "echo" | "tty" | "enigma";
interface CabinetState { readonly open: boolean; readonly machines: Readonly<Record<Machine, boolean>> /* true = kéo ra */; readonly orders: boolean }
```

- `Paper.place` mở rộng: `"desk" | "handed" | "drawer" | \`cab:${Compartment}\``. Ngăn nhận loại nào: `mid` ← `encode`; `low` ← `output`, `slip`; `trash` nhận mọi loại trừ `input` (R2.2, R2.3); bỏ rác xóa hẳn tờ (không `stow`). Hàm `compartmentFor(kind): Compartment | null` quyết định nơi tờ được cất; `acceptsCab(kind, c)` kiểm tra thả.
- `PaperModel.stow(id, c)` và `PaperModel.pull(id, x, y)` đổi `place` và đặt lại vị trí; không đổi `rxId`, dấu, chữ ký, kẹp.
- Một tờ đang kẹp không cất riêng được: cất cả nhóm hoặc từ chối (giữ luật "một nhóm một tin").
- Tờ tham chiếu `orders`, `manual` dùng `place: "drawer"` như hiện nay nhưng thuộc tủ Orders (R3).

## 4. Ấn và mực (R4)

Máy trạng thái trong `desk/ink.ts` (thuần). Cây ấn và kẹp là **công cụ cầm bằng chuột** (một lớp `held` chung): cầm thì công cụ đi theo con trỏ, trả về thì về chỗ đặt.

```
held: null | "stamp" | "clip" | "pen"             // đang cầm công cụ nào (tối đa một)
stamp: { ink: null | "blue" | "red" }              // chỉ có ý nghĩa khi held == "stamp"
cầm ấn (bấm chỗ đặt)     → held = "stamp"
bấm ô mực c khi cầm ấn   → ink = c
bấm mặt sau của tờ        → nếu ink != null: PaperModel.stamp(id, ink) ok → ink = null
                            nếu ink == null: từ chối "chấm mực trước"
bấm chỗ đặt / Esc         → held = null (ink = null)
```

- Tái dùng `PaperModel.stamp(id, color)`, nên luật mặt sau, đủ ô, tờ tham chiếu không đổi. `index.ts` `applyTool` đổi nhánh `blue`/`red` thành nhánh `stamp`; nhánh `pen` giữ nguyên; nhánh `clip` theo mục 4b.
- Con trỏ đồ họa đi theo chuột là một phần tử DOM `pointer-events: none` đặt tại vị trí con trỏ (làm tròn theo `px()` của cảnh); trên màn hình cảm ứng thì "chạm cây ấn, chạm đích" thay cho kéo.
- `actions.paperwork(rxId, { act: "stamp", sheet, color, stampsBefore })` vẫn gọi sau mỗi dấu thành công: sim thấy cùng lệnh như bây giờ (D1′).
- Con trỏ đổi theo trạng thái (`data-tool`): ấn khô, ấn xanh, ấn đỏ. Bàn phím: `S` chọn ấn, `1`/`2` chấm xanh/đỏ, Enter đóng lên tờ đang chọn; tên phím cuối cùng chốt ở T3 theo `input/keymap.ts` để không đụng phím có sẵn.
- Test: không đóng được khi chưa có mực; hai lần đóng liên tiếp cần hai lần chấm; mực không lưu qua tải lại; không đóng lên mặt trước, tờ tham chiếu.

## 4b. Kẹp cầm bằng chuột (R5)

- Kẹp nằm ở ngăn giữa (không nằm trên bàn). Lấy ra: `held = "clip"`, kẹp đi theo con trỏ như cây ấn.
- Bấm một tờ khi cầm kẹp: gắn kẹp vào tờ đó. Mô hình: `Paper.clip` vẫn là số nhóm; một tờ vừa gắn kẹp nhận một số nhóm riêng (`PaperModel.attachClip(id)`), nhóm một tờ được phép tồn tại khi có kẹp. `unclip` của tờ cuối trong nhóm vẫn đưa nhóm về `null` như hiện nay.
- Kéo tờ có kẹp thả lên Input của cùng tin: `PaperModel.clipTo(id, inputId)` hiện có (một tin một nhóm, tờ tham chiếu không kẹp); thả lên Input của tin khác thì `otherMessage`.
- Trả kẹp: bấm ngăn giữa hoặc Esc; kẹp đã gắn lên tờ thì không trả (kẹp ở lại trên tờ).
- Test: kẹp vào tờ tham chiếu bị từ chối; kẹp hai tin khác nhau bị từ chối; gỡ kẹp; kẹp đi theo nhóm khi giao nộp.

## 4c. Giao nộp thiếu dấu Echo (R10)

`handOver(p, from)` trong `index.ts`: bỏ nhánh từ chối `noEcho` của `checkHandOver` (đổi `HandOverRefusal`: không còn `"noEcho"`). Luồng mới:

1. `checkHandOver` vẫn từ chối `noInput`, `mixed`, `mission`; thiếu Echo thì trả `ok: true` với cờ `echo: false`.
2. `actions.paperwork(rxId, { act: "handover", echo: <đã đóng Echo?>, ... })` như hiện nay: sim tự trích `badHandover` khi `echo` là `false` (không đổi sim, đã có trong `judge`).
3. Cảnh cáo `badHandover` do sim ghi chính là "một lần sai trong năm lần bị hành quyết" (người vận hành chốt); desk **không trừ thêm Ration** cho lỗi này để khỏi phạt hai lần.
4. Desk hiện "THẤT BẠI" trên Mission của tin đó, `awardSteps` không trả thêm, toast và âm báo kèm số cảnh cáo hiện có (đọc từ trạng thái sim hiện có, ví dụ "2/5"). Trạng thái `failed` suy ra lại được từ log (tin đã `handed` và Input không có dấu Echo) nên không phải lưu riêng, giữ D9.
5. Test: giao nộp thiếu Echo → không bị chặn, sim ghi đúng một cảnh cáo `badHandover`, Mission hiện thất bại, không trừ Ration thêm; có Echo → như G3; cảnh cáo thứ năm vẫn dẫn tới kết thúc như hiện nay.

## 5. Ba máy cất được (R6)

- Mỗi máy là một nhóm DOM hiện có (`tty`, `stamper`, `machine`) bọc thêm lớp trượt: khi cất, lớp dịch sang phải ra ngoài khung và chỉ để tay nắm; khi kéo ra, dịch sang trái. Đây là dịch chuyển `transform`/vị trí `place()`, không thay đổi nội dung máy.
- Enigma đã có cơ chế trượt phủ mặt bàn (`MACHINE_SHIFT`); G7 chỉ thay nút PULL OUT/PUSH IN bằng tay nắm chung và giữ `DeskMachine`/`mountMachine`.
- Khi cất, lớp bên trong nhận `inert` và các phần tử không còn tiêu điểm; tay nắm giữ `aria-expanded` và `aria-controls`.
- Echo cất mà người chơi bấm nút giao hoặc đóng dấu Echo: nhắc "kéo máy Echo ra". Teletyper vẫn in (state không đổi), nên không có tin nào bị mất (R6.3).

## 6. Giấy trong ngăn (R8)

- `syncPapers` vẫn tạo Output/slip/encode đúng lúc hiện nay, nhưng gọi `model.ensure(...)` rồi `model.stow(id, compartmentFor(kind))` thay vì để trên bàn. Người chơi kéo ra thì `pull`.
- Gõ bản sao khi chưa có Output trên bàn (R8.3): chặn bước đặt Output tự động bằng lời nhắc; **không** mất ký tự trong `store`, vì bản sao nằm trong store chứ không nằm trên giấy.
- Giao nộp: bó chỉ gồm tờ trên bàn (`place === "desk"`); tờ còn trong ngăn không đi theo. `checkHandOver` không đổi, nhưng thiếu Output vì chưa lấy ra thì kết quả vẫn là `noOutput` (đã có).

## 7. Lưu trữ (R7)

`desk.v1` thêm trường tùy chọn, đọc qua bộ lọc (`parseLayout`, `parseExtra`):

```json
{ "cab": { "open": false, "orders": false, "machines": { "echo": true, "tty": true, "enigma": false } },
  "papers": [{ "id": "out:1:0", "place": "cab:low", "...": "..." }] }
```

- `place` chấp nhận thêm `cab:trash|mid|low` cho đúng loại tờ (kiểm tra bằng `acceptsCab`); giá trị sai thì bỏ riêng tờ đó.
- Tờ `handed` và luật rơi tin của G4 giữ nguyên.
- Không đổi khóa (`uboat-radio.desk.v1`); bản cũ nạp được, bản mới đọc bản cũ bằng mặc định (R7.2).

## 7b. Nghệ thuật và i18n (R9)

Sprite mới (TEMPORARY, `tools/art/desk.ts`): `desk-cabinet` (panel ba ngăn + tay nắm), `desk-orders-drawer`, `desk-stamp` (cây ấn, hai ô mực, bút), `desk-handle-r` (tay nắm máy). Tham khảo hình dạng từ các ảnh người vận hành đã gửi, không dùng pixel của game khác. `manifest.json` do `node tools/art/generate.ts` sinh; test `assets` kiểm kích thước. Chuỗi mới ở cả `en.ts` và `vi.ts` (`desk.cab.*`, `desk.ink.*`, `desk.machine.*`).

## 8. Câu hỏi mở — người vận hành đã chốt 2026-11-05

1. **Gõ bản sao khi chưa lấy giấy giải mã (R8.3):** đồng ý đề xuất (lời nhắc, không mất ký tự).
2. **Thùng rác (R2):** nhận mọi thứ trừ Input. *Giả định cần xác nhận khi duyệt:* giấy tham chiếu (Mission, Orders, Manual) không bỏ rác được vì là đồ đạc của bàn; Output bỏ rác không gọi `bin` (sim không biết), nên chỉ để lại hệ quả ở bàn.
3. **Tủ Orders (R3, R11):** dời bảng điều khiển trái dưới sang một màn hình Dashboard mới (spec riêng `desk-ui-g8/`); tủ Orders chiếm chỗ đó. Dashboard đòi dữ liệu bản đồ thế giới mới nên có cổng sim-core riêng.
4. **Phím tắt:** bỏ ý `S`, `1`, `2` làm cách chính; cây ấn cầm bằng chuột (R4.2). Giữ phím thay thế vì trợ năng (R4.7); tên phím chốt ở T3.3.
5. **Máy Echo cất:** không chặn giao nộp; thiếu dấu Echo thì nhiệm vụ thất bại ngay, **tính là một lần sai trong năm lần dẫn tới bị hành quyết** (R10, mục 4c) — chính là cảnh cáo `badHandover` đã có trong sim, nên không cần đổi sim.
6. **Kẹp (R5, mục 4b):** không đặt lên bàn; cầm bằng chuột như cây ấn; kẹp vào giấy rồi kéo giấy đó thả lên Input để liên kết.

## 9. Kiểm thử và bằng chứng

- vitest: `cabinet` (nhận loại nào, thả sai ngăn), `ink` (một lần chấm một dấu), `papers` (`place` mới, kẹp nhóm, lưu và nạp, id/ngăn giả bị loại), `desk-rules` (giao nộp chỉ tính tờ trên bàn), tiêu chuẩn i18n (cả hai ngôn ngữ).
- Chạy thật trong trình duyệt: mở/đóng từng tủ và từng máy, kéo giấy vào ra ngăn, chấm mực và đóng dấu, tải lại giữ nguyên chỗ; ảnh chụp 1280px (EN và VI), 1920px, 1024px.
- `tsc --noEmit`, `vitest run` (radio-ui và sim-core), `scripts/check-repo.ps1` xanh.
