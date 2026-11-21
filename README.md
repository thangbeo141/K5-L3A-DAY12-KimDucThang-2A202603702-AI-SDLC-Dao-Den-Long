# 🏮 Đảo Đèn Lồng (Lantern Island) — Phiên Bản Phát Hành v1.0.0

> **Tác giả:** Kim Đức Thắng | **MSSV:** 2A202603702  
> **Khóa:** K5-L3A | **Học phần:** AI-SDLC Day 12  
> **Tag nộp:** `phase-4` + `v1.0.0` | **Test Contract:** `v1.3`  
> **Kịch bản Demo 3 phút:** [docs/demo/README.md](file:///c:/Users/BenBarnes/Lab_Vin/day12/K5-L3A-DAY12-KimDucThang-2A202603702-AI-SDLC-Dao-Den-Long/docs/demo/README.md)  
> **Báo cáo Retrospective:** [docs/retro.md](file:///c:/Users/BenBarnes/Lab_Vin/day12/K5-L3A-DAY12-KimDucThang-2A202603702-AI-SDLC-Dao-Den-Long/docs/retro.md)

---

## ⚡ 1. Khởi Chạy Nhanh (Tối Đa 3 Lệnh)

Người chấm chỉ cần chạy đúng 3 lệnh sau để cài đặt và chơi game ngay trên trình duyệt:

```bash
git clone https://github.com/KimDucThang/dao-den-long.git
npm install
npm start
```

> Sau khi máy chủ khởi động, mở trình duyệt truy cập: **`http://localhost:3000`** để chơi game.

---

## 🎮 2. Hướng Dẫn Điều Khiển & Phím Tắt

### Phím điều khiển mặc định:
- **W, A, S, D** (hoặc Phím Mũi Tên): Di chuyển nhân vật Bé Mây (W: Tiến, S: Lùi, A: Sang Trái, D: Sang Phải).
- **Space:** Nhảy (Jump) — vận tốc 7.0 m/s, trọng lực -20 m/s².
- **Shift / C:** Lướt (Dash) — tốc độ 14 m/s trong 0.2s, hồi chiêu 1.5s.
- **E:** Tương tác — Nạp đom đóm thắp đèn, thắp lại đèn đã tắt hoặc châm dầu đèn đang sáng.
- **F / Q:** Tỏa Sáng (Pulse) — Tiêu hao 3 đom đóm, đẩy lùi và làm choáng quái vật trong bán kính 6.0m.
- **Esc / P:** Tạm dừng (Pause / Resume) hoặc mở menu cài đặt.
- **Kéo chuột trái:** Xoay camera góc nhìn thứ 3 (3rd Person Orbit) tự do.

### ⌨️ Đổi Phím Điều Khiển (Key Rebinding):
- Game hỗ trợ gán lại toàn bộ các phím: 4 hướng di chuyển, nhảy, lướt, tương tác, tỏa sáng, tạm dừng.
- Có tính năng **phát hiện xung đột** (báo cảnh báo đỏ nếu gán trùng phím).
- Nút **"Khôi phục mặc định"** đưa về cấu hình gốc.
- Mọi thiết lập được lưu trữ tự động vào `localStorage`.

---

## 🌙 3. Tóm Tắt Luật Chơi & Quần Thể 3 Đêm (Contract v1.3)

### Mục tiêu cốt lõi — Giữ Đảo Sáng Tới Bình Minh (Dawn Survival):
- **Luật Thắng:** Sống sót qua thời lượng của Đêm và giữ cho **ít nhất 60% ngọn đèn còn đang sáng** tại thời điểm bình minh (Đêm 1: $\ge 3/5$, Đêm 2: $\ge 4/6$, Đêm 3: $\ge 5/7$).
- **Luật Thua:** Hết 3 Ngọn Lửa sinh mệnh (`flames = 0`) hoặc trời rạng sáng mà không đủ 60% đèn sáng.
- **Cơ chế Tiêu Hao Dầu:** Đèn sáng tự tiêu hao $1.0$ đơn vị dầu/giây ($1/60$ mỗi tick). Khi dầu $\le 0$, đèn tắt lịm.
- **Thắp lại & Châm dầu:**
  - Đèn đã từng sáng thắp lại chỉ cần **5 đom đóm** (thay vì 10).
  - Bấm **[E]** ở đèn đang sáng để châm dầu (mỗi đom đóm nạp được 10 dầu, tối đa 100).
- **Sức chứa túi động:** Khởi điểm mang tối đa 10 đom đóm; mỗi lần thắp sáng thành công tăng thêm +2 sức chứa (tối đa 20 đom đóm).
- **Bóng Mực hút dầu:** Khi đèn có dầu $< 30$, vùng an toàn 6m bị vô hiệu hóa; Bóng Mực sẽ tìm đến hút dầu (5 fuel/giây). Tỏa Sáng trúng bóng đang hút dầu được thưởng **+15 điểm**.

### Các Đêm thử thách:
1. **Đêm 1: Đảo Bến (240s)**: Hòn đảo tròn $R = 40\text{m}$, 5 Đèn Lồng lớn, kẻ địch Bóng Mực (Shade).
2. **Đêm 2: Đảo Cau (270s)**: 2 đảo tròn $R = 28\text{m}$ nối bằng Cầu Tre không lan can, 6 Đèn Lồng, 2 Bục Nhảy phóng qua đảo, quái Gió Lạc (Drifter) cướp đom đóm và vật phẩm Bùa Gió (Wind Charm - lướt không hồi chiêu trong 10s).
3. **Đêm 3: Đảo Chuông (300s)**: Địa hình 3 tầng đá dựng đứng ($Y=0, 3, 6\text{m}$) nối bằng dốc nghiêng và Tháp Chuông cổ, 7 Đèn Lồng, những cơn gió mạnh đổi hướng giật theo chu kỳ.

---

## ♿ 4. Tính Năng Trợ Năng (Accessibility)

- **Đổi phím điều khiển (Key Rebinding):** Gán lại phím tùy ý, phát hiện xung đột, khôi phục mặc định.
- **Phụ đề & Chỉ báo thị giác:**
  - Cảnh báo Bóng Mực xuất hiện kèm **mũi tên chỉ hướng ở mép màn hình** chỉ về Bóng Mực gần nhất.
  - Cảnh báo trước **2.0s** khi sắp có cơn gió lớn thổi qua (Đêm 3).
  - Đếm ngược thị giác trong **10 giây cuối** của Đêm.
  - Cảnh báo đỏ khi có đèn lồng sắp cạn dầu ($< 30\%$).
- **Giảm chuyển động (Reduced Motion):** Tắt hiệu ứng rung lắc camera và tắt chớp đỏ màn hình khi bị đánh trúng.
- **Cỡ chữ lớn (Large Text):** Phóng to giao diện x1.25, đảm bảo phông chữ tối thiểu 18px ở độ phân giải 1280×720.
- **Chế độ tương phản màu (Colorblind mode):** Màu sắc viền phân biệt rõ ràng cho người mù màu.

---

## 📊 5. Bảng Xếp Hạng & Xuất Dữ Liệu CLI

- Bảng xếp hạng Top 10 ghi nhận: Tên người chơi (3–12 ký tự `[A-Za-z0-9_]`), Điểm số, Số đêm thắng, Thời gian đạt được (ISO 8601), Seed.
- Dữ liệu lưu trữ bền vững trên đĩa tại `data/leaderboard.json`.
- **Lệnh xuất Bảng Xếp Hạng qua CLI:**
  ```bash
  node server.js --export-leaderboard out.json
  ```

---

## 🚀 6. Kiểm Thử, Benchmark & Soak Test

### Chạy Toàn Bộ 22 Bài Kiểm Thử Tự Động:
```bash
npm test
```
*(Bao phủ 100% các yêu cầu từ Phase 1 đến Phase 4, bao gồm tính tất định, va chạm, kỹ năng, đổi phím, rò rỉ bộ nhớ).*

### Chế Độ Benchmark Hiệu Năng Chuẩn Hóa (`bench_cmd`):
```bash
node src/bench.js --seed 42 --duration 30 --out bench.json
```
- Khởi động 3s warmup, đo đạc 30s với 200 Bóng Mực, 100 đom đóm, 3 đèn sáng, camera bay vòng tròn $R=30\text{m}$.
- Kết quả lưu tại `bench.json` đạt: **avg_fps > 80 FPS**, **p1_low_fps > 70 FPS**, **load_ms < 150ms** (vượt xa ngưỡng cam kết).

### Chế Độ Soak Test Chạy Bền (`soak_cmd`):
```bash
node --expose-gc src/soak.js --seed 7 --nights 10 --out soak.json
```
- Chạy headless 10 Đêm liên tiếp trong cùng 1 tiến trình với bộ điều khiển ngẫu nhiên.
- Kết quả lưu tại `soak.json`: **0 crash**, tỉ lệ tăng bộ nhớ **$\le 1.05\times$** (ngưỡng cho phép $1.20\times$).

---

## 📜 7. Bản Quyền & Đóng Góp

- **Giấy phép:** [LICENSE](file:///c:/Users/BenBarnes/Lab_Vin/day12/K5-L3A-DAY12-KimDucThang-2A202603702-AI-SDLC-Dao-Den-Long/LICENSE) (MIT License).
- **Ghi nhận tài nguyên & Công nghệ:** [CREDITS.md](file:///c:/Users/BenBarnes/Lab_Vin/day12/K5-L3A-DAY12-KimDucThang-2A202603702-AI-SDLC-Dao-Den-Long/CREDITS.md).
- **Nhật ký phát triển:** [CHANGELOG.md](file:///c:/Users/BenBarnes/Lab_Vin/day12/K5-L3A-DAY12-KimDucThang-2A202603702-AI-SDLC-Dao-Den-Long/CHANGELOG.md).
