# Desk UI G4 — Design

Trạng thái: **DRAFT — CHƯA DUYỆT**. Đi kèm `requirements.md`.

## 1. Kiến trúc

```mermaid
flowchart LR
  MENU[menu: Endless + mô-đun + độ khó] -- WatchOptions --> SES[Session]
  SES --> W[Watch(seed, opts)]
  GEN[bộ phát tin endless: derive seed endless n] --> W
  DESK[desk: Outbox, Private, Roster] -- send / leave / paperwork --> ACT[Actions] --> W
  W -- MSG_RX / SEND_RESULT / PRIVATE_MSG / ROSTER_CHANGE --> BUS[EventBus] --> STORE --> DESK
  SAVE[(save v3: seed + opts + commandLog)] <--> SES
  HS[(điểm cao cục bộ)] <--> DESK
```

Nguyên tắc: **sim quyết định sự kiện và hậu quả**, desk giữ điểm, giấy và trình bày. Không đổi hành vi khi không có `opts` (D10).

## 2. Thay đổi sim-core (cần duyệt)

| Mục | Thay đổi | Ghi chú |
|---|---|---|
| Tùy chọn | `WatchOptions`, `ModuleSet`, `Difficulty`; `new Watch(seed, balance, opts?)` | mặc định = ca trực hiện tại |
| Dữ liệu | `balance.json` mục `endless` (độ khó, nhịp tăng) và `roster`/`pm` (tên, mẫu, giãn cách) | cân bằng ngoài code |
| `endless.ts` (mới) | bộ phát tin kế tiếp, độ tăng dần, tỷ lệ giả theo độ khó | `derive(seed, "endless", n)` |
| `watch.ts` | lệnh `send`, `leave`; mô-đun tắt = không phán xử; không kết thúc theo thời gian khi endless | replay từ log |
| `messages.ts` | nhận cờ mô-đun để chọn tell hợp lệ, giữ D8 | test bất biến mở rộng |
| `roster.ts` (mới) | `makeRoster(seed)`, vắng mặt, người kế nhiệm | không dùng tên game tham chiếu |
| `pm.ts` (mới) | chọn người gửi, `topic`, `tone`, giãn cách | chỉ dựa trên quan sát (D4) |
| `events.ts` | `SEND_RESULT`, `PRIVATE_MSG`, `ROSTER_CHANGE`; `WATCH_END.reason` thêm `"left"` | đổi hợp đồng sự kiện |
| `traffic.ts` | hàm thuần `encipherGroups(seed, day, indicator, plain, plugboard?)` để UI và sim dùng chung | tái dùng `Enigma` |
| `index.ts` | xuất qua barrel | D2 |

Không đổi: Enigma, auth, sonar, boat, detection (ngoài việc `send` cộng vào `transmit`), luật G3.

## 3. Endless

- **Nhịp tin**: khoảng cách giữa tin `n` và `n+1` = `gap0 * decay^n` kẹp ở `gapMin` (theo độ khó). Tỷ lệ tin giả = `pForged0 + step*n` kẹp ở `pForgedMax`. Hạn giờ (nếu `timer` bật) co dần tới `deadlineMin`.
- **Giới hạn tài nguyên**: số tin chưa xử lý tối đa `maxPending`; vượt thì tin cũ nhất tự "mất" (sự kiện `MSG_LOST`, không phạt thêm ngoài `timeout` nếu timer bật). Bảo vệ hiệu năng desk.
- **Kết thúc**: `sunk`, `executed`, hoặc `leave`. Không có `time`.
- **Điểm** nằm ở desk (R1.7): chuỗi đúng liên tiếp suy ra từ `MSG_RESOLVED.correct`.

## 4. Mô-đun

| Mô-đun | Sim | Desk |
|---|---|---|
| `timer` | bật = hạn giờ G3 | chỉ báo đếm ngược |
| `rotors` | tắt = giải mã dùng indicator thật | tự đặt cửa sổ, ẩn nắp rotor |
| `stamps` | tắt = không `wrongStamp`/`badHandover` | giao giấy không kiểm dấu |
| `signatures` | tắt = không sinh tell giấy, không `signature`/`mark`/`sender` | ẩn mặt sau tờ Input |
| `cables` | tắt = dùng plugboard của ngày | ẩn bảng cắm |
| `teletyper` | tắt = không in dần (chỉ trình bày) | Input hiện đủ ngay |

D8: khi `signatures` tắt, tell cổ điển vẫn đủ (bất biến sẵn có); test bất biến chạy trên mọi tổ hợp mô-đun và mọi độ khó.

## 5. Gửi tin

1. Desk: tờ *Outgoing*, người chơi gõ bản rõ lên máy (G2/G3), nhóm 4 chữ ghi lên tờ.
2. `send { rxId|null, indicator, groups }`: sim kiểm tra biên (A–Z, nhóm 4, độ dài ≤ `maxSendChars`, indicator 4 chữ), tính thời gian phát từ `encode(groups)` ở tốc độ phát, gọi `startTx` như `transmit`, và sau khi phát xong (theo sim-time) phát `SEND_RESULT`.
3. Kiểm tra: sim giải bằng khóa ngày và so với **bản rõ yêu cầu** của tin đang trả lời (sim biết, UI không biết). Kết quả chỉ nói OK hoặc "HQ không đọc được".
4. Indicator dùng lại → `Intel.indicator` (tăng Intel).
5. Giới hạn chống gian lận: client gửi bản mã nên sim kiểm tra thật (không phải sự thật do client báo); điểm Ration vẫn ở desk.

## 6. Private Message và Roster

- PM do sim phát theo luật đơn giản từ `data`: ví dụ "đã có ≥1 cảnh cáo" → `remind`, "đã có ≥2 hoặc timeout" → `threat` từ Thuyền trưởng/Sĩ quan phó; "phát quá lâu" → Liên lạc viên nhắc. Mỗi luật có giãn cách tối thiểu và trần.
- Văn bản PM nằm ở desk (`en`/`vi`), sim chỉ phát `topic` và `tone` (giữ sim sạch văn bản và replay đơn giản).
- Roster: sim sinh tên và chức vụ; desk thay `CREW` hardcode bằng Roster; `ROSTER_CHANGE` khi hư hỏng nặng.

## 7. Save, menu, điểm cao

- Save v3: `{ v: 3, seed, opts, untilTick, commands }`. Nạp v2 → `opts` mặc định. Từ chối `opts` sai. Test: replay bit-exact với opts; nạp v2; P5/classic không đổi.
- Menu: mục *Endless* mở màn cấu hình bằng thành phần radio/checkbox có sẵn (`menu/menu.ts`); cấu hình lần gần nhất lưu khóa riêng.
- Điểm cao: khóa localStorage riêng, validate từng trường, nhãn theo (độ khó, bộ mô-đun).

## 8. Câu hỏi mở (cần người vận hành quyết trước khi làm)

1. **Độ khó**: ba mức `easy` / `normal` / `hard`; đề xuất thông số: gap đầu 150 / 100 / 60 s, tỷ lệ giả đầu 0.2 / 0.35 / 0.5, hạn giờ 180 / 120 / 90 s. Chấp nhận?
2. **Mô-đun mặc định**: đề xuất tất cả bật ở `normal`; `easy` tắt `timer` và `cables`. Chấp nhận?
3. **Kết thúc Endless**: chỉ `sunk`/`executed`/`leave` (đề xuất), hay thêm giới hạn thời gian tùy chọn?
4. **Tin cần trả lời**: đề xuất 2 loại: báo nhận lệnh (nhắc lại mã lệnh) và báo vị trí (lưới 4 ký tự). Thêm loại nào?
5. **Phạt gửi sai**: đề xuất không cảnh cáo (chỉ mất cơ hội thưởng và tốn thời gian phát/HF-DF); hay gửi sai cũng là lỗi giấy tờ G3?
6. **Roster vắng mặt**: đề xuất tối đa một người vắng mặt mỗi ca khi `BOAT_DAMAGED` nặng; hay không làm ở G4?
7. **Tần suất PM**: đề xuất giãn cách ≥ 240 s sim-time, trần 6 tin mỗi 30 phút. Chấp nhận?
8. **Tên thủy thủ**: đề xuất bảng 40 tên bịa kiểu Đức hóa chung (không trùng tên game tham chiếu). Chấp nhận, hay bạn cung cấp danh sách?
9. **Save v3** theo đề xuất ở mục 7 (nạp được v2). Chấp nhận?
10. **UI mới**: màn cấu hình Endless và ba loại giấy mới (Outgoing, Private, Roster) mở rộng hệ thiết kế hiện có bằng DOM và sprite `TEMPORARY`; theo AGENTS §2.7 cần bạn xác nhận không phải "hướng UI mới" cần thiết kế riêng.
