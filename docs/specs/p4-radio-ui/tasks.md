# P4 Radio Room UI — Tasks

Trạng thái: **DRAFT, chờ duyệt**. Mỗi nhiệm vụ nhỏ, kiểm chứng được; làm theo thứ tự. `R#` là yêu cầu trong `requirements.md`.

- [ ] **T1. Dựng gói `packages/radio-ui`** — `package.json` (workspace dep `@uboat/sim-core`, devDep `vite@8.3.5`), `tsconfig` strict, `index.html`, `main.ts` trống chạy được `vite`. Cần bạn duyệt dependency trước. (R9.4)
  - Kiểm: `tsc` pass, dev server lên, trang trống không lỗi console.
- [ ] **T2. Vòng lặp sim cố định** — `sim/loop.ts` + test: bước 1 s, giới hạn bù, tạm dừng, tự pause khi tab ẩn. (R7.1, R7.5)
- [ ] **T3. Session + lưu/khôi phục** — `sim/session.ts`: tạo `Watch`, ghi `{seed, commandLog}`, khôi phục bằng `replay`. Test: lưu → tải = log sự kiện giống hệt. (R7.4)
- [ ] **T4. Store từ SimEvent** — `store.ts` + test reducer cho `MSG_RX`, `SONAR_CONTACT`, `TX`, `CHALLENGE_SENT`, `CHALLENGE_REPLY`, `AUTH_RESULT`, `MSG_RESOLVED`, `BRIDGE_ALERT`, `WATCH_END`. Không trường nào từ `truthOf`. (R7.2, R7.3)
- [ ] **T5. Bảng phím** — `input/keymap.ts` + test: chỉ A–Z, 0–9 và phím điều khiển khai báo; dùng `event.code`; chặn mặc định. (R2.1)
- [ ] **T6. Bố cục và style** — `style.css` token màu, lưới bố cục mục 4, thanh trạng thái; chế độ khẩn cấp (khung). (R6.3, R9.2)
- [ ] **T7. Âm thanh Morse** — `audio/morse.ts`: `schedule()` → oscillator theo đồng hồ audio, RNG thẩm mỹ riêng, phát lại không sinh nhiễu mới, lời nhắc bật âm. (R1.1–R1.4)
  - Kiểm: test đơn vị cho việc dựng lịch; nghe thử trong trình duyệt (**ghi rõ nếu chưa nghe**).
- [ ] **T8. Bàn thu + thanh sóng + copy** — `panels/receiver.ts`, `panels/copy.ts`: chép theo group, Space/Backspace/`?`, copy theo `rxId`+`attempt`. (R1.5, R2)
- [ ] **T9. Bàn Enigma** — `panels/enigma.ts`: gọi `decipher`, hiện bản rõ theo group, đánh dấu nhóm hỏng. (R3)
- [ ] **T10. Bảng auth + header + tells** — `panels/authTable.ts`: bảng 26×26, con trỏ, kết quả `checkMatches` (không nêu nguyên nhân), header và `assess`. (R4.1–R4.3)
- [ ] **T11. Bàn phát và challenge** — `panels/transmit.ts`: repeat, challenge, check, accept/reject, report, silence; hiện lý do khi `dispatch` trả `false`; đồng hồ giờ phát và đèn ăng-ten lộ; báo `HFDF_FIX`. (R4.4–R4.5, R5)
- [ ] **T12. Sonar và hydrophone** — `panels/sonar.ts`, `audio/hydrophone.ts`: bearing nhiễu, blade rate, escort/slow, không khoảng cách; nghe chân vịt. (R6.1–R6.2)
- [ ] **T13. Cảnh báo Bridge và lệnh thuyền** — chớp cảnh báo, chế độ khẩn cấp, lệnh lặn/tốc độ/hướng, hiện mode/hull/speed. (R6.3–R6.4)
- [ ] **T14. Nhật ký sự kiện + tổng kết** — `panels/log.ts`, `panels/summary.ts`: log từ bus, tổng kết `WATCH_END`, chơi lại cùng/seed mới. (R8)
- [ ] **T15. Kiểm tra bất biến** — grep UI không có `truthOf`; kiểm import chỉ qua barrel; `tsc`, test sim-core + UI, `scripts/check-repo.ps1`. (R7.2)
- [ ] **T16. Chơi thử trong trình duyệt thật** — chơi trọn ca trực, chụp ảnh các trạng thái chính, kiểm console, ghi nhận vấn đề bố cục/âm thanh. Báo **chưa kiểm chứng** phần độ căng/độ vui nếu chưa có người chơi. (Nghiệm thu P4)
- [ ] **T17. Tài liệu và đóng task** — cập nhật `docs/architecture.md`, task record đầy đủ bằng chứng, commit/push khi bạn đồng ý.

## Thứ tự và phụ thuộc
T1 → (T2, T3, T4, T5 song song được) → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T17.

## Điểm cần bạn quyết trước khi làm
1. Duyệt `vite@8.3.5` làm devDependency.
2. Duyệt bố cục mục 4 của `design.md` (hoặc nêu chỗ cần đổi).
3. Mức hiện thông tin: giữ nguyên "không hiện hazard/Intel dạng số" hay muốn có chế độ debug.
