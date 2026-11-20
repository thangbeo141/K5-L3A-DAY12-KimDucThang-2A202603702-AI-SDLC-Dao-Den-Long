# Bằng chứng kiểm chứng Phase 2 (Verification Proof - Ticket-02)

> Dự án: **Đảo Đèn Lồng (Lantern Island)** — AI SDLC Day 12  
> Tag: `phase-2` | Contract: `v1.1`

---

## 1. Kết quả chạy bộ kiểm thử tự động (13/13 Passed)

Lệnh thực thi:
```bash
npm test
```

Kết quả:
```text
======================================================
🧪 CHẠY BỘ KIỂM THỬ TỰ ĐỘNG - TEST CONTRACT V1.0 & V1.1
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
[TEST 13] [Phase 2] Hiệu năng Headless 21.600 tick (≤ 30 giây) ... (0.14s) PASSED

======================================================
🎉 KẾT QUẢ: Đạt 13/13 bài kiểm thử.
======================================================
```

---

## 2. Kiểm chứng hồi quy Phase 1 (Regression Verification)
- Tất cả các bài kiểm thử của Phase 1 (Test 1 đến Test 7) đều vượt qua 100% khi chạy với bộ số liệu chuẩn và cơ chế của Test Contract v1.1.
- Kịch bản nạp đèn và tỏa sáng được chuẩn hóa theo chi phí mới (10 đom đóm cho đèn, 3 đom đóm cho Tỏa Sáng).

---

## 3. Kiểm chứng hiệu năng Headless (DoD: ≤ 30 giây cho 21.600 ticks)
- Lệnh chạy kiểm chứng:
  ```bash
  node src/headless.js --seed 42 --night 1 --ticks 21600 --snapshot-every 600 --out tests/output/out_perf.jsonl
  ```
- **Thời gian thực tế đo được:** **`0.14 giây`** (vượt xa chỉ tiêu ≤ 30 giây).

---

## 4. Kiểm chứng các tính năng mới qua Scenario Headless
- **Lướt (Dash):** `scenario_dash.json` + `inputs_dash.json` → phát sinh sự kiện `dash`, Mây di chuyển 14 m/s trong 12 tick.
- **Bùa Gió (Wind Charm):** `scenario_charm.json` + `inputs_charm.json` → phát sinh sự kiện `charm_picked`, tăng tốc 7.2 m/s và lướt không hồi chiêu.
- **Gió Lạc (Drifters):** `scenario_drifter.json` + `inputs_drifter.json` → phát sinh sự kiện `drifter_steal` và `drifter_drop`.
- **Tạm dừng (Pause / Resume):** `scenario_pause.json` + `inputs_pause.json` → phát sinh sự kiện `paused`, snapshot ghi nhận `state: "paused"`, và `resumed`.
- **Rơi khỏi đảo:** `scenario_fall.json` → phát sinh sự kiện `player_hit { by: "fall", lost: 5 }`.
