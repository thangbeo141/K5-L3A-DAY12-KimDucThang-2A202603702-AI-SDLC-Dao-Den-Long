# Đảo Đèn Lồng (Lantern Island) - AI SDLC Day 12

> **Tác giả:** Kim Đức Thắng | **MSSV:** 2A202603702  
> **Khóa:** K5-L3A | **Dự án:** Game 3D Đảo Đèn Lồng & Headless Simulation  
> **Video Demo:** `docs/demo/demo.mp4` (hoặc xem tại GitHub Release v1.0.0)

---

## 1. Hướng dẫn cài đặt và khởi chạy (Tối đa 3 lệnh)

Chỉ cần máy tính có cài sẵn Node.js (hỗ trợ Windows, macOS, Linux):

```bash
# Lệnh 1: Cài đặt thư viện
npm install

# Lệnh 2: Khởi động game giao diện 3D
npm start
```
> Sau khi chạy lệnh 2, mở trình duyệt truy cập: **`http://localhost:3000`** để trải nghiệm game.

---

## 2. Chế độ chạy ngầm tự động (Headless - Test Contract v1.1)

Game hỗ trợ chạy không cần màn hình đồ họa (headless) với tốc độ 60 ticks/s phục vụ chấm điểm tự động (hỗ trợ cả 3 Đêm):

```bash
# Lệnh chạy headless cơ bản:
node src/headless.js --seed 42 --night 1 --ticks 600 --out output.jsonl

# Lệnh chạy toàn bộ 13 bài test kiểm chứng:
npm test
```

---

## 3. Hướng dẫn điều khiển & Luật chơi (Phase 2 - Ba Hòn Đảo)

### Điều khiển:
- **W, A, S, D:** Di chuyển nhân vật Mây (A: Trái, D: Phải, W: Tiến, S: Lùi).
- **Space:** Nhảy (Jump).
- **Shift / C:** Lướt (Dash) tốc độ 14 m/s trong 0.2s.
- **E:** Tương tác / Nạp đom đóm vào Đèn Lồng khi đứng gần (bán kính 2.0m).
- **F / Q:** Tỏa Sáng (Pulse) xua đuổi Bóng Mực và cướp lại đồ từ Gió Lạc (tiêu hao 3 đom đóm).
- **Esc / P:** Tạm dừng (Pause / Resume) và mở menu cài đặt.
- **Kéo chuột:** Xoay camera 3D quanh nhân vật.

### Quần thể 3 Đêm:
- **Đêm 1 (Đảo Bến):** Hòn đảo tròn R=40m, 5 Đèn Lồng, quái Bóng Mực.
- **Đêm 2 (Đảo Cau):** 2 đảo tròn R=28m nối bằng Cầu Tre không lan can, 6 Đèn Lồng, 2 Bục Nhảy phóng qua đảo, quái Gió Lạc và Bùa Gió.
- **Đêm 3 (Đảo Chuông):** Hòn đảo 3 tầng độ cao (Y=0, Y=3, Y=6) với 2 dốc nghiêng và Tháp Chuông cổ, 7 Đèn Lồng, gió mạnh đổi chiều theo chu kỳ.

### Luật chơi & Tính điểm:
- **Thắng:** Thắp sáng toàn bộ Đèn Lồng của hòn đảo trước khi hết thời gian.
- **Thua:** Hết 3 Ngọn Lửa sinh mệnh (flames = 0) hoặc hết thời gian.
- **Cách tính điểm chuẩn:**
  - Nạp mỗi đom đóm: **+10 điểm**
  - Thắp sáng mỗi ngọn đèn: **+100 điểm**
  - Tỏa Sáng trúng mỗi Bóng Mực: **+5 điểm**
  - Điểm thưởng khi thắng: **+2 điểm / giây còn lại** và **+50 điểm / Ngọn Lửa còn lại**. Tổng điểm lưu giữ qua các Đêm.

---

## 4. Sáng tạo của tôi (My Creative Features)
- **Tạo hình Bé Mây đậm chất Á Đông:** Nhân vật Mây đội chiếc nón lá truyền thống, trên vành nón treo một chiếc đèn lồng nhỏ phát sáng dẫn lối trong đêm sương.
- **Hiệu ứng ánh sáng ấm áp:** Khi Đèn Lồng được thắp sáng, ánh sáng vàng cam ấm áp lan tỏa, xua tan bóng tối và tạo vùng an toàn bảo vệ Mây khỏi Bóng Mực.
