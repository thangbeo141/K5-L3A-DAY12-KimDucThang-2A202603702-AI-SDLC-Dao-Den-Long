# ADR 003: Cơ chế Đèn Cạn Dầu, Bóng Mực Hút Nhiên Liệu và Luật Thắng Bình Minh (Dawn Survival)

* **Trạng thái:** Chấp thuận (Accepted)
* **Ngày:** 2026-11-20
* **Tác giả:** Đội ngũ phát triển Đảo Đèn Lồng (Kim Đức Thắng - 2A202603702)
* **Áp dụng từ:** Phase 3 (Contract v1.2, Ticket-03)

---

## 1. Bối cảnh (Context)
Qua đợt playtest Phase 2, một vấn đề lớn về nhịp độ trò chơi (game pacing) được phát hiện:
* Những người chơi kỹ năng tốt thường tập trung thu thập đom đóm và thắp sáng toàn bộ ngọn đèn chỉ trong khoảng 2 phút đầu tiên.
* Do cơ chế cũ quy định "thắng ngay khi tất cả đèn sáng" (`all_lit`) và "đèn đã sáng thì vĩnh viễn không tắt", nửa sau của Đêm chơi bị cắt cụt, thiếu đi sự căng thẳng, kịch tính và thử thách sinh tồn cần có.
* Trò chơi cần một cơ chế động buộc người chơi phải liên tục di chuyển, bảo vệ và quản lý tài nguyên thay vì chỉ hoàn thành một lần rồi kết thúc.

## 2. Quyết định Thiết kế (Decisions)

### 2.1. Mô hình Trạng thái Đèn Lồng (Lantern State Model)
* **Hệ thống Nhiên liệu (Fuel):**
  * Mỗi ngọn đèn có dung lượng nhiên liệu tối đa `fuel_max = 100`.
  * Khi vừa thắp mới hoặc thắp lại, đèn tự động nạp đầy `fuel = 100`.
  * Đèn đang sáng tiêu hao tự nhiên `fuel_decay_per_s = 1.0` đơn vị/giây (tức `1/60` mỗi tick).
  * Để tránh sai số số thực tích lũy qua hàng nghìn tick, engine tính toán nội bộ bằng số nguyên tick (`fuel_ticks` từ 0 đến 6000), chỉ làm tròn 1 chữ số thập phân (`round1`) khi xuất snapshot hoặc sự kiện.
* **Cạn dầu (`lantern_out`):**
  * Khi `fuel <= 0`, đèn tắt ngay lập tức: `lit = false`, `deposited = 0`, `fuel = 0.0`.
  * Đèn ghi nhớ trạng thái từng sáng (`ever_lit = true`).
  * Phát sinh sự kiện `lantern_out { lantern_id }`.
* **Thắp lại (Relight) vs Thắp mới:**
  * Đèn chưa từng sáng (`ever_lit === false`): Cần 10 đom đóm để thắp.
  * Đèn đã từng sáng (`ever_lit === true`): Chỉ cần 5 đom đóm để thắp lại (`relight_cost = 5`).
  * Khi thắp lại, sự kiện `lantern_lit` mang cờ `{ relight: true }`.
* **Châm dầu (Refuel):**
  * Người chơi có thể bấm `[E]` (Tương tác) ở đèn đang sáng để châm dầu.
  * Công thức tính số đom đóm sử dụng: `used = min(carried, ceil((100 - fuel) / 10))`.
  * Đèn được hồi phục: `fuel = min(100, fuel + 10 * used)`.
  * Đèn đầy dầu (`used === 0`) bị loại khỏi danh sách ứng viên tương tác. Phát sinh sự kiện `refuel { lantern_id, amount, fuel }`.

### 2.2. Vùng An Toàn & Hành vi Bóng Mực Hút Dầu (Shade Drain State Machine)
* **Ngưỡng Vùng An Toàn:**
  * Đèn có `fuel >= 30` giữ nguyên Vùng an toàn bán kính 6.0m.
  * Đèn có `fuel < 30` **mất hoàn toàn Vùng an toàn** (Bóng Mực có thể tự do xâm nhập).
* **Trạng thái mới: `drain`:**
  * Bóng Mực ở trạng thái `wander` sẽ ưu tiên tìm đèn đang sáng có `fuel < 30` gần nhất.
  * Khi tiếp cận đèn trong phạm vi `XZ <= 2.0m`, Bóng Mực chuyển sang trạng thái `drain`: đứng yên và hút 5 fuel/giây liên tục (`5/60` mỗi tick, nhiều con cộng dồn).
  * Mỗi 60 tick hút liên tục phát sinh sự kiện `fuel_drain { lantern_id, shade_id, fuel }`.
  * Chuyển trạng thái:
    * Sang `chase`: Nếu Bé Mây tiến vào phạm vi 6.0m.
    * Sang `stunned`: Nếu trúng Tỏa Sáng (Pulse). Thưởng đặc biệt **+15 điểm** (thay vì +5).
    * Sang `wander`: Nếu đèn tắt, đèn được châm dầu lên `>= 30`, hoặc bị đẩy văng cách đèn `> 2.0m`.
  * Khi đèn được nạp lên `>= 30` lúc có Bóng Mực trong vùng 6m, toàn bộ bóng bị đẩy lùi ra mép trong 30 tick và không gây sát thương.

### 2.3. Luật Thắng Mới — Sinh Tồn Tới Bình Minh (Dawn Survival)
* **Xóa bỏ thắng sớm:** Thắp sáng toàn bộ đèn không còn kết thúc màn chơi ngay lập tức.
* **Thời lượng Đêm:** Đêm 1: 240s | Đêm 2: 270s | Đêm 3: 300s.
* **Điều kiện Thắng:**
  * Bé Mây còn sống (`flames > 0`) khi đồng hồ về 0 (`time_left_s <= 0`).
  * Số đèn đang sáng tại tick cuối cùng đạt tối thiểu `ceil(0.6 * tổng số đèn)`:
    * Đêm 1: $\ge 3/5$ ngọn đèn sáng.
    * Đêm 2: $\ge 4/6$ ngọn đèn sáng.
    * Đêm 3: $\ge 5/7$ ngọn đèn sáng.
  * Kết thúc với lý do: `dawn_survived`.
* **Điều kiện Thua:**
  * Hết Ngọn Lửa (`flames <= 0`), lý do: `no_flames`.
  * Hoặc hết giờ mà số đèn sáng không đạt ngưỡng 60%, lý do: `dawn`.

### 2.4. Sức Chứa Túi Tăng Dần (Dynamic Carrying Capacity)
* Sức chứa khởi điểm là 10.
* Mỗi lần thắp sáng thành công trong Đêm (kể cả thắp mới lẫn thắp lại), sức chứa tăng thêm 2:
  $$\text{capacity} = \min(20, 10 + 2 \times \text{successful\_lights})$$
* Sức chứa tối đa là 20. Đặt lại về 10 vào đầu mỗi Đêm.

### 2.5. Khả năng Tiếp cận: Chế độ Mù Màu (Colorblind Accessibility)
* Thêm cài đặt lưu vào `localStorage`: "Bảng màu dễ phân biệt".
* Viền và mắt Bóng Mực chuyển từ tím sẫm `#7A3CFF` sang xanh lục lam `#00B3FF`.
* Cảnh báo nguy hiểm trên UI đổi từ đỏ `#FF5A5F` sang trắng `#FFFFFF` kèm biểu tượng `⚠`.
* Đèn tắt bị xẹp 20% chiều cao và có vết rách trên nan giấy, giúp phân biệt ngay lập tức không cần dựa vào màu sắc. Đèn sắp hết dầu (`fuel < 30`) nhấp nháy tần số 1 Hz.

---

## 3. Hệ quả & Tương thích (Consequences)
* **Tích cực:** Tạo áp lực chiến thuật cao ở giai đoạn cuối Đêm. Người chơi phải phân bổ thời gian giữa nhặt đóm, tuần tra thắp lại đèn cạn dầu và bảo vệ các ngọn đèn chiến lược.
* **Thay đổi phá vỡ (Breaking Changes):**
  * Xóa bỏ mã kết thúc `all_lit`.
  * Cấu trúc `snapshot` bổ sung `fuel`, `ever_lit`, `relit_count`, `capacity`, và trạng thái bóng `drain`.
  * Cập nhật toàn bộ các bài test liên quan đến kết thúc ván đấu và nạp đèn.
