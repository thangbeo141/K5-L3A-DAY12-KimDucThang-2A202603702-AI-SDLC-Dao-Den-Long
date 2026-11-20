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

## 2. Chế độ chạy ngầm tự động (Headless - Test Contract v1.0)

Game hỗ trợ chạy không cần màn hình đồ họa (headless) với tốc độ 60 ticks/s phục vụ chấm điểm tự động:

```bash
# Lệnh chạy headless cơ bản:
node src/headless.js --seed 42 --night 1 --ticks 600 --out output.jsonl

# Lệnh chạy toàn bộ bài test kiểm chứng:
npm test
```

---

## 3. Hướng dẫn điều khiển & Luật chơi

### Điều khiển:
- **W, A, S, D** hoặc **Phím mũi tên:** Di chuyển nhân vật Mây.
- **E:** Tương tác / Nạp đom đóm vào Đèn Lồng Lớn khi đứng gần.
- **Space** hoặc **F:** Kích hoạt chiêu Tỏa Sáng (Pulse) xua đuổi Bóng Mực.
- **Kéo chuột:** Xoay camera 3D quanh nhân vật.

### Luật chơi & Tính điểm:
- **Thắng:** Thắp sáng toàn bộ 5 Đèn Lồng trên đảo trước khi hết 300 giây.
- **Thua:** Bị Bóng Mực chạm hết 3 sinh lực (flames = 0) hoặc hết thời gian 300 giây.
- **Cách tính điểm:**
  - Nhặt mỗi chú đom đóm: **+10 điểm**
  - Thắp sáng mỗi ngọn Đèn Lồng: **+100 điểm**
  - Làm choáng Bóng Mực bằng Tỏa Sáng: **+20 điểm**
  - Điểm thưởng khi thắng: **+1 điểm / giây còn lại** và **+50 điểm / ngọn lửa còn lại**.

---

## 4. Sáng tạo của tôi (My Creative Features)
- **Tạo hình Bé Mây đậm chất Á Đông:** Nhân vật Mây đội chiếc nón lá truyền thống, trên vành nón treo một chiếc đèn lồng nhỏ phát sáng dẫn lối trong đêm sương.
- **Hiệu ứng ánh sáng ấm áp:** Khi Đèn Lồng được thắp sáng, ánh sáng vàng cam ấm áp lan tỏa, xua tan bóng tối và tạo vùng an toàn bảo vệ Mây khỏi Bóng Mực.
