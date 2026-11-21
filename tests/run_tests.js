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

// ======================================================
// PHẦN MỚI: KIỂM THỬ TÍNH NĂNG GIAI ĐOẠN 3 (TICKET-03 - CONTRACT V1.2)
// ======================================================

// 14. Fuel Decay & Lantern Out Test
runTest("[Phase 3] Tiêu hao nhiên liệu tự nhiên & Đèn tắt (Fuel decay & lantern_out)", () => {
  const scenarioPath = path.join(TEMP_DIR, 'scenario_decay.json');
  fs.writeFileSync(scenarioPath, JSON.stringify({
    player: { pos: [0, 0, 10.0], carried: 0, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [],
    lanterns: [
      { id: "L1", pos: [0, 0, 0], lit: true, fuel: 0.1 } // 6 ticks of fuel (0.1 * 60 = 6)
    ]
  }));
  const outPath = path.join(TEMP_DIR, 'out_decay.jsonl');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenarioPath}" --ticks 10 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const outEvt = lines.find(l => l.type === 'event' && l.name === 'lantern_out');
  if (!outEvt) throw new Error("Không phát sinh sự kiện lantern_out khi đèn hết nhiên liệu");
  if (outEvt.data.lantern_id !== 'L1') throw new Error(`lantern_id kỳ vọng L1, nhận ${outEvt.data.lantern_id}`);

  const finalSnapshot = lines.filter(l => l.type === 'snapshot').pop();
  const l1Snap = finalSnapshot.lanterns.find(l => l.id === 'L1');
  if (l1Snap.lit !== false) throw new Error("Đèn hết dầu nhưng vẫn sáng!");
  if (l1Snap.fuel !== 0) throw new Error(`Nhiên liệu đèn tắt kỳ vọng 0, nhận ${l1Snap.fuel}`);
  if (l1Snap.ever_lit !== true) throw new Error("Đèn tắt không ghi nhớ ever_lit = true!");
});

// 15. Refuel Lit Lantern Test
runTest("[Phase 3] Châm dầu đèn đang sáng (Refuel lit lantern & candidate selection)", () => {
  const scenarioPath = path.join(TEMP_DIR, 'scenario_refuel.json');
  const inputsPath = path.join(TEMP_DIR, 'inputs_refuel.json');
  fs.writeFileSync(scenarioPath, JSON.stringify({
    player: { pos: [0, 0, 1.0], carried: 5, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [],
    lanterns: [
      { id: "L1", pos: [0, 0, 0], lit: true, fuel: 50.0 }, // 1.0m away, fuel 50 -> needs 5 motes to reach 100
      { id: "L2", pos: [0, 0, 1.4], lit: true, fuel: 100.1 } // 0.4m away (closer), but fuel >= 100 (full) -> must be skipped!
    ]
  }));
  fs.writeFileSync(inputsPath, JSON.stringify({
    frames: [{ tick: 0, interact: true }]
  }));
  const outPath = path.join(TEMP_DIR, 'out_refuel.jsonl');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenarioPath}" --inputs "${inputsPath}" --ticks 5 --snapshot-every 5 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const refuelEvt = lines.find(l => l.type === 'event' && l.name === 'refuel');
  if (!refuelEvt) throw new Error("Không phát sinh sự kiện refuel khi châm dầu vào đèn đang sáng");
  if (refuelEvt.data.lantern_id !== 'L1') throw new Error(`Chọn sai đèn: kỳ vọng L1, nhận ${refuelEvt.data.lantern_id}`);
  if (refuelEvt.data.amount !== 5) throw new Error(`amount châm kỳ vọng 5, nhận ${refuelEvt.data.amount}`);
  if (refuelEvt.data.fuel !== 100) throw new Error(`fuel sau khi châm kỳ vọng 100, nhận ${refuelEvt.data.fuel}`);

  const snap = lines.filter(l => l.type === 'snapshot').pop();
  if (snap.player.carried !== 0) throw new Error(`carried kỳ vọng 0 sau khi châm, nhận ${snap.player.carried}`);
});

// 16. Relighting Cost Test (ever_lit cost 5 vs initial 10)
runTest("[Phase 3] Thắp lại đèn đã từng sáng (Relighting cost 5 motes vs 10)", () => {
  const scenarioPath = path.join(TEMP_DIR, 'scenario_relight.json');
  const inputsPath = path.join(TEMP_DIR, 'inputs_relight.json');
  fs.writeFileSync(scenarioPath, JSON.stringify({
    player: { pos: [0, 0, 1.0], carried: 6, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [],
    lanterns: [
      { id: "L1", pos: [0, 0, 0], lit: false, deposited: 0, ever_lit: true }
    ]
  }));
  fs.writeFileSync(inputsPath, JSON.stringify({
    frames: [{ tick: 0, interact: true }]
  }));
  const outPath = path.join(TEMP_DIR, 'out_relight.jsonl');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenarioPath}" --inputs "${inputsPath}" --ticks 5 --snapshot-every 5 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const depEvt = lines.find(l => l.type === 'event' && l.name === 'deposit');
  const litEvt = lines.find(l => l.type === 'event' && l.name === 'lantern_lit');

  if (!depEvt) throw new Error("Không phát sinh sự kiện deposit khi thắp lại đèn");
  if (depEvt.data.amount !== 5) throw new Error(`deposit amount khi thắp lại kỳ vọng 5 (thay vì 10), nhận ${depEvt.data.amount}`);
  if (!litEvt) throw new Error("Không phát sinh sự kiện lantern_lit khi thắp lại đèn");
  if (litEvt.data.relight !== true) throw new Error("lantern_lit phải có trường relight: true khi thắp lại!");

  const snap = lines.filter(l => l.type === 'snapshot').pop();
  if (snap.player.carried !== 1) throw new Error(`carried còn lại kỳ vọng 1 (6 - 5), nhận ${snap.player.carried}`);
  const l1Snap = snap.lanterns.find(l => l.id === 'L1');
  if (l1Snap.relit_count !== 1) throw new Error(`relit_count kỳ vọng 1, nhận ${l1Snap.relit_count}`);
});

// 17. Dynamic Capacity Test (10 + 2 * successful_lights, cap 20)
runTest("[Phase 3] Sức chứa tăng dần (Dynamic capacity formula & mote pickup cap)", () => {
  const scenarioPath = path.join(TEMP_DIR, 'scenario_capacity.json');
  fs.writeFileSync(scenarioPath, JSON.stringify({
    player: { pos: [0, 0, 0], carried: 10, flames: 3, successful_lights: 3 }, // capacity = 10 + 2*3 = 16
    random_motes: false,
    random_shades: false,
    motes: [{ id: "M1", pos: [0, 0, 0.5] }] // Mote within pickup radius (0.5m)
  }));
  const outPath = path.join(TEMP_DIR, 'out_capacity.jsonl');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenarioPath}" --ticks 5 --snapshot-every 5 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const snap = lines.filter(l => l.type === 'snapshot').pop();
  if (snap.player.capacity !== 16) throw new Error(`capacity kỳ vọng 16 khi successful_lights = 3, nhận ${snap.player.capacity}`);
  
  const pickedEvt = lines.find(l => l.type === 'event' && l.name === 'mote_picked');
  if (!pickedEvt) throw new Error("Không nhặt được đom đóm khi carried (10) < capacity (16)");
  if (snap.player.carried !== 11) throw new Error(`carried kỳ vọng 11, nhận ${snap.player.carried}`);

  // Test cap at 20
  const scenarioCapPath = path.join(TEMP_DIR, 'scenario_capacity_cap.json');
  fs.writeFileSync(scenarioCapPath, JSON.stringify({
    player: { pos: [0, 0, 0], carried: 20, flames: 3, successful_lights: 8 }, // 10 + 2*8 = 26 -> capped at 20
    random_motes: false,
    random_shades: false,
    motes: [{ id: "M1", pos: [0, 0, 0.5] }]
  }));
  const outCapPath = path.join(TEMP_DIR, 'out_capacity_cap.jsonl');
  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenarioCapPath}" --ticks 5 --snapshot-every 5 --out "${outCapPath}"`, { cwd: ROOT_DIR });
  const linesCap = fs.readFileSync(outCapPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const snapCap = linesCap.filter(l => l.type === 'snapshot').pop();
  if (snapCap.player.capacity !== 20) throw new Error(`capacity kỳ vọng trần 20, nhận ${snapCap.player.capacity}`);
  if (snapCap.player.carried !== 20) throw new Error("Nhặt vượt trần sức chứa 20!");
});

// 18. Shade Drain & Pulse +15 Score Test
runTest("[Phase 3] Bóng Mực hút dầu & Thưởng điểm Tỏa Sáng khi đang hút (+15)", () => {
  // Part A: Shade draining emits fuel_drain event every 60 ticks
  const drainScenarioPath = path.join(TEMP_DIR, 'scenario_fuel_drain_evt.json');
  fs.writeFileSync(drainScenarioPath, JSON.stringify({
    player: { pos: [30, 0, 30], carried: 0, flames: 3 }, // Far away (> 18m)
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [
      { id: "S1", pos: [0, 0, 1.5], state: "drain", target_lantern_id: "L1" }
    ],
    lanterns: [
      { id: "L1", pos: [0, 0, 0], lit: true, fuel: 25.0 }
    ]
  }));
  const outDrainEvtPath = path.join(TEMP_DIR, 'out_drain_evt.jsonl');
  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${drainScenarioPath}" --ticks 65 --out "${outDrainEvtPath}"`, { cwd: ROOT_DIR });
  const drainLines = fs.readFileSync(outDrainEvtPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const drainEvt = drainLines.find(l => l.type === 'event' && l.name === 'fuel_drain');
  if (!drainEvt) throw new Error("Không phát sinh sự kiện fuel_drain sau 60 tick hút");
  if (drainEvt.data.lantern_id !== 'L1' || drainEvt.data.shade_id !== 'S1') {
    throw new Error(`Dữ liệu fuel_drain sai: ${JSON.stringify(drainEvt.data)}`);
  }

  // Part B: Pulse on draining shade awards +15 score
  const scenarioPath = path.join(TEMP_DIR, 'scenario_drain_pulse.json');
  const inputsPath = path.join(TEMP_DIR, 'inputs_drain_pulse.json');
  fs.writeFileSync(scenarioPath, JSON.stringify({
    player: { pos: [0, 0, 1.0], carried: 3, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [
      { id: "S1", pos: [0, 0, 1.5], state: "drain", target_lantern_id: "L1" }
    ],
    lanterns: [
      { id: "L1", pos: [0, 0, 0], lit: true, fuel: 25.0 }
    ]
  }));
  // Fire pulse on tick 0
  fs.writeFileSync(inputsPath, JSON.stringify({
    frames: [{ tick: 0, pulse: true }]
  }));
  const outPath = path.join(TEMP_DIR, 'out_drain.jsonl');

  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${scenarioPath}" --inputs "${inputsPath}" --ticks 5 --snapshot-every 5 --out "${outPath}"`, { cwd: ROOT_DIR });
  const lines = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const pulseEvt = lines.find(l => l.type === 'event' && l.name === 'pulse');
  if (!pulseEvt) throw new Error("Không phát sinh sự kiện pulse");
  if (!pulseEvt.data.stunned_ids.includes('S1')) throw new Error("S1 không bị choáng bởi Tỏa Sáng");

  const endSnap = lines.filter(l => l.type === 'snapshot').pop();
  if (endSnap.score < 15) throw new Error(`Điểm khi choáng Bóng Mực đang drain kỳ vọng ≥ 15, nhận ${endSnap.score}`);
});

// 19. New Win & Loss Conditions (Dawn Survival vs Dawn Loss vs No Early Win)
runTest("[Phase 3] Luật thắng mới - Bình minh (Dawn survival, no early win, dawn loss)", () => {
  // Case A: Win at dawn when lit >= ceil(0.6 * total) -> 3/5 lit on Night 1
  const winScenario = path.join(TEMP_DIR, 'scenario_win_dawn.json');
  fs.writeFileSync(winScenario, JSON.stringify({
    time_left_s: 0.05, // 3 ticks left
    player: { pos: [0, 0, 0], carried: 0, flames: 2 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [],
    lanterns: [
      { id: "L1", pos: [10, 0, 0], lit: true, fuel: 80.0 },
      { id: "L2", pos: [20, 0, 0], lit: true, fuel: 60.0 },
      { id: "L3", pos: [30, 0, 0], lit: true, fuel: 40.0 },
      { id: "L4", pos: [-10, 0, 0], lit: false, deposited: 0 },
      { id: "L5", pos: [-20, 0, 0], lit: false, deposited: 0 }
    ]
  }));
  const outWinPath = path.join(TEMP_DIR, 'out_win_dawn.jsonl');
  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${winScenario}" --ticks 5 --out "${outWinPath}"`, { cwd: ROOT_DIR });
  const winLines = fs.readFileSync(outWinPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const winEvt = winLines.find(l => l.type === 'event' && l.name === 'game_over');
  if (!winEvt) throw new Error("Không phát sinh sự kiện game_over tại bình minh");
  if (winEvt.data.result !== 'won' || winEvt.data.reason !== 'dawn_survived') {
    throw new Error(`Kết quả thắng kỳ vọng won / dawn_survived, nhận ${JSON.stringify(winEvt.data)}`);
  }

  // Case B: No early win when all 5/5 lanterns are lit
  const allLitScenario = path.join(TEMP_DIR, 'scenario_all_lit_no_early_win.json');
  fs.writeFileSync(allLitScenario, JSON.stringify({
    time_left_s: 100.0,
    player: { pos: [0, 0, 0], carried: 0, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [],
    lanterns: [
      { id: "L1", pos: [10, 0, 0], lit: true, fuel: 100 },
      { id: "L2", pos: [20, 0, 0], lit: true, fuel: 100 },
      { id: "L3", pos: [30, 0, 0], lit: true, fuel: 100 },
      { id: "L4", pos: [-10, 0, 0], lit: true, fuel: 100 },
      { id: "L5", pos: [-20, 0, 0], lit: true, fuel: 100 }
    ]
  }));
  const outNoEarlyPath = path.join(TEMP_DIR, 'out_no_early_win.jsonl');
  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${allLitScenario}" --ticks 10 --out "${outNoEarlyPath}"`, { cwd: ROOT_DIR });
  const noEarlyLines = fs.readFileSync(outNoEarlyPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const earlyWinEvt = noEarlyLines.find(l => l.type === 'event' && l.name === 'game_over');
  if (earlyWinEvt) throw new Error("Luật cũ vi phạm: game kết thúc sớm khi tất cả đèn sáng!");

  // Case C: Loss at dawn when lit < ceil(0.6 * total) -> only 2/5 lit
  const loseDawnScenario = path.join(TEMP_DIR, 'scenario_lose_dawn.json');
  fs.writeFileSync(loseDawnScenario, JSON.stringify({
    time_left_s: 0.05,
    player: { pos: [0, 0, 0], carried: 0, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [],
    lanterns: [
      { id: "L1", pos: [10, 0, 0], lit: true, fuel: 80.0 },
      { id: "L2", pos: [20, 0, 0], lit: true, fuel: 60.0 },
      { id: "L3", pos: [30, 0, 0], lit: false, deposited: 0 },
      { id: "L4", pos: [-10, 0, 0], lit: false, deposited: 0 },
      { id: "L5", pos: [-20, 0, 0], lit: false, deposited: 0 }
    ]
  }));
  const outLosePath = path.join(TEMP_DIR, 'out_lose_dawn.jsonl');
  execSync(`node src/headless.js --seed 100 --night 1 --scenario "${loseDawnScenario}" --ticks 5 --out "${outLosePath}"`, { cwd: ROOT_DIR });
  const loseLines = fs.readFileSync(outLosePath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const loseEvt = loseLines.find(l => l.type === 'event' && l.name === 'game_over');
  if (!loseEvt) throw new Error("Không phát sinh sự kiện game_over khi hết giờ với < 60% đèn");
  if (loseEvt.data.result !== 'lost' || loseEvt.data.reason !== 'dawn') {
    throw new Error(`Kết quả thua kỳ vọng lost / dawn, nhận ${JSON.stringify(loseEvt.data)}`);
  }
});

// 20. Phase 4: Soak Test (Consecutive nights, 0 crashes, mem ratio <= 1.2)
runTest("Phase 4: Soak test nhiều Đêm liên tiếp không crash, rò rỉ bộ nhớ <= 20%", () => {
  const outSoakPath = path.join(TEMP_DIR, 'test_soak_run.json');
  execSync(`node --expose-gc src/soak.js --seed 7 --nights 3 --out "${outSoakPath}"`, { cwd: ROOT_DIR });
  if (!fs.existsSync(outSoakPath)) throw new Error("File test_soak_run.json không được tạo!");
  const data = JSON.parse(fs.readFileSync(outSoakPath, 'utf8'));
  if (data.crashes !== 0) throw new Error(`Số crash kỳ vọng 0, nhận ${data.crashes}`);
  if (data.nights !== 3) throw new Error(`Số đêm kỳ vọng 3, nhận ${data.nights}`);
  if (!Array.isArray(data.results) || data.results.length !== 3) throw new Error("Danh sách results không đủ 3 đêm");
  const memRatio = data.mem_end_mb / data.mem_start_mb;
  if (memRatio > 1.2) throw new Error(`Tỉ lệ tăng bộ nhớ vượt quá 20%: ${memRatio.toFixed(3)}`);
});

// 21. Phase 4: Benchmark Mode (Standard scene, FPS thresholds, load_ms <= 10000)
runTest("Phase 4: Chế độ benchmark chuẩn hóa đạt avg_fps >= 60, load_ms <= 10000", () => {
  const outBenchPath = path.join(TEMP_DIR, 'test_bench_run.json');
  execSync(`node src/bench.js --seed 42 --duration 2 --out "${outBenchPath}"`, { cwd: ROOT_DIR });
  if (!fs.existsSync(outBenchPath)) throw new Error("File test_bench_run.json không được tạo!");
  const data = JSON.parse(fs.readFileSync(outBenchPath, 'utf8'));
  if (data.contract_version !== '1.3') throw new Error(`contract_version kỳ vọng 1.3, nhận ${data.contract_version}`);
  if (typeof data.avg_fps !== 'number' || data.avg_fps < 60) throw new Error(`avg_fps kỳ vọng >= 60, nhận ${data.avg_fps}`);
  if (typeof data.p1_low_fps !== 'number' || data.p1_low_fps < 30) throw new Error(`p1_low_fps kỳ vọng >= 30, nhận ${data.p1_low_fps}`);
  if (typeof data.load_ms !== 'number' || data.load_ms > 10000) throw new Error(`load_ms kỳ vọng <= 10000, nhận ${data.load_ms}`);
  if (!data.frames || data.frames < 60) throw new Error(`frames quá thấp: ${data.frames}`);
});

// 22. Phase 4: Leaderboard CLI Export (--export-leaderboard)
runTest("Phase 4: Xuất bảng xếp hạng qua CLI (--export-leaderboard out.json)", () => {
  const outLbPath = path.join(TEMP_DIR, 'test_lb_export.json');
  execSync(`node server.js --export-leaderboard "${outLbPath}"`, { cwd: ROOT_DIR });
  if (!fs.existsSync(outLbPath)) throw new Error("File test_lb_export.json không được tạo!");
  const raw = JSON.parse(fs.readFileSync(outLbPath, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.entries;
  if (!Array.isArray(list)) throw new Error("Leaderboard export không phải là mảng");
  if (list.length > 10) throw new Error(`Leaderboard vượt quá 10 mục: ${list.length}`);
});

console.log(`\n======================================================`);
console.log(`🎉 KẾT QUẢ: Đạt ${passed}/${total} bài kiểm thử.`);
console.log(`======================================================\n`);

if (passed !== total) {
  process.exit(1);
}
