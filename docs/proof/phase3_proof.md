# Bằng chứng Kiểm chứng Phase 3 (Ticket-03 - Test Contract v1.2)

* **Dự án:** Đảo Đèn Lồng (Lantern Island)
* **Tác giả:** Kim Đức Thắng (2A202603702)
* **Phiên bản Hợp đồng:** Test Contract v1.2
* **Tag nộp:** `phase-3`

---

## 1. Kết quả Bộ Kiểm thử Tự động (19/19 Tests Passed)

Toàn bộ 19 bài kiểm thử bao gồm cả các bài kiểm thử Phase 1, Phase 2 và 6 bài kiểm thử tính năng mới của Phase 3 đều đạt 100%:

```text
======================================================
🧪 CHẠY BỘ KIỂM THỬ TỰ ĐỘNG - TEST CONTRACT V1.0 - V1.2
======================================================

[TEST 1] Nhặt đom đóm (Mote pickup) theo kịch bản ... PASSED
[TEST 2] Nạp đom đóm vào đèn & thắp sáng đèn (Deposit & Lantern lit) ... PASSED
[TEST 3] Tỏa sáng xua Bóng Mực (Pulse stun & pushback) ... PASSED
[TEST 4] Tính tất định (Determinism: 2 lần chạy cùng seed ra output giống hệt) ... PASSED
[TEST 5] Xử lý file inputs sai định dạng trả về exit code 2 ... PASSED
[TEST 6] Bảo vệ trong Vùng An Toàn (Safe Zone quanh đèn đã thắp) ... PASSED
[TEST 7] Hỗ trợ cú pháp đối số dòng lệnh dạng --arg=value ... PASSED
[TEST 8] [Phase 2] Kỹ năng Lướt (Dash) ... PASSED
[TEST 9] [Phase 2] Nhặt Bùa Gió (Wind Charm) ... PASSED
[TEST 10] [Phase 2] Gió Lạc cướp đom đóm & Tỏa Sáng làm rơi lại đồ ... PASSED
[TEST 11] [Phase 2] Tạm dừng (Pause) & Tiếp tục (Resume) ... PASSED
[TEST 12] [Phase 2] Rơi khỏi đảo (Y < -10) ... PASSED
[TEST 13] [Phase 2] Hiệu năng Headless 21.600 tick (≤ 30 giây) ... (0.16s) PASSED
[TEST 14] [Phase 3] Tiêu hao nhiên liệu tự nhiên & Đèn tắt (Fuel decay & lantern_out) ... PASSED
[TEST 15] [Phase 3] Châm dầu đèn đang sáng (Refuel lit lantern & candidate selection) ... PASSED
[TEST 16] [Phase 3] Thắp lại đèn đã từng sáng (Relighting cost 5 motes vs 10) ... PASSED
[TEST 17] [Phase 3] Sức chứa tăng dần (Dynamic capacity formula & mote pickup cap) ... PASSED
[TEST 18] [Phase 3] Bóng Mực hút dầu & Thưởng điểm Tỏa Sáng khi đang hút (+15) ... PASSED
[TEST 19] [Phase 3] Luật thắng mới - Bình minh (Dawn survival, no early win, dawn loss) ... PASSED

======================================================
🎉 KẾT QUẢ: Đạt 19/19 bài kiểm thử.
======================================================
```

---

## 2. Chi tiết Xác minh các Yêu cầu Cốt lõi của Ticket-03

### 2.1. Tiêu hao nhiên liệu tự nhiên & Tắt đèn (Test 14)
* **Kịch bản:** Đèn L1 có `fuel = 0.1` (tương đương 6 tick nhiên liệu).
* **Kết quả:** Sau 6 tick, `fuel` giảm về 0, đèn chuyển sang `lit: false`, `deposited: 0`, phát sinh sự kiện:
  ```json
  {"type":"event","tick":7,"name":"lantern_out","data":{"lantern_id":"L1"}}
  ```
* Đèn lưu lại `ever_lit = true` trong snapshot kế tiếp.

### 2.2. Châm dầu và Lựa chọn ứng viên (Test 15)
* **Kịch bản:** Đèn L1 (cách 1.0m, `fuel = 50.0`), Đèn L2 (cách 0.4m, `fuel >= 100`). Bé Mây mang 5 đom đóm.
* **Kết quả:** Đèn L2 đầy dầu bị bỏ qua mặc dù ở gần hơn. Đèn L1 được chọn và châm đầy `100.0` với sự kiện:
  ```json
  {"type":"event","tick":1,"name":"refuel","data":{"lantern_id":"L1","amount":5,"fuel":100}}
  ```
* Người chơi bị trừ 5 đom đóm và được cộng `+25` điểm.

### 2.3. Chi phí thắp lại 5 đom đóm (Test 16)
* **Kịch bản:** Đèn L1 đã từng sáng (`ever_lit = true`, `deposited = 0`). Bé Mây mang 6 đom đóm.
* **Kết quả:** Chỉ tiêu tốn đúng 5 đom đóm (thay vì 10). Sự kiện phát sinh:
  ```json
  {"type":"event","tick":1,"name":"deposit","data":{"lantern_id":"L1","amount":5,"deposited":5}}
  {"type":"event","tick":1,"name":"lantern_lit","data":{"lantern_id":"L1","relight":true}}
  ```
* Người chơi còn lại đúng 1 đom đóm, `relit_count` tăng lên 1, điểm số cộng `5 * 5 + 40 = 65`.

### 2.4. Sức chứa tăng dần (Test 17)
* Khởi điểm sức chứa: 10.
* Với `successful_lights = 3`: Sức chứa là $10 + 2 \times 3 = 16$. Khi đang mang 10 đom đóm, người chơi nhặt thêm thành công lên 11 đom đóm.
* Với `successful_lights = 8`: Sức chứa bị chặn trần ở `20` (`capacity_max`). Khi đã đạt 20 đom đóm, không thể nhặt thêm.

### 2.5. Bóng Mực hút dầu và Thưởng Tỏa Sáng (Test 18)
* **Hút dầu:** Khi ở gần đèn yếu (`fuel < 30`), Bóng Mực chuyển sang `drain`. Cứ mỗi 60 tick phát sinh sự kiện:
  ```json
  {"type":"event","tick":61,"name":"fuel_drain","data":{"lantern_id":"L1","shade_id":"S1","fuel":18.9}}
  ```
* **Tỏa Sáng:** Khi Tỏa Sáng trúng Bóng Mực đang ở trạng thái `drain`, điểm thưởng là **+15** (thay vì +5).

### 2.6. Luật Thắng Bình Minh & Bỏ Thắng Sớm (Test 19)
* **Thắng Bình Minh:** Tại tick bình minh (`time_left_s <= 0`), nếu số đèn sáng $\ge \lceil 0.6 \times 5\rceil = 3$ (Đêm 1):
  ```json
  {"type":"event","tick":4,"name":"game_over","data":{"result":"won","reason":"dawn_survived"}}
  ```
* **Bỏ Thắng Sớm:** Thắp sáng toàn bộ 5/5 đèn khi thời gian còn 100s, ván chơi vẫn tiếp diễn bình thường, không phát sinh `game_over`.
* **Thua Bình Minh:** Hết giờ mà chỉ có 2/5 đèn sáng, ván chơi kết thúc thua với `reason: "dawn"`.

---

## 3. Khả năng Tiếp cận: Bảng màu dễ phân biệt (Colorblind Mode)
* Thiết lập được lưu trong `localStorage` (`dao_den_long_colorblind`).
* Viền và mắt Bóng Mực đổi sang `#00B3FF`.
* Cảnh báo thời gian và UI đổi sang `#FFFFFF` kèm biểu tượng `⚠`.
* Đèn tắt bị xẹp 20% chiều cao và nan giấy có vết rách vật lý, phân biệt rõ ràng với đèn đang sáng mà không cần dựa vào màu sắc.
* Đèn yếu (`fuel < 30`) nhấp nháy 1 Hz cả khối đèn lẫn thanh dầu.

---

## 4. Hiệu năng Headless
* Chạy 21.600 tick (tương đương 6 phút mô phỏng 60 FPS) chỉ mất **0.16 giây**, vượt xa yêu cầu DoD ($\le 30$ giây).
