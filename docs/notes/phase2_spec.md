# Đặc tả & Tiêu chí Nghiệm thu Phase 2 (TICKET-02: "Ba hòn đảo")

> Dự án: **Đảo Đèn Lồng (Lantern Island)** — AI SDLC Day 12  
> Tác giả: Kim Đức Thắng | MSSV: 2A202603702 | Contract: v1.1

---

## 1. Giả định & Tiêu chí nghiệm thu (Acceptance Criteria)

### A. Gió Lạc (Drifters) — Đêm 2 & Đêm 3
* **Mô tả:** Dải lụa xám xanh (#8FA3B8) bay lượn trên cao với tốc độ 7 m/s, tối đa 2 con, xuất hiện từ tick 1200, 2400,...
* **Acceptance Criteria:**
  - AC-D1: Khi Mây mang ≥ 5 đom đóm và cự ly ≤ 15m, Gió Lạc chuyển từ `idle` sang `chase` đuổi theo Mây. Nếu đom đóm < 5 hoặc cự ly > 18m, trở về `idle`.
  - AC-D2: Khi chạm Mây (khoảng cách XZ ≤ 1.2m), Gió Lạc cướp `min(3, carried)` đom đóm, phát sinh sự kiện `drifter_steal`, chuyển sang `flee` bay ra xa 7 m/s trong 240 tick rồi biến mất. Không làm mất Ngọn Lửa, bỏ qua bất tử và vùng an toàn của đèn.
  - AC-D3: Kích hoạt Tỏa Sáng (Pulse) trúng Gió Lạc đang `chase` sẽ đuổi nó chuyển `flee`. Nếu trúng lúc đang `flee` có mang đồ, Gió Lạc thả lại toàn bộ đom đóm tại chỗ thành dạng đom đóm rơi (`dropped`, TTL 480 tick), phát sinh sự kiện `drifter_drop`.

### B. Bùa Gió (Wind Charm)
* **Mô tả:** Lá bùa đỏ viền vàng (#C8102E / #F2C14E) đặt tại vị trí cố định (Đêm 2: (35,0,0); Đêm 3: (30,0,25) và (-30,0,25)).
* **Acceptance Criteria:**
  - AC-C1: Nhặt tự động khi XZ ≤ 1.0m và độ cao chênh lệch ≤ 1.5m, phát sinh sự kiện `charm_picked { charm_id, charm_ticks: 600 }`.
  - AC-C2: Trong 600 tick hiệu lực: tốc độ chạy tăng lên 7.2 m/s, kỹ năng Lướt (Dash) hồi chiêu = 0.
  - AC-C3: Bùa biến mất sau khi nhặt và tái xuất hiện sau 2700 tick.

### C. Chuỗi 3 Đêm (3-Night Progression)
* **Mô tả:** Luồng chơi liền mạch: Menu chính → Giới thiệu Đêm (lời dặn Ông Đăng) → Chơi Đêm → Kết quả → Đêm kế tiếp.
* **Acceptance Criteria:**
  - AC-N1: Hết Đêm 1 mở khóa Đêm 2 (Đảo Cau). Hết Đêm 2 mở khóa Đêm 3 (Đảo Chuông).
  - AC-N2: Thắng Đêm 3 hiện màn hình Bình Minh cùng tổng điểm tích lũy của cả 3 Đêm.
  - AC-N3: Thua Đêm nào cho phép chơi lại ngay Đêm đó mà không mất tiến trình.

### D. Tạm dừng (Pause / Resume — Esc / P)
* **Mô tả:** Nhấn `Esc` hoặc `P` để dừng/tiếp tục game.
* **Acceptance Criteria:**
  - AC-P1: Kích hoạt pause làm phát sinh sự kiện `paused`, dừng toàn bộ đồng hồ đếm ngược, vật lý, chuyển động quái và TTL đom đóm.
  - AC-P2: Snapshot khi tạm dừng ghi nhận `state: "paused"`. Nhấn tiếp tục phát sinh sự kiện `resumed`.

### E. Cài đặt (Settings)
* **Acceptance Criteria:**
  - AC-S1: Cho phép điều chỉnh Âm lượng (0 - 100%) và Độ nhạy chuột (0.5x - 2.0x).
  - AC-S2: Giá trị cài đặt được lưu vào `localStorage` và duy trì giữa các lần tải trang.

### F. Âm thanh Procedural (Web Audio API)
* **Acceptance Criteria:**
  - AC-A1: 100% âm thanh được tổng hợp qua Web Audio API (zero asset ngoài, không lỗi mạng, offline 100%).
  - AC-A2: Đầy đủ SFX: Nhặt đom đóm, Nạp đèn, Thắp sáng đèn, Tỏa Sáng, Nhảy, Lướt, Bị đánh/Rơi, Bùa Gió, Gió Lạc, Thắng, Thua, cảnh báo 10s cuối.

### G. HUD Đầy Đủ
* **Acceptance Criteria:**
  - AC-H1: Hiển thị Ngọn Lửa (trên trái), Đồng hồ đếm ngược mm:ss đổi màu đỏ nhấp nháy khi ≤ 30s.
  - AC-H2: Túi đom đóm 10 ô trực quan (dưới giữa), biểu tượng hồi chiêu Lướt và Tỏa Sáng (dưới phải).
  - AC-H3: Nhắc phím `[E]` khi đứng gần đèn, Mũi tên la bàn chỉ hướng đèn chưa thắp gần nhất khi ở xa.

### H. Bảng Màu Chuẩn (Ticket-02)
* **Acceptance Criteria:**
  - AC-M1: Tuân thủ chính xác bảng mã màu hex của Ticket-02 cho trời sương, cỏ, cát, gỗ, đèn, đom đóm, quái vật, trang phục Mây.
  - AC-M2: Cường độ ánh sáng môi trường tăng tuyến tính: `0.15 + 0.55 * (đèn sáng / tổng đèn)`.

---

## 2. Nhật ký Sử dụng AI & Quản lý Token
* **Chiến lược tối ưu token:** 
  - Đọc kỹ toàn bộ Ticket-02, phân tích cấu trúc Test Contract v1.1 trước khi bắt tay viết code.
  - Tích hợp trực tiếp các công thức bản đồ chuẩn (tọa độ đèn, điểm sinh đom đóm và quái vật) vào `src/engine.js`.
  - Thay vì thêm file asset âm thanh nặng nề, sử dụng Web Audio API tích hợp ngay trong frontend: vừa đáp ứng 100% tiêu chí âm thanh vừa tiết kiệm token và đảm bảo độ mượt.
* **Ước tính token sử dụng Phase 2:** ~24,000 token.
