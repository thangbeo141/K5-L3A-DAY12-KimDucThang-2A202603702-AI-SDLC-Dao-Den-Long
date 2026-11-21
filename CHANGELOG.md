# Changelog — Đảo Đèn Lồng (Lantern Island)

All notable changes to this project will be documented in this file.

---

## [v1.0.0 / Phase 4 - Contract v1.3] - 2026-11-21

### Added
- **Chế độ Benchmark chuẩn hóa (`bench_cmd`)**:
  - Hỗ trợ dòng lệnh `<bench_cmd> --seed 42 --duration 30 --out bench.json`.
  - Cảnh chuẩn Đêm 1 với 200 Bóng Mực wander, 100 đom đóm, 3 đèn sáng 100 fuel, camera bay quỹ đạo tròn bán kính 30m, cao 15m.
  - Khởi động 3s warmup, đo đạc xuất file `bench.json` chuẩn hóa cam kết `avg_fps >= 60`, `p1_low_fps >= 30`, `load_ms <= 10000`.
- **Chế độ Soak Test chạy bền (`soak_cmd`)**:
  - Hỗ trợ dòng lệnh `<soak_cmd> --seed 7 --nights 10 --out soak.json`.
  - Chạy headless 10 Đêm liên tiếp trong cùng một tiến trình (luân phiên Đêm 1 -> 2 -> 3 -> 1...), điều khiển bằng bộ phát ngẫu nhiên có seed riêng.
  - Kiểm tra rò rỉ bộ nhớ (`mem_end_mb <= 1.2 * mem_start_mb`) và 0 crash.
- **Bảng Xếp Hạng (Leaderboard)**:
  - Giao diện xem Top 10 tích hợp từ menu chính và màn hình kết thúc ván chơi.
  - Kiểm tra tính hợp lệ của tên người chơi (3–12 ký tự `[A-Za-z0-9_]`).
  - Sắp xếp ưu tiên: `score` DESC, `achieved_at` ASC.
  - Lưu trữ bền vững trên đĩa (`data/leaderboard.json`) và hỗ trợ xuất CLI: `node server.js --export-leaderboard out.json`.
- **Hệ thống Trợ Năng Toàn Diện (Accessibility)**:
  - **Đổi phím điều khiển (Key Rebinding)**: Cho phép gán lại phím cho di chuyển (4 hướng), nhảy, lướt, tương tác, tỏa sáng, tạm dừng. Có hệ thống phát hiện xung đột trùng phím tức thì và nút "Khôi phục mặc định". Lưu cấu hình vào `localStorage`.
  - **Phụ đề & Chỉ báo thị giác (Visual Captions & Indicators)**: Mũi tên chỉ hướng mép màn hình về Bóng Mực gần nhất; Cảnh báo trước 2s khi có gió giật (Đêm 3); Banner đếm ngược 10s cuối; Cảnh báo đèn sắp cạn dầu (<30%).
  - **Giảm chuyển động (Reduced Motion)**: Tắt hiệu ứng chớp đỏ và rung lắc camera.
  - **Cỡ chữ lớn (Large Text)**: Phóng to chữ toàn bộ giao diện x1.25, đảm bảo cỡ chữ tối thiểu 18px ở độ phân giải 1280x720.
- **Tài liệu & Kịch bản Nghiệm thu**:
  - `LICENSE`: Giấy phép mã nguồn mở MIT.
  - `CREDITS.md`: Ghi nhận công nghệ, thư viện (Node.js, Three.js r128, Web Audio API), và AI tools.
  - `docs/retro.md`: Báo cáo đánh giá quy trình tương tác người - AI, phân tích năng suất và sử dụng token.
  - `docs/demo/README.md`: Kịch bản demo chuẩn xác 3 phút cho buổi nghiệm thu sản phẩm.

---

## [Phase 3 / Contract v1.2] - 2026-11-20

### ⚠ Breaking Changes (Thay đổi phá vỡ tương thích)

1. **Thay đổi Luật Thắng & Kết thúc Game (Win/Loss Condition):**
   * **Bỏ Thắng Sớm (`all_lit`):** Thắp sáng tất cả ngọn đèn không còn làm ván chơi kết thúc thắng ngay lập tức.
   * **Luật Thắng Bình Minh (`dawn_survived`):** Người chơi chỉ thắng khi sống sót đến hết thời gian của Đêm (`time_left_s <= 0`) và số đèn còn đang sáng tại tick cuối $\ge \lceil 0.6 \times \text{tổng số đèn}\rceil$ (Đêm 1: $\ge 3/5$, Đêm 2: $\ge 4/6$, Đêm 3: $\ge 5/7$).
   * **Lý do Thua Mới:** Hết giờ mà số đèn sáng $< 60\%$ sẽ thua với lý do `dawn`. Hết ngọn lửa thua với lý do `no_flames`.
   * **Mã sự kiện `all_lit` bị loại bỏ:** Không còn xuất hiện trong `game_over.reason`.

2. **Cơ chế Nhiên liệu & Hao hụt Đèn Lồng (Lantern Fuel Model):**
   * **Đèn có thể tắt:** Đèn đang sáng tự hao hụt $1.0$ đơn vị dầu/giây ($1/60$ mỗi tick).
   * **Sự kiện `lantern_out`:** Khi `fuel <= 0`, đèn tắt lịm, `deposited = 0`, ghi nhớ `ever_lit = true`, và phát sự kiện `lantern_out { lantern_id }`.
   * **Chi phí Thắp lại (Relight Cost):** Đèn đã từng sáng (`ever_lit === true`) chỉ cần 5 đom đóm để thắp lại (thay vì 10). Sự kiện `lantern_lit` bổ sung trường boolean `relight: true|false`.
   * **Cơ chế Châm Dầu (Refuel):** Cho phép tương tác với đèn đang sáng để bổ sung nhiên liệu: `used = min(carried, ceil((100 - fuel) / 10))`. Phát sinh sự kiện mới `refuel { lantern_id, amount, fuel }`. Đèn đầy dầu (`fuel >= 100`) bị bỏ qua khi tương tác.

3. **Bóng Mực Hút Dầu & Mất Vùng An Toàn (Shade Fuel Drain):**
   * **Mất Vùng An Toàn:** Đèn có `fuel < 30` mất hoàn toàn Vùng An Toàn bán kính 6m.
   * **Trạng thái mới `drain`:** Bóng Mực ở trạng thái `wander` sẽ tìm đến đèn có `fuel < 30` gần nhất. Khi cách $\le 2\text{m}$, chuyển sang `drain` và hút liên tục 5 fuel/giây.
   * **Sự kiện `fuel_drain`:** Phát sinh mỗi 60 tick liên tục khi bóng đang hút `{ lantern_id, shade_id, fuel }`.
   * **Thưởng Điểm Tỏa Sáng:** Choáng Bóng Mực đang ở trạng thái `drain` được thưởng **+15 điểm** (thay vì +5 điểm thông thường).

4. **Thay đổi Thời lượng các Đêm (Night Durations):**
   * Đêm 1: tăng từ 180s lên **240s**.
   * Đêm 2: tăng từ 210s lên **270s**.
   * Đêm 3: tăng từ 240s lên **300s**.

5. **Thay đổi Công thức Tính Điểm (Scoring Formula):**
   * Nạp đom đóm vào đèn (thắp mới, thắp lại, châm dầu): `+5` điểm / đom đóm.
   * Thắp đèn lần đầu: `+100` điểm.
   * Thắp lại đèn: `+40` điểm.
   * Choáng Bóng Mực: `+5` điểm (hoặc `+15` điểm nếu bóng đang drain).
   * Thưởng Bình Minh (khi thắng): `+50 + floor(fuel)` cho mỗi đèn đang sáng, `+50` cho mỗi Ngọn Lửa còn lại.
   * Bỏ hoàn toàn thưởng thời gian (`time_bonus`).

6. **Sức chứa Túi Động (Dynamic Carrying Capacity):**
   * Sức chứa khởi điểm: 10 đom đóm.
   * Tăng thêm +2 cho mỗi lần thắp sáng thành công trong Đêm: $\text{capacity} = \min(20, 10 + 2 \times \text{successful\_lights})$.
   * Snapshot và HUD cập nhật hiển thị `carried / capacity`.

7. **Cấu trúc Snapshot & Scenario Contract v1.2:**
   * Snapshot `lanterns[]` bổ sung: `fuel` (số thực 1 chữ số thập phân), `ever_lit` (boolean), `relit_count` (int).
   * Snapshot `player` bổ sung: `capacity` (int).
   * Snapshot `shades[]` bổ sung trạng thái: `"drain"`.
   * Scenario `lanterns[]` cho phép thiết lập: `lit`, `fuel`, `ever_lit`. Nếu `lit: true` mà thiếu `fuel`, mặc định là `100.0`.
   * Scenario `player` bổ sung: `successful_lights`, `capacity`.
   * Scenario `shades[]` bổ sung: `target_lantern_id`.

---

## [Phase 2 / Contract v1.1] - 2026-11-20
* Chuẩn hóa số liệu vật lý chạy 60 tick/s (tốc độ chạy 6.0 m/s, nhảy 7.0 m/s, trọng lực -20 m/s²).
* Thêm kỹ năng Lướt (Dash) 14 m/s trong 0.2s, hồi chiêu 1.5s.
* Mở rộng 3 Đêm: Đêm 1 (Đảo Bến), Đêm 2 (Đảo Cau - 2 đảo, cầu tre, bục phóng), Đêm 3 (Đảo Chuông - 3 tầng cao, gió giật).
* Thêm kẻ địch Gió Lạc (Drifter) và vật phẩm Bùa Gió (Wind Charm).
* Cơ chế rơi khỏi đảo khi $Y < -10.0$ mất 1 Ngọn Lửa và hồi sinh sau 60 tick.

---

## [Phase 1 / Contract v1.0] - 2026-11-20
* Bản dựng đầu tiên của Đảo Đèn Lồng (Headless Runner & 3D Three.js).
* Cơ chế nhặt đom đóm, nạp đèn, thắp sáng 5 ngọn đèn, vùng an toàn 6m.
* Kẻ địch Bóng Mực (Shade) với trạng thái chase, recoil và kỹ năng Tỏa Sáng (Pulse).
