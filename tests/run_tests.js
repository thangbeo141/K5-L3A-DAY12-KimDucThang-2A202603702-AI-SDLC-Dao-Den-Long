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

console.log(`\n======================================================`);
console.log(`🎉 KẾT QUẢ: Đạt ${passed}/${total} bài kiểm thử.`);
console.log(`======================================================\n`);

if (passed !== total) {
  process.exit(1);
}
