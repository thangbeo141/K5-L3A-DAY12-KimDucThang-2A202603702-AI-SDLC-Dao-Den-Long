# Kịch Bản Demo Nghiệm Thu 3 Phút — Đảo Đèn Lồng v1.0.0

Tài liệu này hướng dẫn người trình diễn thực hiện buổi demo nghiệm thu sản phẩm trong đúng **3 phút**, làm nổi bật đầy đủ các tính năng then chốt của game.

---

## ⏱️ Kịch Bản Chi Tiết Từng Phút

### 1. Phút 0:00 – 1:00: Đêm 1 — Cơ Bản & Khởi Đầu
- **Mục tiêu**: Thể hiện cảm giác điều khiển mượt mà, cơ chế nhặt đom đóm, thắp đèn và kỹ năng lướt.
- **Thao tác**:
  1. Mở game từ trình duyệt (`http://localhost:3000`), nhấp **"Bắt Đầu Hành Trình (Đêm 1)"**.
  2. Dùng cụm phím **W, A, S, D** di chuyển Bé Mây thu thập 10 đom đóm đầu tiên.
  3. Bấm **Shift** để trình diễn kỹ năng **Lướt (Dash)** tăng tốc 14 m/s vượt qua mặt đất.
  4. Tiến lại ngọn đèn **L1** và bấm **[E]** nạp 10 đom đóm để thắp sáng. Chỉ ra:
     - Đèn bừng sáng, Vùng an toàn 6m xuất hiện (vòng tròn vàng xoay quanh đèn).
     - Bóng Mực đang tới gần lập tức bị chặn ngoài mép 6m.
     - Thanh dầu 3D hiển thị phía trên đèn ở mức 100%.
  5. Khi Bóng Mực áp sát người chơi ngoài vùng an toàn, bấm **[F]** để **Tỏa Sáng (Pulse)** đẩy lùi và làm choáng quái vật.

### 2. Phút 1:00 – 2:00: Đêm 2 — Đảo Cau: Bục Phóng, Cầu Tre & Gió Lạc
- **Mục tiêu**: Trình diễn tương tác môi trường nâng cao và kẻ địch mới (Gió Lạc).
- **Thao tác**:
  1. Chuyển sang **Đêm 2: Đảo Cau** (qua menu Chọn Đêm).
  2. Băng qua chiếc **Cầu tre lộng gió** nối giữa hai đảo lớn (0,0) và (70,0).
  3. Tiến vào **Bục phóng (Launch Pad)**: Bé Mây được bắn bổng lên không trung theo quỹ đạo parabol đẹp mắt, tiếp đất an toàn sang đảo bên kia.
  4. Cho **Gió Lạc** bay lướt qua để cướp mất đom đóm trong túi -> âm thanh và toast thông báo xuất hiện.
  5. Nhanh chóng bấm **[F] (Tỏa Sáng)** trúng Gió Lạc: Gió Lạc bị choáng và làm rơi lại toàn bộ đom đóm xuống mặt đất.
  6. Thu thập **Bùa Gió (Wind Charm)**: hiệu ứng lướt không hồi chiêu trong 10 giây được kích hoạt.

### 3. Phút 2:00 – 2:30: Đêm 3 — Đảo Chuông: Địa Hình Đa Tầng, Gió Cơn & Bình Minh
- **Mục tiêu**: Trình diễn độ khó cao nhất, luật bình minh (Dawn Survival) và cơ chế châm dầu.
- **Thao tác**:
  1. Mở **Đêm 3: Đảo Chuông**.
  2. Chỉ ra kiến trúc 3 tầng: Tầng 0 (cỏ), Tầng 1 (vành khăn đá Y=3m), đường dốc gỗ dốc nghiêng 30°, và Tầng 2 (đĩa vàng Y=6m với Tháp Chuông cổ).
  3. Chú ý cảnh báo gió: phụ đề thị giác **"🍃 CẢNH BÁO: Gió lớn sắp thổi trong 2s!"** xuất hiện trên HUD trước khi cơn gió mạnh thổi xô lệch hướng di chuyển.
  4. Trình diễn cơ chế giữ đèn:
     - Đèn sáng bị tiêu hao dầu 1.0 đơn vị/giây.
     - Khi dầu xuống dưới 30%, đèn nhấp nháy 1 Hz và phụ đề báo nguy hiển thị.
     - Bé Mây đến gần và bấm **[E]** để **Châm dầu (Refuel)** đưa dầu trở lại 100%.

### 4. Phút 2:30 – 3:00: Benchmark Mode, Trợ Năng & Bảng Xếp Hạng
- **Mục tiêu**: Minh chứng tiêu chuẩn phát hành chất lượng cao (v1.0.0).
- **Thao tác**:
  1. **Trợ năng (Accessibility)**:
     - Mở Cài Đặt: bật thử **Giảm chuyển động (Reduced Motion)** (tắt rung/chớp), **Cỡ chữ lớn (Large Text)**, và mở giao diện **Đổi phím điều khiển (Key Rebinding)**.
     - Thử gán phím trùng để thấy cảnh báo đỏ phát hiện xung đột tức thì.
  2. **Bảng Xếp Hạng**:
     - Mở **🏆 Bảng Xếp Hạng**: hiển thị Top 10 danh giá với điểm số, số đêm thắng và thời gian ghi danh.
  3. **Benchmark CLI**:
     - Mở terminal chạy lệnh: `node src/bench.js --seed 42 --duration 3 --out bench.json`
     - Mở file `bench.json` chỉ ra kết quả đo chuẩn xác: **avg_fps > 80 FPS**, **load_ms ~ 120ms**, vượt xa ngưỡng tối thiểu của hợp đồng.
