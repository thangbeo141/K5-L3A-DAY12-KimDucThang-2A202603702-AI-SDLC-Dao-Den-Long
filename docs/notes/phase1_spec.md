# Ghi chép Phase 1: Giả định thiết kế & Nhật ký AI

## 1. Giả định thiết kế (Assumptions)
- **Đảo Bến:** Hòn đảo hình tròn bán kính 35 mét, mặt đất phẳng tại cao độ Y = 0.
- **Vị trí 5 Đèn Lồng:** Phân bổ đều quanh bán kính R = 25m (L1 đến L5).
- **Đom đóm (Motes):** Xuất hiện ngẫu nhiên trong khoảng bán kính 5m đến 30m khi không dùng kịch bản scenario cố định.
- **Bóng Mực (Shades):** Xuất phát từ rìa đảo (R = 22m), tự động tìm đường đuổi theo Mây với vận tốc 3.5 m/s.
- **Vùng an toàn (safe_radius = 4m):** Quái vật Bóng Mực sợ ánh sáng, không thể tiến vào phạm vi 4m quanh đèn đã thắp.

## 2. Nhật ký sử dụng AI & Token
- **Lập kế hoạch & Kiến trúc:** Tách bạch hoàn toàn phần mô phỏng vật lý (src/engine.js) và hiển thị WebGL 3D (public/game3d.js).
- **Harness & Tối ưu token:**
  - Viết file `AGENTS.md` súc tích, chỉ rõ các lệnh build, run, test.
  - Sử dụng kịch bản test tự động `node tests/run_tests.js` thay vì chạy thủ công nhiều lần.
- **Ước tính token sử dụng:** Khoảng ~18,000 token cho toàn bộ Phase 1.
