# Bằng chứng kiểm chứng Phase 1 (Verification Proof)

## 1. Kết quả chạy bộ kiểm thử tự động
Lệnh thực thi:
```bash
node tests/run_tests.js
```

Kết quả:
```text
======================================================
🧪 CHẠY BỘ KIỂM THỬ TỰ ĐỘNG - TEST CONTRACT V1.0
======================================================

[TEST 1] Nhặt đom đóm (Mote pickup) theo kịch bản ... PASSED
[TEST 2] Nạp đom đóm vào đèn & thắp sáng đèn (Deposit & Lantern lit) ... PASSED
[TEST 3] Tỏa sáng xua Bóng Mực (Pulse stun & pushback) ... PASSED
[TEST 4] Tính tất định (Determinism: 2 lần chạy cùng seed ra output giống hệt) ... PASSED
[TEST 5] Xử lý file inputs sai định dạng trả về exit code 2 ... PASSED
[TEST 6] Bảo vệ trong Vùng An Toàn (Safe Zone quanh đèn đã thắp) ... PASSED
[TEST 7] Hỗ trợ cú pháp đối số dòng lệnh dạng --arg=value ... PASSED

======================================================
🎉 KẾT QUẢ: Đạt 7/7 bài kiểm thử.
======================================================
```

## 2. Kiểm chứng tính tất định (Determinism)
- Hai lần chạy headless cùng seed 777, cùng số ticks 180 cho ra file jsonl giống nhau 100%.

## 3. Kiểm chứng định dạng Test Contract v1.0
- Lệnh chạy: `node src/headless.js --seed 42 --night 1 --ticks 60 --out tests/output/sample.jsonl`
- Dòng mở đầu là snapshot tick 0, các sự kiện phát sinh ghi kèm tick tương ứng, dòng cuối cùng là bản ghi `type: "end"`.
