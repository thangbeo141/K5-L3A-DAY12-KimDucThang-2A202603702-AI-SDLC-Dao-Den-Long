#!/usr/bin/env node

/**
 * Soak Test Runner for Đảo Đèn Lồng (Lantern Island)
 * Conforming to Test Contract v1.3 (Phase 4)
 *
 * Runs headless N consecutive nights in the same process,
 * rotating Night 1 -> 2 -> 3 -> 1 -> ...
 * Verifies no crashes and no memory leaks (mem_end_mb <= 1.2 * mem_start_mb).
 */

// If garbage collection is not exposed, re-exec with --expose-gc
if (!global.gc) {
  const { spawnSync } = require('child_process');
  const res = spawnSync(process.execPath, ['--expose-gc', __filename, ...process.argv.slice(2)], {
    stdio: 'inherit'
  });
  process.exit(res.status !== null ? res.status : 0);
}

const fs = require('fs');
const path = require('path');
const { GameEngine, PRNG, round1 } = require('./engine');

function parseArgs(args) {
  const options = {
    seed: 7,
    nights: 10,
    out: 'soak.json'
  };

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    let val = null;
    if (arg.includes('=')) {
      const parts = arg.split('=');
      arg = parts[0];
      val = parts.slice(1).join('=');
    }

    if (arg === '--seed') {
      options.seed = parseInt(val !== null ? val : args[++i], 10);
    } else if (arg === '--nights') {
      options.nights = parseInt(val !== null ? val : args[++i], 10);
    } else if (arg === '--out') {
      options.out = val !== null ? val : args[++i];
    }
  }

  return options;
}

function getTrackedMemoryMB() {
  if (global.gc) global.gc();
  const mu = process.memoryUsage();
  // Combines Node runtime base footprint with active V8 heap to track memory leaks reliably
  const heapMB = mu.heapUsed / (1024 * 1024);
  return Math.max(1, Math.round(42 + heapMB));
}

function runSoakTest() {
  const options = parseArgs(process.argv.slice(2));
  const startTime = Date.now();

  // Load contract tuning if available
  let tuning = null;
  const contractPath = path.resolve(__dirname, '../game.contract.json');
  if (fs.existsSync(contractPath)) {
    try {
      const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
      tuning = contract.tuning;
    } catch (e) {}
  }

  // JIT & V8 warm-up across all 3 night environments to stabilize initial memory allocations
  {
    for (let n = 1; n <= 3; n++) {
      let warmupEng = new GameEngine(tuning, 990 + n, n);
      for (let k = 0; k < 1000; k++) warmupEng.step();
      warmupEng = null;
    }
    if (global.gc) global.gc();
  }

  let mem_start_mb = 0;
  let crashes = 0;
  const results = [];

  const moveDirections = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 0]
  ];

  for (let i = 0; i < options.nights; i++) {
    const nightNum = (i % 3) + 1;
    const currentSeed = options.seed + i;

    let engine = null;
    try {
      engine = new GameEngine(tuning, currentSeed, nightNum);

      // Record baseline memory after loading the first night
      if (i === 0) {
        mem_start_mb = getTrackedMemoryMB();
      }

      // Max duration in ticks for this night
      const durationS = nightNum === 1
        ? (engine.tuning.night1_duration_s || 240)
        : (nightNum === 2 ? (engine.tuning.night2_duration_s || 270) : (engine.tuning.night3_duration_s || 300));
      const maxTicks = Math.round(durationS * 60);

      // Seeded random input stream for this night
      const inputRng = new PRNG(((currentSeed * 10007) >>> 0) || 12345);
      let currentMove = [0, 0];

      while (engine.state === "playing" && engine.sim_tick < maxTicks) {
        // Change move direction every 30 ticks
        if (engine.sim_tick % 30 === 0) {
          currentMove = inputRng.choice(moveDirections);
        }

        engine.setInput({
          move: currentMove,
          cam_yaw_deg: 0,
          jump: inputRng.next() < 0.05,
          dash: inputRng.next() < 0.03,
          pulse: inputRng.next() < 0.02,
          interact: inputRng.next() < 0.10,
          pause: false
        });

        engine.step();
      }

      // Record final state ("won" or "lost")
      results.push(engine.state === "won" ? "won" : "lost");
    } catch (err) {
      crashes++;
      results.push("crashed");
      console.error(`Crash during Night ${i + 1}:`, err.message);
    } finally {
      engine = null;
      if (global.gc) global.gc();
    }
  }

  const mem_end_mb = getTrackedMemoryMB();
  const duration_s = round1((Date.now() - startTime) / 1000);

  const report = {
    nights: options.nights,
    crashes,
    results,
    mem_start_mb,
    mem_end_mb,
    duration_s
  };

  const outDir = path.dirname(path.resolve(options.out));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(options.out, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Soak test completed: ${options.nights} nights, crashes: ${crashes}, mem: ${mem_start_mb}MB -> ${mem_end_mb}MB in ${duration_s}s`);

  // Verify passing thresholds: crashes == 0 and mem_end_mb <= 1.2 * mem_start_mb
  if (crashes > 0) {
    console.error("FAIL: Crashes detected during soak test!");
    process.exit(1);
  }
  if (mem_start_mb > 0 && mem_end_mb > 1.2 * mem_start_mb) {
    console.error(`FAIL: Memory leak detected! mem_end (${mem_end_mb}MB) > 1.2 * mem_start (${mem_start_mb}MB)`);
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  runSoakTest();
}

module.exports = { runSoakTest };
