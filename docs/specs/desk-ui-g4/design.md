# Desk UI G4 — Design

Trạng thái: **ĐÃ DUYỆT 2026-11-05**. Đi kèm `requirements.md`.

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

## 8. Quyết định của người vận hành (2026-11-05)

1. **Độ khó**: chấp nhận ba mức, gap đầu 150 / 100 / 60 s, tỷ lệ giả đầu 0.2 / 0.35 / 0.5, hạn giờ 180 / 120 / 90 s.
2. **Mô-đun tách rời độ khó**: không có preset độ khó nào tự tắt mô-đun; mặc định bật cả sáu ở mọi độ khó.
3. **Kết thúc Endless**: chỉ khi chìm hoặc người chơi chủ động dừng. Hệ quả đã ghi ở R1.2: không xử tử ở Endless (từ cảnh cáo thứ 5 giữ mức `severe`, mỗi cảnh cáo mới có thêm một đợt tấn công); ca trực thường giữ nguyên xử tử ở lần 5.
4. **Loại tin cần trả lời**: chỉ hai loại (báo nhận lệnh, báo vị trí); chưa thêm.
5. **Gửi sai**: bị cảnh cáo kiểu G3 (lỗi `badSend`).
6. **Roster vắng mặt**: giao cho tôi quyết: làm. Khi `BOAT_DAMAGED` làm hull ≤ 50 lần đầu, một thành viên (không phải Liên lạc viên, là người chơi) vắng mặt cho tới hết ca; người kế nhiệm theo thứ tự chức vụ.
7. **Tần suất PM**: giãn cách ≥ 240 s sim-time, trần 6 tin mỗi 30 phút.
8. **Tên thủy thủ**: bảng 40 tên bịa do tôi soạn.
9. **Save v3**: nạp được v2.
10. **UI**: người vận hành cho phép tôi tự xử lý phần UI mới trong hệ thiết kế hiện có (màn cấu hình Endless, giấy Outgoing/Private/Roster bằng DOM và sprite `TEMPORARY`).
