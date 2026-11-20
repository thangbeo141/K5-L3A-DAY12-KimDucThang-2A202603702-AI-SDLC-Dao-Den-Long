/**
 * Automated Test Runner for Đảo Đèn Lồng (Lantern Island)
 * Checks compliance with Test Contract v1.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMP_DIR = path.resolve(ROOT_DIR, 'tests', 'output');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  process.stdout.write(`[TEST ${total}] ${name} ... `);
  try {
    fn();
    passed++;
    console.log(`\x1b[32mPASSED\x1b[0m`);
  } catch (err) {
    console.log(`\x1b[31mFAILED\x1b[0m`);
    console.error(`       Error: ${err.message}`);
  }
}

console.log(`\n======================================================`);
console.log(`🧪 CHẠY BỘ KIỂM THỬ TỰ ĐỘNG - TEST CONTRACT V1.0`);
console.log(`======================================================\n`);

// 1. Mote Pickup Test
runTest("Nhặt đom đóm (Mote pickup) theo kịch bản", () => {
  const outPath = path.join(TEMP_DIR, 'out_mote.jsonl');
  const scenario = path.join(ROOT_DIR, 'tests', 'scenarios', 'scenario_mote.json');
  const inputs = path.join(ROOT_DIR, 'tests', 'scenarios', 'inputs_move_forward.json');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenario}" --inputs "${inputs}" --ticks 40 --out "${outPath}"`, { cwd: ROOT_DIR });

  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const pickedEvent = lines.find(l => l.type === 'event' && l.name === 'mote_picked');
  if (!pickedEvent) throw new Error("Không phát sinh sự kiện mote_picked");
  if (pickedEvent.data.carried !== 1) throw new Error(`carried kỳ vọng 1, nhận ${pickedEvent.data.carried}`);
});

// 2. Lantern Deposit & Lit Test
runTest("Nạp đom đóm vào đèn & thắp sáng đèn (Deposit & Lantern lit)", () => {
  const outPath = path.join(TEMP_DIR, 'out_deposit.jsonl');
  const scenario = path.join(ROOT_DIR, 'tests', 'scenarios', 'scenario_deposit.json');
  const inputs = path.join(ROOT_DIR, 'tests', 'scenarios', 'inputs_interact.json');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenario}" --inputs "${inputs}" --ticks 20 --out "${outPath}"`, { cwd: ROOT_DIR });

  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const depositEvent = lines.find(l => l.type === 'event' && l.name === 'deposit');
  const litEvent = lines.find(l => l.type === 'event' && l.name === 'lantern_lit');

  if (!depositEvent) throw new Error("Không phát sinh sự kiện deposit");
  if (depositEvent.data.amount !== 3) throw new Error(`deposit amount kỳ vọng 3, nhận ${depositEvent.data.amount}`);
  if (!litEvent) throw new Error("Không phát sinh sự kiện lantern_lit");
  if (litEvent.data.lantern_id !== 'L1') throw new Error(`lantern_id kỳ vọng L1, nhận ${litEvent.data.lantern_id}`);
});

// 3. Pulse Stun Test
runTest("Tỏa sáng xua Bóng Mực (Pulse stun & pushback)", () => {
  const outPath = path.join(TEMP_DIR, 'out_pulse.jsonl');
  const scenario = path.join(ROOT_DIR, 'tests', 'scenarios', 'scenario_pulse.json');
  const inputs = path.join(ROOT_DIR, 'tests', 'scenarios', 'inputs_pulse.json');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenario}" --inputs "${inputs}" --ticks 20 --out "${outPath}"`, { cwd: ROOT_DIR });

  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const pulseEvent = lines.find(l => l.type === 'event' && l.name === 'pulse');
  if (!pulseEvent) throw new Error("Không phát sinh sự kiện pulse");
  if (!pulseEvent.data.stunned_ids.includes('S1')) throw new Error("S1 không nằm trong danh sách stunned_ids");
});

// 4. Determinism Test
runTest("Tính tất định (Determinism: 2 lần chạy cùng seed ra output giống hệt)", () => {
  const out1 = path.join(TEMP_DIR, 'out_det1.jsonl');
  const out2 = path.join(TEMP_DIR, 'out_det2.jsonl');

  execSync(`node src/headless.js --seed 777 --night 1 --ticks 180 --out "${out1}"`, { cwd: ROOT_DIR });
  execSync(`node src/headless.js --seed 777 --night 1 --ticks 180 --out "${out2}"`, { cwd: ROOT_DIR });

  const content1 = fs.readFileSync(out1, 'utf8');
  const content2 = fs.readFileSync(out2, 'utf8');
  if (content1 !== content2) {
    throw new Error("Hai lần chạy cho kết quả khác nhau (vi phạm tính tất định)!");
  }
});

// 5. Malformed inputs exit code 2 check
runTest("Xử lý file inputs sai định dạng trả về exit code 2", () => {
  const badInputs = path.join(TEMP_DIR, 'bad_inputs.json');
  fs.writeFileSync(badInputs, '{ "frames": "not-an-array" }');
  const outPath = path.join(TEMP_DIR, 'out_bad.jsonl');

  let exitCode = 0;
  try {
    execSync(`node src/headless.js --seed 1 --night 1 --inputs "${badInputs}" --ticks 10 --out "${outPath}"`, {
      cwd: ROOT_DIR,
      stdio: 'pipe'
    });
  } catch (err) {
    exitCode = err.status;
  }

  if (exitCode !== 2) {
    throw new Error(`Kỳ vọng exit code 2 khi input sai định dạng, nhận được ${exitCode}`);
  }
});

// 6. Safe Zone Protection Test (Shades cannot damage player inside lit lantern safe zone)
runTest("Bảo vệ trong Vùng An Toàn (Safe Zone quanh đèn đã thắp)", () => {
  const safeScenario = path.join(TEMP_DIR, 'scenario_safe.json');
  fs.writeFileSync(safeScenario, JSON.stringify({
    player: { pos: [0, 0, 1.0], carried: 0, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [{ id: "S1", pos: [0, 0, 1.5] }], // Within hit distance (0.5m < 1.2m)
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, deposited: 3 }] // Player is 1.0m from lit lantern (< 4.0m safe_radius)
  }));
  const outPath = path.join(TEMP_DIR, 'out_safe.jsonl');

  execSync(`node src/headless.js --seed 1 --night 1 --scenario "${safeScenario}" --ticks 10 --out "${outPath}"`, { cwd: ROOT_DIR });

  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const hitEvent = lines.find(l => l.type === 'event' && l.name === 'player_hit');
  if (hitEvent) {
    throw new Error("Người chơi đang đứng trong Vùng An Toàn nhưng vẫn bị Bóng Mực đánh trúng!");
  }
});

// 7. CLI --arg=value syntax support
runTest("Hỗ trợ cú pháp đối số dòng lệnh dạng --arg=value", () => {
  const outPath = path.join(TEMP_DIR, 'out_syntax.jsonl');
  execSync(`node src/headless.js --seed=42 --night=1 --ticks=10 --out="${outPath}"`, { cwd: ROOT_DIR });

  if (!fs.existsSync(outPath) || fs.readFileSync(outPath, 'utf8').trim().length === 0) {
    throw new Error("Không thể thực thi lệnh headless với cú pháp --arg=value");
  }
});

// ======================================================
// PHẦN MỚI: KIỂM THỬ TÍNH NĂNG GIAI ĐOẠN 2 (TICKET-02)
// ======================================================

// 8. Dash Test
runTest("[Phase 2] Kỹ năng Lướt (Dash)", () => {
  const scenario = path.join(ROOT_DIR, 'tests', 'scenarios', 'scenario_dash.json');
  const inputs = path.join(ROOT_DIR, 'tests', 'scenarios', 'inputs_dash.json');
  const outPath = path.join(TEMP_DIR, 'out_dash.jsonl');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenario}" --inputs "${inputs}" --ticks 15 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const dashEvt = lines.find(l => l.type === 'event' && l.name === 'dash');
  if (!dashEvt) throw new Error("Không phát sinh sự kiện dash khi kích hoạt Lướt");
});

// 9. Charm Test
runTest("[Phase 2] Nhặt Bùa Gió (Wind Charm)", () => {
  const scenario = path.join(ROOT_DIR, 'tests', 'scenarios', 'scenario_charm.json');
  const inputs = path.join(ROOT_DIR, 'tests', 'scenarios', 'inputs_charm.json');
  const outPath = path.join(TEMP_DIR, 'out_charm.jsonl');

  execSync(`node src/headless.js --seed 100 --night 2 --scenario "${scenario}" --inputs "${inputs}" --ticks 15 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const charmEvt = lines.find(l => l.type === 'event' && l.name === 'charm_picked');
  if (!charmEvt) throw new Error("Không phát sinh sự kiện charm_picked");
  if (charmEvt.data.charm_id !== 'C1') throw new Error(`charm_id kỳ vọng C1, nhận ${charmEvt.data.charm_id}`);
});

// 10. Drifter Steal & Drop Test
runTest("[Phase 2] Gió Lạc cướp đom đóm & Tỏa Sáng làm rơi lại đồ", () => {
  const scenario = path.join(ROOT_DIR, 'tests', 'scenarios', 'scenario_drifter.json');
  const inputs = path.join(ROOT_DIR, 'tests', 'scenarios', 'inputs_drifter.json');
  const outPath = path.join(TEMP_DIR, 'out_drifter.jsonl');

  execSync(`node src/headless.js --seed 100 --night 2 --scenario "${scenario}" --inputs "${inputs}" --ticks 10 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const stealEvt = lines.find(l => l.type === 'event' && l.name === 'drifter_steal');
  const dropEvt = lines.find(l => l.type === 'event' && l.name === 'drifter_drop');
  if (!stealEvt) throw new Error("Không phát sinh sự kiện drifter_steal");
  if (stealEvt.data.amount !== 3) throw new Error(`stolen amount kỳ vọng 3, nhận ${stealEvt.data.amount}`);
  if (!dropEvt) throw new Error("Không phát sinh sự kiện drifter_drop khi dùng Tỏa Sáng trúng Gió Lạc");
});

// 11. Pause / Resume Test
runTest("[Phase 2] Tạm dừng (Pause) & Tiếp tục (Resume)", () => {
  const scenario = path.join(ROOT_DIR, 'tests', 'scenarios', 'scenario_pause.json');
  const inputs = path.join(ROOT_DIR, 'tests', 'scenarios', 'inputs_pause.json');
  const outPath = path.join(TEMP_DIR, 'out_pause.jsonl');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenario}" --inputs "${inputs}" --ticks 10 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const pausedEvt = lines.find(l => l.type === 'event' && l.name === 'paused');
  const resumedEvt = lines.find(l => l.type === 'event' && l.name === 'resumed');
  if (!pausedEvt) throw new Error("Không phát sinh sự kiện paused");
  if (!resumedEvt) throw new Error("Không phát sinh sự kiện resumed");
});

// 12. Fall off island Test
runTest("[Phase 2] Rơi khỏi đảo (Y < -10)", () => {
  const scenario = path.join(ROOT_DIR, 'tests', 'scenarios', 'scenario_fall.json');
  const outPath = path.join(TEMP_DIR, 'out_fall.jsonl');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenario}" --ticks 15 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const fallEvt = lines.find(l => l.type === 'event' && l.name === 'player_hit' && l.data.by === 'fall');
  if (!fallEvt) throw new Error("Không phát sinh sự kiện player_hit do rơi khỏi đảo");
  if (fallEvt.data.flames !== 2) throw new Error(`flames kỳ vọng 2, nhận ${fallEvt.data.flames}`);
  if (fallEvt.data.lost !== 5) throw new Error(`lost motes kỳ vọng 5, nhận ${fallEvt.data.lost}`);
});

// 13. Full Night 21,600 ticks Performance Benchmark (DoD: <= 30s)
runTest("[Phase 2] Hiệu năng Headless 21.600 tick (≤ 30 giây)", () => {
  const outPath = path.join(TEMP_DIR, 'out_perf.jsonl');
  const startMs = Date.now();
  execSync(`node src/headless.js --seed 42 --night 1 --ticks 21600 --snapshot-every 600 --out "${outPath}"`, { cwd: ROOT_DIR });
  const durationSec = (Date.now() - startMs) / 1000;
  if (durationSec > 30.0) {
    throw new Error(`Thời gian chạy 21.600 tick vượt quá 30s (thực tế: ${durationSec.toFixed(2)}s)`);
  }
  process.stdout.write(`(${durationSec.toFixed(2)}s) `);
});

console.log(`\n======================================================`);
console.log(`🎉 KẾT QUẢ: Đạt ${passed}/${total} bài kiểm thử.`);
console.log(`======================================================\n`);

if (passed !== total) {
  process.exit(1);
}
