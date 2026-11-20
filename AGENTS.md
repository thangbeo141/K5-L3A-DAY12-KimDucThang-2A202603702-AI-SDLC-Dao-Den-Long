# AGENTS.md — AI Harness & Developer Guidelines

> Dự án: **Đảo Đèn Lồng (Lantern Island)** — Game 3D + Headless Simulation
> MSSV: 2A202603702 | Tác giả: Kim Đức Thắng

---

## 1. Mục tiêu & Nguyên tắc cốt lõi
- **Chính xác theo Test Contract:** Mọi logic game phải tuân thủ nghiêm ngặt theo `game.contract.json` và Test Contract v1.0.
- **Tách biệt Logic và Hiển thị:** Toàn bộ trạng thái và bước tính toán vật lý, di chuyển, nhặt đom đóm, va chạm, điểm số nằm ở `src/engine.js`.
- **Chạy Headless thuần túy:** `node src/headless.js` chạy 60 ticks/s không cần GPU, độc lập, tất định (deterministic). Cùng `--seed`, cùng inputs/scenario luôn sinh cùng kết quả.
- **Tiết kiệm token & Kiểm chứng trước:** Luôn kiểm tra bằng test tự động và log trước khi xác nhận hoàn thành.

---

## 2. Các lệnh tiêu chuẩn (Build & Run & Test)

- **Cài đặt:** `npm install`
- **Mở game 3D giao diện:** `npm start` (mở server web cục bộ tại port 3000)
- **Chạy chế độ Headless:**
  ```bash
  node src/headless.js --seed 42 --night 1 --ticks 600 --out test_out.jsonl
  ```
- **Chạy toàn bộ bài test kiểm chứng:** `npm test`

---

## 3. Quy ước tọa độ & Đại lượng
- Đơn vị khoảng cách: mét ($m$).
- Trục $Y$ hướng lên trên (mặt đất $Y = 0$).
- Người chơi xuất phát tại $(0, 0, 0)$.
- Khoảng cách va chạm và tương tác tính trên mặt phẳng nằm ngang $XZ$.
- Tọa độ trong file log JSONL làm tròn 3 chữ số thập phân (`.toFixed(3)`).

---

## 4. Lịch sử cập nhật Harness
- **Phase 1 (PRD-0):** Thiết lập cấu trúc dự án, core deterministic simulation engine, headless runner, web 3D Three.js renderer, scenario test suite.
- **Phase 2 (Ticket-02 - "Ba hòn đảo"):** Nâng cấp Test Contract v1.1, tích hợp số liệu chuẩn, hỗ trợ 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông), cơ chế Lướt (Dash), Bùa Gió, Gió Lạc (Drifters), bục phóng, dốc và tháp chuông, hệ thống Tạm dừng (Pause/Resume), Web Audio API SFX, mở rộng bộ test headless lên 13 bài đạt hiệu năng 21.600 tick trong 0.14s.
