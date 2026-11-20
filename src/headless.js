#!/usr/bin/env node

/**
 * Headless Runner for Đảo Đèn Lồng (Lantern Island)
 * Conforming strictly to Test Contract v1.0
 */

const fs = require('fs');
const path = require('path');
const { GameEngine } = require('./engine');

function parseArgs(args) {
  const options = {
    seed: 42,
    night: 1,
    scenario: null,
    inputs: null,
    ticks: 0,
    out: null,
    snapshot_every: 10
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--seed' && i + 1 < args.length) {
      options.seed = parseInt(args[++i], 10);
    } else if (arg === '--night' && i + 1 < args.length) {
      options.night = parseInt(args[++i], 10);
    } else if (arg === '--scenario' && i + 1 < args.length) {
      options.scenario = args[++i];
    } else if (arg === '--inputs' && i + 1 < args.length) {
      options.inputs = args[++i];
    } else if (arg === '--ticks' && i + 1 < args.length) {
      options.ticks = parseInt(args[++i], 10);
    } else if (arg === '--out' && i + 1 < args.length) {
      options.out = args[++i];
    } else if (arg === '--snapshot-every' && i + 1 < args.length) {
      options.snapshot_every = parseInt(args[++i], 10);
    }
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.out || isNaN(options.ticks) || options.ticks < 0) {
    console.error("Usage: node src/headless.js --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>] --ticks <int> --out <file.jsonl> [--snapshot-every <int>]");
    process.exit(1);
  }

  // Load contract tuning
  let tuning = null;
  const contractPath = path.resolve(__dirname, '../game.contract.json');
  if (fs.existsSync(contractPath)) {
    try {
      const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
      tuning = contract.tuning;
    } catch (e) {
      console.error("Failed to parse game.contract.json:", e.message);
      process.exit(1);
    }
  }

  // Load scenario if provided
  let scenario = null;
  if (options.scenario) {
    try {
      const content = fs.readFileSync(options.scenario, 'utf8');
      scenario = JSON.parse(content);
    } catch (e) {
      console.error("Invalid scenario file format:", e.message);
      process.exit(2);
    }
  }

  // Load inputs if provided
  let inputsMap = new Map();
  if (options.inputs) {
    try {
      const content = fs.readFileSync(options.inputs, 'utf8');
      const parsedInputs = JSON.parse(content);
      if (!parsedInputs || !Array.isArray(parsedInputs.frames)) {
        console.error("Invalid inputs file format: 'frames' array missing");
        process.exit(2);
      }
      let lastTick = -1;
      for (const frame of parsedInputs.frames) {
        if (typeof frame.tick !== 'number' || frame.tick <= lastTick) {
          console.error("Invalid inputs file format: frame ticks must strictly increase");
          process.exit(2);
        }
        lastTick = frame.tick;
        inputsMap.set(frame.tick, frame);
      }
    } catch (e) {
      console.error("Invalid inputs file format:", e.message);
      process.exit(2);
    }
  }

  const engine = new GameEngine(tuning, options.seed);
  engine.applyScenario(scenario);

  const outLines = [];

  // Snapshot tick 0: initial state after scenario setup, before tick 0 input
  outLines.push(JSON.stringify(engine.getSnapshot()));

  const totalSteps = options.ticks;
  let stepsRun = 0;

  for (let k = 0; k < totalSteps; k++) {
    // If input frame exists for tick k, apply it
    if (inputsMap.has(k)) {
      engine.setInput(inputsMap.get(k));
    }

    const events = engine.step();
    stepsRun = k + 1;

    // Output any events that happened during step k (tick = k + 1)
    for (const evt of events) {
      outLines.push(JSON.stringify(evt));
    }

    // Output snapshot every N ticks
    if (stepsRun % options.snapshot_every === 0) {
      outLines.push(JSON.stringify(engine.getSnapshot()));
    }

    // Check if game has ended
    if (engine.state !== "playing") {
      break;
    }
  }

  // Final End record
  const endRecord = {
    type: "end",
    ticks: stepsRun,
    state: engine.state,
    score: engine.score
  };
  outLines.push(JSON.stringify(endRecord));

  // Write out to file
  const outDir = path.dirname(path.resolve(options.out));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(options.out, outLines.join('\n') + '\n', 'utf8');

  process.exit(0);
}

if (require.main === module) {
  main();
}
