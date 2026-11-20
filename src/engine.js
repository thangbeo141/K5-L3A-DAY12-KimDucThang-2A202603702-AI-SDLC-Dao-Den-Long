/**
 * Core Deterministic Game Engine for Đảo Đèn Lồng (Lantern Island)
 * Conforming strictly to Test Contract v1.1 (Phase 2 - "Ba hòn đảo")
 */

class PRNG {
  constructor(seed) {
    this.seed = (seed >>> 0) || 123456789;
  }

  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  choice(arr) {
    if (!arr || arr.length === 0) return null;
    const idx = Math.floor(this.next() * arr.length);
    return arr[idx];
  }
}

function round3(n) {
  if (typeof n !== 'number' || isNaN(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

// Maps definitions
function getNight1Map() {
  const lanterns = [
    { id: "L1", pos: [0.0, 0.0, 25.0], lit: false, deposited: 0 },
    { id: "L2", pos: [23.8, 0.0, 7.7], lit: false, deposited: 0 },
    { id: "L3", pos: [14.7, 0.0, -20.2], lit: false, deposited: 0 },
    { id: "L4", pos: [-14.7, 0.0, -20.2], lit: false, deposited: 0 },
    { id: "L5", pos: [-23.8, 0.0, 7.7], lit: false, deposited: 0 }
  ];

  const moteSpawnPoints = [];
  // 8 points on R=12m (every 45°)
  for (let i = 0; i < 8; i++) {
    const ang = i * (Math.PI / 4);
    moteSpawnPoints.push([round3(12.0 * Math.cos(ang)), 0.0, round3(12.0 * Math.sin(ang))]);
  }
  // 16 points on R=33m (every 22.5°)
  for (let i = 0; i < 16; i++) {
    const ang = i * (Math.PI / 8);
    moteSpawnPoints.push([round3(33.0 * Math.cos(ang)), 0.0, round3(33.0 * Math.sin(ang))]);
  }

  const shadeSpawnPoints = [];
  // 12 points on R=37m (15°, 45°, ...)
  for (let i = 0; i < 12; i++) {
    const ang = (15 + i * 30) * (Math.PI / 180);
    shadeSpawnPoints.push([round3(37.0 * Math.cos(ang)), 0.0, round3(37.0 * Math.sin(ang))]);
  }

  return {
    night: 1,
    duration_s: 300,
    start_pos: [0.0, 0.0, 0.0],
    lanterns,
    moteSpawnPoints,
    shadeSpawnPoints,
    maxShades: 6,
    shadeSpawnIntervalTicks: 480, // 8s
    charms: [],
    launchPads: []
  };
}

function getNight2Map() {
  const lanterns = [
    { id: "L1", pos: [0.0, 0.0, 20.0], lit: false, deposited: 0 },
    { id: "L2", pos: [17.0, 0.0, -10.0], lit: false, deposited: 0 },
    { id: "L3", pos: [-17.0, 0.0, -10.0], lit: false, deposited: 0 },
    { id: "L4", pos: [70.0, 0.0, 20.0], lit: false, deposited: 0 },
    { id: "L5", pos: [87.0, 0.0, -10.0], lit: false, deposited: 0 },
    { id: "L6", pos: [53.0, 0.0, -10.0], lit: false, deposited: 0 }
  ];

  const moteSpawnPoints = [];
  // Island A (0,0)
  for (let i = 0; i < 4; i++) {
    const ang = i * (Math.PI / 2);
    moteSpawnPoints.push([round3(10.0 * Math.cos(ang)), 0.0, round3(10.0 * Math.sin(ang))]);
  }
  for (let i = 0; i < 8; i++) {
    const ang = i * (Math.PI / 4);
    moteSpawnPoints.push([round3(22.0 * Math.cos(ang)), 0.0, round3(22.0 * Math.sin(ang))]);
  }
  // Island B (70,0)
  for (let i = 0; i < 4; i++) {
    const ang = i * (Math.PI / 2);
    moteSpawnPoints.push([round3(70.0 + 10.0 * Math.cos(ang)), 0.0, round3(10.0 * Math.sin(ang))]);
  }
  for (let i = 0; i < 8; i++) {
    const ang = i * (Math.PI / 4);
    moteSpawnPoints.push([round3(70.0 + 22.0 * Math.cos(ang)), 0.0, round3(22.0 * Math.sin(ang))]);
  }

  const shadeSpawnPoints = [];
  // 8 points R=26m around A (22.5°, 67.5°, ...)
  for (let i = 0; i < 8; i++) {
    const ang = (22.5 + i * 45) * (Math.PI / 180);
    shadeSpawnPoints.push([round3(26.0 * Math.cos(ang)), 0.0, round3(26.0 * Math.sin(ang))]);
  }
  // 8 points R=26m around B (22.5°, 67.5°, ...)
  for (let i = 0; i < 8; i++) {
    const ang = (22.5 + i * 45) * (Math.PI / 180);
    shadeSpawnPoints.push([round3(70.0 + 26.0 * Math.cos(ang)), 0.0, round3(26.0 * Math.sin(ang))]);
  }

  const launchPads = [
    {
      pos: [20.0, 0.0, 18.0],
      target: [70.0, 0.0, 0.0],
      vel_y: 14.0,
      speed_xz: 24.0
    },
    {
      pos: [50.0, 0.0, -18.0],
      target: [0.0, 0.0, 0.0],
      vel_y: 14.0,
      speed_xz: 24.0
    }
  ];

  const charms = [
    { id: "C1", pos: [35.0, 0.0, 0.0], available: true, respawn_timer: 0 }
  ];

  return {
    night: 2,
    duration_s: 330,
    start_pos: [0.0, 0.0, 0.0],
    lanterns,
    moteSpawnPoints,
    shadeSpawnPoints,
    maxShades: 8,
    shadeSpawnIntervalTicks: 420, // 7s
    charms,
    launchPads
  };
}

function getNight3Map() {
  const lanterns = [
    { id: "L1", pos: [0.0, 6.0, 6.0], lit: false, deposited: 0 },
    { id: "L2", pos: [18.0, 3.0, 10.0], lit: false, deposited: 0 },
    { id: "L3", pos: [-18.0, 3.0, 10.0], lit: false, deposited: 0 },
    { id: "L4", pos: [35.0, 0.0, -10.0], lit: false, deposited: 0 },
    { id: "L5", pos: [-35.0, 0.0, -10.0], lit: false, deposited: 0 },
    { id: "L6", pos: [20.0, 0.0, -35.0], lit: false, deposited: 0 },
    { id: "L7", pos: [-20.0, 0.0, -35.0], lit: false, deposited: 0 }
  ];

  const moteSpawnPoints = [];
  // Tier 0 (Y=0): 18 points on R=34m (every 20° from 0°)
  for (let i = 0; i < 18; i++) {
    const ang = i * 20 * (Math.PI / 180);
    moteSpawnPoints.push([round3(34.0 * Math.cos(ang)), 0.0, round3(34.0 * Math.sin(ang))]);
  }
  // Tier 1 (Y=3): 8 points on R=18m (20°, 40°, ..., 160°)
  for (let i = 1; i <= 8; i++) {
    const ang = i * 20 * (Math.PI / 180);
    moteSpawnPoints.push([round3(18.0 * Math.cos(ang)), 3.0, round3(18.0 * Math.sin(ang))]);
  }
  // Tier 2 (Y=6): 4 points on R=5m (45°, 135°, 225°, 315°)
  for (const deg of [45, 135, 225, 315]) {
    const ang = deg * (Math.PI / 180);
    moteSpawnPoints.push([round3(5.0 * Math.cos(ang)), 6.0, round3(5.0 * Math.sin(ang))]);
  }

  const shadeSpawnPoints = [];
  // 16 points on R=43m (every 22.5°)
  for (let i = 0; i < 16; i++) {
    const ang = i * 22.5 * (Math.PI / 180);
    shadeSpawnPoints.push([round3(43.0 * Math.cos(ang)), 0.0, round3(43.0 * Math.sin(ang))]);
  }

  const launchPads = [
    {
      pos: [0.0, 3.0, 13.0],
      target: [0.0, 6.0, 5.0], // Launches towards -Z to land on Tier 2
      vel_y: 12.0,
      speed_xz: 8.0,
      dir: [0.0, -1.0] // purely in -Z
    }
  ];

  const charms = [
    { id: "C1", pos: [30.0, 0.0, 25.0], available: true, respawn_timer: 0 },
    { id: "C2", pos: [-30.0, 0.0, 25.0], available: true, respawn_timer: 0 }
  ];

  return {
    night: 3,
    duration_s: 360,
    start_pos: [0.0, 0.0, -20.0],
    lanterns,
    moteSpawnPoints,
    shadeSpawnPoints,
    maxShades: 10,
    shadeSpawnIntervalTicks: 360, // 6s
    charms,
    launchPads
  };
}

class GameEngine {
  constructor(contractTuning, seed = 42, night = 1) {
    this.night = Math.min(3, Math.max(1, parseInt(night, 10) || 1));
    this.tuning = Object.assign({
      player_speed: 6.0,
      player_accel_time_s: 0.1,
      jump_vel: 7.0,
      gravity: -20.0,
      dash_speed: 14.0,
      dash_duration_s: 0.2,
      dash_cooldown_s: 1.5,
      carry_capacity: 10,
      pickup_radius_xz: 1.0,
      pickup_height_diff: 1.5,
      lantern_cost: 10,
      interact_radius: 2.0,
      safe_radius: 6.0,
      safe_push_ticks: 30,
      pulse_cost: 3,
      pulse_radius: 5.0,
      pulse_cooldown_s: 3.0,
      pulse_stun_ticks: 120,
      pulse_push_m: 4.0,
      pulse_push_ticks: 15,
      shade_speed_night1_2: 4.0,
      shade_speed_night3: 4.5,
      shade_detect_radius: 12.0,
      shade_lose_radius: 18.0,
      shade_hit_radius_xz: 1.0,
      shade_hit_height_diff: 1.5,
      shade_recoil_m: 2.0,
      shade_recoil_ticks: 60,
      invuln_ticks: 90,
      hit_drop_ratio: 0.5,
      dropped_mote_ttl_ticks: 480,
      fall_y_threshold: -10.0,
      fall_wait_ticks: 60,
      flames: 3,
      night1_duration_s: 300,
      night2_duration_s: 330,
      night3_duration_s: 360,
      drifter_speed: 7.0,
      drifter_idle_speed: 2.0,
      drifter_steal_max: 3,
      charm_duration_ticks: 600,
      charm_respawn_ticks: 2700,
      charm_player_speed: 7.2,
      score: {
        per_mote: 10,
        per_lantern: 100,
        per_stun: 5,
        per_second_left: 2,
        per_flame_left: 50
      }
    }, contractTuning || {});

    this.rng = new PRNG(seed);
    this.current_tick = 0;
    this.sim_tick = 0;
    this.state = "playing"; // "playing" | "paused" | "won" | "lost"
    this.score = 0;

    // Load Map config
    this.mapData = this.getMapData(this.night);
    const nightDuration = this.night === 1
      ? this.tuning.night1_duration_s
      : (this.night === 2 ? this.tuning.night2_duration_s : this.tuning.night3_duration_s);
    this.time_left_s = nightDuration;

    // Player state
    this.player = {
      pos: [...this.mapData.start_pos],
      vel: [0.0, 0.0, 0.0],
      facing_yaw_deg: 0,
      grounded: true,
      carried: 0,
      flames: this.tuning.flames,
      invuln_timer: 0,
      dash_timer: 0,
      dash_cd_timer: 0,
      dash_dir: [0.0, 0.0],
      pulse_cooldown: 0,
      charm_timer: 0,
      fall_wait_timer: 0,
      in_launch_flight: false
    };

    // World entities
    this.lanterns = JSON.parse(JSON.stringify(this.mapData.lanterns));
    this.motes = [];
    this.next_mote_id = 1;
    this.shades = [];
    this.next_shade_id = 1;
    this.drifters = [];
    this.next_drifter_id = 1;
    this.charms = JSON.parse(JSON.stringify(this.mapData.charms || []));

    // Wind system
    this.wind = {
      enabled: this.night === 3,
      active: false,
      timer: 0,
      dir_deg: 0.0
    };

    // Input state
    this.current_input = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      dash: false,
      interact: false,
      pulse: false,
      pause: false
    };
    this.prev_input = Object.assign({}, this.current_input);
    this.pending_events = [];
    this.has_emitted_night_start = false;

    // Initialize initial motes
    this.initMotesFromPoints(20);
  }

  getMapData(night) {
    if (night === 2) return getNight2Map();
    if (night === 3) return getNight3Map();
    return getNight1Map();
  }

  getGroundHeight(x, z) {
    if (this.night === 1) {
      if (Math.hypot(x, z) <= 40.0) return 0.0;
      return null;
    }

    if (this.night === 2) {
      if (Math.hypot(x, z) <= 28.0) return 0.0;
      if (Math.hypot(x - 70.0, z) <= 28.0) return 0.0;
      if (x >= 26.0 && x <= 44.0 && z >= -2.0 && z <= 2.0) return 0.0; // Bamboo bridge
      return null;
    }

    if (this.night === 3) {
      const r = Math.hypot(x, z);
      if (r > 45.0) return null; // Outside island

      // Tier 2: Disc R <= 8m, Y=6
      if (r <= 8.0) return 6.0;

      // 2 Ramps width 3.2m along 30° and 150° between R=23.5 and R=30.5
      // Check Ramp 1 (30°):
      const ang30 = Math.PI / 6;
      const dot30 = x * Math.cos(ang30) + z * Math.sin(ang30);
      const perp30 = Math.abs(-x * Math.sin(ang30) + z * Math.cos(ang30));
      if (dot30 >= 23.5 && dot30 <= 30.5 && perp30 <= 1.6) {
        if (dot30 <= 24.0) return 3.0;
        const t = (30.0 - dot30) / 6.0;
        return Math.max(0.0, Math.min(3.0, t * 3.0));
      }

      // Check Ramp 2 (150°):
      const ang150 = 5 * Math.PI / 6;
      const dot150 = x * Math.cos(ang150) + z * Math.sin(ang150);
      const perp150 = Math.abs(-x * Math.sin(ang150) + z * Math.cos(ang150));
      if (dot150 >= 23.5 && dot150 <= 30.5 && perp150 <= 1.6) {
        if (dot150 <= 24.0) return 3.0;
        const t = (30.0 - dot150) / 6.0;
        return Math.max(0.0, Math.min(3.0, t * 3.0));
      }

      // Tier 1: Ring R in [11.5, 24.5] with z > 0, Y=3
      if (r >= 11.5 && r <= 24.5 && z > 0) return 3.0;

      // Default Tier 0 (Y=0)
      return 0.0;
    }

    return 0.0;
  }

  initMotesFromPoints(count = 20) {
    const pts = this.mapData.moteSpawnPoints || [];
    const num = Math.min(count, pts.length);
    for (let i = 0; i < num; i++) {
      this.motes.push({
        id: `M${this.next_mote_id++}`,
        pos: [...pts[i]],
        kind: "random",
        ttl_ticks: -1
      });
    }
  }

  applyScenario(scenario) {
    if (!scenario) return;

    if (scenario.time_left_s !== undefined) {
      this.time_left_s = scenario.time_left_s;
    }

    if (scenario.wind_enabled !== undefined) {
      this.wind.enabled = Boolean(scenario.wind_enabled);
    }

    if (scenario.player) {
      if (scenario.player.pos) this.player.pos = [...scenario.player.pos];
      if (scenario.player.vel) this.player.vel = [...scenario.player.vel];
      if (scenario.player.carried !== undefined) this.player.carried = scenario.player.carried;
      if (scenario.player.flames !== undefined) this.player.flames = scenario.player.flames;
      if (scenario.player.invuln_ticks !== undefined) this.player.invuln_timer = scenario.player.invuln_ticks;
      if (scenario.player.dash_cd_ticks !== undefined) this.player.dash_cd_timer = scenario.player.dash_cd_ticks;
      if (scenario.player.pulse_cd_ticks !== undefined) this.player.pulse_cooldown = scenario.player.pulse_cd_ticks;
      if (scenario.player.charm_ticks !== undefined) this.player.charm_timer = scenario.player.charm_ticks;
    }

    if (scenario.lanterns !== undefined) {
      this.lanterns = scenario.lanterns.map((sl, idx) => ({
        id: sl.id || `L${idx + 1}`,
        pos: sl.pos ? [...sl.pos] : [0, 0, 0],
        deposited: sl.deposited || 0,
        lit: sl.lit !== undefined ? sl.lit : ((sl.deposited || 0) >= this.tuning.lantern_cost)
      }));
    }

    if (scenario.motes !== undefined) {
      this.motes = scenario.motes.map((m, idx) => {
        const pos = Array.isArray(m) ? m : m.pos;
        const id = (!Array.isArray(m) && m.id) ? m.id : `M${idx + 1}`;
        const kind = (!Array.isArray(m) && m.kind) ? m.kind : "random";
        const ttl_s = (!Array.isArray(m) && m.ttl_s !== undefined) ? m.ttl_s : -1;
        const ttl_ticks = ttl_s > 0 ? Math.round(ttl_s * 60) : -1;
        return {
          id,
          pos: [pos[0], pos[1] || 0, pos[2]],
          kind,
          ttl_ticks
        };
      });
    } else if (scenario.random_motes === false) {
      this.motes = [];
    }

    if (scenario.shades !== undefined) {
      this.shades = scenario.shades.map((s, idx) => {
        const pos = Array.isArray(s) ? s : s.pos;
        const id = (!Array.isArray(s) && s.id) ? s.id : `S${idx + 1}`;
        const state = (!Array.isArray(s) && s.state) ? s.state : "chase";
        const state_ticks_left = (!Array.isArray(s) && s.state_ticks_left !== undefined) ? s.state_ticks_left : 0;
        return {
          id,
          pos: [pos[0], pos[1] || 0, pos[2]],
          state,
          state_timer: state_ticks_left,
          push_timer: 0,
          push_dir: [1.0, 0.0],
          evict_timer: 0
        };
      });
    } else if (scenario.random_shades === false) {
      this.shades = [];
    }

    if (scenario.drifters !== undefined) {
      this.drifters = scenario.drifters.map((d, idx) => {
        const pos = Array.isArray(d) ? d : d.pos;
        const id = (!Array.isArray(d) && d.id) ? d.id : `D${idx + 1}`;
        return {
          id,
          pos: [pos[0], pos[1] || 0, pos[2]],
          state: (!Array.isArray(d) && d.state) ? d.state : "idle",
          stolen: (!Array.isArray(d) && d.stolen !== undefined) ? d.stolen : 0,
          flee_timer: 0
        };
      });
    }

    if (scenario.charms !== undefined) {
      this.charms = scenario.charms.map((c, idx) => ({
        id: c.id || `C${idx + 1}`,
        pos: c.pos ? [...c.pos] : [0, 0, 0],
        available: c.available !== undefined ? c.available : true,
        respawn_timer: c.respawn_s !== undefined ? Math.round(c.respawn_s * 60) : 0
      }));
    }
  }

  setInput(newInput) {
    Object.assign(this.current_input, newInput);
  }

  step() {
    this.pending_events = [];
    const next_tick = this.current_tick + 1;

    // Emit night_start once on first active tick
    if (!this.has_emitted_night_start) {
      this.has_emitted_night_start = true;
      this.pending_events.push({
        type: "event",
        tick: next_tick,
        name: "night_start",
        data: { night: this.night }
      });
    }

    // 1. Read input & Pause processing
    const pause_triggered = Boolean(this.current_input.pause) && !Boolean(this.prev_input.pause);
    if (pause_triggered) {
      if (this.state === "playing") {
        this.state = "paused";
        this.pending_events.push({
          type: "event",
          tick: next_tick,
          name: "paused",
          data: {}
        });
      } else if (this.state === "paused") {
        this.state = "playing";
        this.pending_events.push({
          type: "event",
          tick: next_tick,
          name: "resumed",
          data: {}
        });
      }
    }

    if (this.state === "paused") {
      this.current_tick = next_tick;
      this.prev_input = Object.assign({}, this.current_input);
      return this.pending_events;
    }

    if (this.state !== "playing") {
      this.current_tick = next_tick;
      this.prev_input = Object.assign({}, this.current_input);
      return this.pending_events;
    }

    this.sim_tick += 1;

    // 2. Decrement counters
    const dt = 1.0 / 60.0;
    this.time_left_s = Math.max(0, this.time_left_s - dt);

    if (this.player.dash_cd_timer > 0) this.player.dash_cd_timer--;
    if (this.player.pulse_cooldown > 0) this.player.pulse_cooldown--;
    if (this.player.invuln_timer > 0) this.player.invuln_timer--;
    if (this.player.charm_timer > 0) this.player.charm_timer--;
    if (this.player.fall_wait_timer > 0) this.player.fall_wait_timer--;

    // TTL for dropped motes
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      if (m.ttl_ticks > 0) {
        m.ttl_ticks--;
        if (m.ttl_ticks <= 0) {
          this.motes.splice(i, 1);
        }
      }
    }

    // Charm respawn counters
    for (const c of this.charms) {
      if (!c.available) {
        if (c.respawn_timer > 0) {
          c.respawn_timer--;
          if (c.respawn_timer <= 0) {
            c.available = true;
          }
        }
      }
    }

    // Edge triggers
    const jump_triggered = Boolean(this.current_input.jump) && !Boolean(this.prev_input.jump);
    const dash_triggered = Boolean(this.current_input.dash) && !Boolean(this.prev_input.dash);
    const interact_triggered = Boolean(this.current_input.interact) && !Boolean(this.prev_input.interact);
    const pulse_triggered = Boolean(this.current_input.pulse) && !Boolean(this.prev_input.pulse);
    this.prev_input = Object.assign({}, this.current_input);

    // 3. Move Mây (Jump, Dash, Launch Pad, Wind, Fall check)
    if (this.player.fall_wait_timer > 0) {
      // Waiting to respawn from fall
      if (this.player.fall_wait_timer === 1) {
        this.player.pos = [...this.mapData.start_pos];
        this.player.vel = [0.0, 0.0, 0.0];
        this.player.grounded = true;
        this.player.invuln_timer = this.tuning.invuln_ticks;
        this.player.in_launch_flight = false;
      }
    } else {
      // Dash initiation
      if (dash_triggered && this.player.dash_timer <= 0) {
        const canDash = (this.player.charm_timer > 0) || (this.player.dash_cd_timer <= 0);
        if (canDash) {
          this.player.dash_timer = Math.round(this.tuning.dash_duration_s * 60); // 12 ticks
          if (this.player.charm_timer <= 0) {
            this.player.dash_cd_timer = Math.round(this.tuning.dash_cooldown_s * 60); // 90 ticks
          }

          // Direction: move direction or facing direction
          const [mx, mz] = this.current_input.move || [0, 0];
          const rad = ((this.current_input.cam_yaw_deg || 0) * Math.PI) / 180.0;
          let dx = mx * Math.cos(rad) + mz * Math.sin(rad);
          let dz = -mx * Math.sin(rad) + mz * Math.cos(rad);
          const len = Math.hypot(dx, dz);
          if (len > 0.001) {
            this.player.dash_dir = [dx / len, dz / len];
          } else {
            // Facing dir
            const fRad = (this.player.facing_yaw_deg * Math.PI) / 180.0;
            this.player.dash_dir = [Math.sin(fRad), Math.cos(fRad)];
          }

          this.pending_events.push({
            type: "event",
            tick: next_tick,
            name: "dash",
            data: {}
          });
        }
      }

      // Check Launch pads
      if (this.player.grounded && !this.player.in_launch_flight) {
        for (const pad of (this.mapData.launchPads || [])) {
          const dPad = Math.hypot(this.player.pos[0] - pad.pos[0], this.player.pos[2] - pad.pos[2]);
          if (dPad <= 1.0 && Math.abs(this.player.pos[1] - pad.pos[1]) <= 0.5) {
            this.player.in_launch_flight = true;
            this.player.grounded = false;
            this.player.vel[1] = pad.vel_y;
            if (pad.dir) {
              this.player.vel[0] = pad.dir[0] * pad.speed_xz;
              this.player.vel[2] = pad.dir[1] * pad.speed_xz;
            } else if (pad.target) {
              const tx = pad.target[0] - pad.pos[0];
              const tz = pad.target[2] - pad.pos[2];
              const tLen = Math.hypot(tx, tz) || 1.0;
              this.player.vel[0] = (tx / tLen) * pad.speed_xz;
              this.player.vel[2] = (tz / tLen) * pad.speed_xz;
            }
            break;
          }
        }
      }

      // Jumping
      if (jump_triggered && this.player.grounded && this.player.dash_timer <= 0) {
        this.player.vel[1] = this.tuning.jump_vel;
        this.player.grounded = false;
      }

      // Store previous horizontal position for cliff & obstacle collision
      const prev_x = this.player.pos[0];
      const prev_z = this.player.pos[2];

      // Horizontal movement calculation
      if (this.player.dash_timer > 0) {
        // Dashing: horizontal velocity locked to dash speed, vertical maintains current height
        this.player.dash_timer--;
        this.player.pos[0] += this.player.dash_dir[0] * (this.tuning.dash_speed / 60.0);
        this.player.pos[2] += this.player.dash_dir[1] * (this.tuning.dash_speed / 60.0);
        this.player.vel[0] = this.player.dash_dir[0] * this.tuning.dash_speed;
        this.player.vel[2] = this.player.dash_dir[1] * this.tuning.dash_speed;
        this.player.vel[1] = 0.0;
      } else if (this.player.in_launch_flight) {
        // Flight from launch pad
        this.player.pos[0] += this.player.vel[0] / 60.0;
        this.player.pos[2] += this.player.vel[2] / 60.0;
        this.player.vel[1] += this.tuning.gravity / 60.0;
        this.player.pos[1] += this.player.vel[1] / 60.0;
      } else {
        // Normal running & airborne steering
        const runSpeed = (this.player.charm_timer > 0)
          ? this.tuning.charm_player_speed
          : this.tuning.player_speed;

        const [mx, mz] = this.current_input.move || [0, 0];
        let len = Math.hypot(mx, mz);
        let norm_x = mx;
        let norm_z = mz;
        if (len > 1.0) {
          norm_x = mx / len;
          norm_z = mz / len;
        }

        const rad = ((this.current_input.cam_yaw_deg || 0) * Math.PI) / 180.0;
        const target_vx = (norm_x * Math.cos(rad) + norm_z * Math.sin(rad)) * runSpeed;
        const target_vz = (-norm_x * Math.sin(rad) + norm_z * Math.cos(rad)) * runSpeed;

        // Smooth accel/decel (≤ 0.1s = 6 ticks)
        const accelFactor = 1.0 / 6.0;
        this.player.vel[0] += (target_vx - this.player.vel[0]) * accelFactor;
        this.player.vel[2] += (target_vz - this.player.vel[2]) * accelFactor;

        // Apply wind if active
        if (this.wind.active) {
          const wRad = (this.wind.dir_deg * Math.PI) / 180.0;
          this.player.pos[0] += (Math.cos(wRad) * 2.0) / 60.0;
          this.player.pos[2] += (Math.sin(wRad) * 2.0) / 60.0;
        }

        this.player.pos[0] += this.player.vel[0] / 60.0;
        this.player.pos[2] += this.player.vel[2] / 60.0;

        // Facing direction update
        if (len > 0.01) {
          this.player.facing_yaw_deg = (Math.atan2(this.player.vel[0], this.player.vel[2]) * 180.0) / Math.PI;
        }

        // Gravity & Vertical physics
        if (!this.player.grounded) {
          this.player.vel[1] += this.tuning.gravity / 60.0;
          this.player.pos[1] += this.player.vel[1] / 60.0;
        }
      }

      // Ground collision & Cliff blocking
      let groundY = this.getGroundHeight(this.player.pos[0], this.player.pos[2]);

      // Vertical cliff face check: cannot walk up cliffs (> 1.2m higher) unless in launch flight
      if (!this.player.in_launch_flight) {
        if (groundY !== null && groundY > this.player.pos[1] + 1.2) {
          this.player.pos[0] = prev_x;
          this.player.pos[2] = prev_z;
          groundY = this.getGroundHeight(this.player.pos[0], this.player.pos[2]);
        }
        // Bell tower obstacle on Tier 2
        if (this.night === 3 && this.player.pos[1] >= 5.5 && Math.hypot(this.player.pos[0], this.player.pos[2]) < 2.0) {
          this.player.pos[0] = prev_x;
          this.player.pos[2] = prev_z;
          groundY = this.getGroundHeight(this.player.pos[0], this.player.pos[2]);
        }
      }

      if (groundY !== null) {
        if (this.player.pos[1] <= groundY + 0.05 && this.player.vel[1] <= 0) {
          this.player.pos[1] = groundY;
          this.player.vel[1] = 0.0;
          this.player.grounded = true;
          this.player.in_launch_flight = false;
        } else if (this.player.pos[1] > groundY + 0.05) {
          this.player.grounded = false;
        }
      } else {
        this.player.grounded = false;
      }

      // Check Fall off island (Y < -10)
      if (this.player.pos[1] < this.tuning.fall_y_threshold) {
        this.player.flames -= 1;
        const lost = this.player.carried;
        this.player.carried = 0;
        this.player.fall_wait_timer = this.tuning.fall_wait_ticks;
        this.player.in_launch_flight = false;

        this.pending_events.push({
          type: "event",
          tick: next_tick,
          name: "player_hit",
          data: {
            by: "fall",
            flames: this.player.flames,
            dropped: 0,
            lost
          }
        });

        if (this.player.flames <= 0) {
          this.state = "lost";
          this.pending_events.push({
            type: "event",
            tick: next_tick,
            name: "game_over",
            data: { result: "lost", reason: "no_flames" }
          });
        }
      }
    }

    // 4. Pickup Motes & Charms
    if (this.player.fall_wait_timer <= 0 && this.state === "playing") {
      // Motes
      for (let i = this.motes.length - 1; i >= 0; i--) {
        const m = this.motes[i];
        const distXZ = Math.hypot(this.player.pos[0] - m.pos[0], this.player.pos[2] - m.pos[2]);
        const distY = Math.abs(this.player.pos[1] - m.pos[1]);
        if (distXZ <= this.tuning.pickup_radius_xz && distY <= this.tuning.pickup_height_diff) {
          if (this.player.carried < this.tuning.carry_capacity) {
            this.player.carried += 1;
            this.motes.splice(i, 1);
            this.pending_events.push({
              type: "event",
              tick: next_tick,
              name: "mote_picked",
              data: { carried: this.player.carried }
            });
          }
        }
      }

      // Charms
      for (const c of this.charms) {
        if (c.available) {
          const distXZ = Math.hypot(this.player.pos[0] - c.pos[0], this.player.pos[2] - c.pos[2]);
          const distY = Math.abs(this.player.pos[1] - c.pos[1]);
          if (distXZ <= this.tuning.pickup_radius_xz && distY <= this.tuning.pickup_height_diff) {
            c.available = false;
            c.respawn_timer = this.tuning.charm_respawn_ticks;
            this.player.charm_timer = this.tuning.charm_duration_ticks;
            this.pending_events.push({
              type: "event",
              tick: next_tick,
              name: "charm_picked",
              data: { charm_id: c.id, charm_ticks: this.tuning.charm_duration_ticks }
            });
          }
        }
      }
    }

    // 5. Interact with Lanterns
    if (interact_triggered && this.player.fall_wait_timer <= 0 && this.state === "playing") {
      let candidate = null;
      let minD = Infinity;

      for (const lan of this.lanterns) {
        if (!lan.lit) {
          const d = Math.hypot(this.player.pos[0] - lan.pos[0], this.player.pos[2] - lan.pos[2]);
          if (d <= this.tuning.interact_radius) {
            if (d < minD) {
              minD = d;
              candidate = lan;
            } else if (Math.abs(d - minD) < 0.001) {
              if (candidate && lan.id < candidate.id) {
                candidate = lan;
              }
            }
          }
        }
      }

      if (candidate && this.player.carried > 0) {
        const needed = this.tuning.lantern_cost - candidate.deposited;
        const depositAmt = Math.min(this.player.carried, needed);
        if (depositAmt > 0) {
          this.player.carried -= depositAmt;
          candidate.deposited += depositAmt;
          this.score += this.tuning.score.per_mote * depositAmt;

          this.pending_events.push({
            type: "event",
            tick: next_tick,
            name: "deposit",
            data: {
              lantern_id: candidate.id,
              amount: depositAmt,
              deposited: candidate.deposited
            }
          });

          if (candidate.deposited >= this.tuning.lantern_cost) {
            candidate.lit = true;
            this.score += this.tuning.score.per_lantern;
            this.pending_events.push({
              type: "event",
              tick: next_tick,
              name: "lantern_lit",
              data: { lantern_id: candidate.id }
            });

            // Mark shades inside safe zone for eviction push (max 30 ticks)
            for (const s of this.shades) {
              const dShade = Math.hypot(s.pos[0] - candidate.pos[0], s.pos[2] - candidate.pos[2]);
              if (dShade < this.tuning.safe_radius) {
                s.evict_timer = this.tuning.safe_push_ticks;
                const ang = (dShade > 0.001)
                  ? Math.atan2(s.pos[2] - candidate.pos[2], s.pos[0] - candidate.pos[0])
                  : 0.0;
                s.evict_dir = [Math.cos(ang), Math.sin(ang)];
                s.evict_speed = (this.tuning.safe_radius - dShade) / this.tuning.safe_push_ticks;
              }
            }
          }
        }
      }
    }

    // 6. Update Safe Zones
    for (const s of this.shades) {
      if (s.evict_timer > 0) {
        s.evict_timer--;
        s.pos[0] += s.evict_dir[0] * s.evict_speed;
        s.pos[2] += s.evict_dir[1] * s.evict_speed;
      }
    }

    // 7. Pulse (Tỏa Sáng)
    if (pulse_triggered && this.player.fall_wait_timer <= 0 && this.state === "playing") {
      if (this.player.carried >= this.tuning.pulse_cost && this.player.pulse_cooldown <= 0) {
        this.player.carried -= this.tuning.pulse_cost;
        this.player.pulse_cooldown = Math.round(this.tuning.pulse_cooldown_s * 60);

        const pulseCenter = [this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]];
        const stunned_ids = [];

        // Shades
        for (const s of this.shades) {
          const sCenter = [s.pos[0], s.pos[1] + 0.65, s.pos[2]];
          const dist3D = Math.hypot(pulseCenter[0] - sCenter[0], pulseCenter[1] - sCenter[1], pulseCenter[2] - sCenter[2]);
          if (dist3D <= this.tuning.pulse_radius) {
            s.state = "stunned";
            s.state_timer = this.tuning.pulse_stun_ticks;
            s.push_timer = this.tuning.pulse_push_ticks; // 15 ticks

            const dXZ = Math.hypot(s.pos[0] - this.player.pos[0], s.pos[2] - this.player.pos[2]);
            if (dXZ > 0.001) {
              s.push_dir = [(s.pos[0] - this.player.pos[0]) / dXZ, (s.pos[2] - this.player.pos[2]) / dXZ];
            } else {
              s.push_dir = [1.0, 0.0]; // +X
            }

            stunned_ids.push(s.id);
            this.score += this.tuning.score.per_stun;
          }
        }

        // Drifters
        for (const d of this.drifters) {
          const dDist = Math.hypot(pulseCenter[0] - d.pos[0], pulseCenter[1] - d.pos[1], pulseCenter[2] - d.pos[2]);
          if (dDist <= this.tuning.pulse_radius) {
            if (d.state === "chase") {
              d.state = "flee";
              d.flee_timer = 240;
            } else if (d.state === "flee" && d.stolen > 0) {
              // Drops all stolen motes at current spot as dropped motes
              for (let k = 0; k < d.stolen; k++) {
                this.motes.push({
                  id: `M${this.next_mote_id++}`,
                  pos: [d.pos[0], d.pos[1], d.pos[2]],
                  kind: "dropped",
                  ttl_ticks: this.tuning.dropped_mote_ttl_ticks
                });
              }
              this.pending_events.push({
                type: "event",
                tick: next_tick,
                name: "drifter_drop",
                data: { drifter_id: d.id, amount: d.stolen }
              });
              d.stolen = 0;
              d.flee_timer = 120; // Disappears after 120 ticks
            }
          }
        }

        this.pending_events.push({
          type: "event",
          tick: next_tick,
          name: "pulse",
          data: { stunned_ids }
        });
      }
    }

    // 8. Move Shades & Drifters
    const shadeSpeed = (this.night === 3)
      ? this.tuning.shade_speed_night3
      : this.tuning.shade_speed_night1_2;

    for (const s of this.shades) {
      if (s.state === "stunned") {
        if (s.push_timer > 0) {
          s.push_timer--;
          const pushStep = this.tuning.pulse_push_m / this.tuning.pulse_push_ticks;
          s.pos[0] += s.push_dir[0] * pushStep;
          s.pos[2] += s.push_dir[1] * pushStep;
        }
        s.state_timer--;
        if (s.state_timer <= 0) {
          s.state = "wander";
        }
      } else if (s.state === "recoil") {
        s.state_timer--;
        const recoilStep = (this.tuning.shade_recoil_m / this.tuning.shade_recoil_ticks);
        s.pos[0] += s.push_dir[0] * recoilStep;
        s.pos[2] += s.push_dir[1] * recoilStep;
        if (s.state_timer <= 0) {
          s.state = "chase";
        }
      } else if (s.state === "spawning") {
        s.state_timer--;
        if (s.state_timer <= 0) {
          s.state = "wander";
        }
      } else {
        // wander or chase
        const dx = this.player.pos[0] - s.pos[0];
        const dz = this.player.pos[2] - s.pos[2];
        const dist = Math.hypot(dx, dz);

        if (dist <= this.tuning.shade_detect_radius) {
          s.state = "chase";
        } else if (dist > this.tuning.shade_lose_radius) {
          s.state = "wander";
        }

        if (s.state === "chase" && dist > 0.001) {
          const stepDist = shadeSpeed / 60.0;
          let next_x = s.pos[0] + (dx / dist) * Math.min(stepDist, dist);
          let next_z = s.pos[2] + (dz / dist) * Math.min(stepDist, dist);

          // Safe zone block (outside blocked at edge)
          let blocked = false;
          for (const lan of this.lanterns) {
            if (lan.lit) {
              const dLan = Math.hypot(next_x - lan.pos[0], next_z - lan.pos[2]);
              if (dLan < this.tuning.safe_radius) {
                blocked = true;
                const curDLan = Math.hypot(s.pos[0] - lan.pos[0], s.pos[2] - lan.pos[2]);
                if (curDLan >= this.tuning.safe_radius) {
                  const a = Math.atan2(s.pos[2] - lan.pos[2], s.pos[0] - lan.pos[0]);
                  next_x = lan.pos[0] + Math.cos(a) * this.tuning.safe_radius;
                  next_z = lan.pos[2] + Math.sin(a) * this.tuning.safe_radius;
                  blocked = false;
                }
                break;
              }
            }
          }

          if (!blocked && (s.evict_timer || 0) <= 0) {
            s.pos[0] = next_x;
            s.pos[2] = next_z;
          }
        } else if (s.state === "wander" && (s.evict_timer || 0) <= 0) {
          // In wander mode, patrol/wander inwards or roam at 2.0 m/s so shades explore island
          const wanderSpeed = 2.0 / 60.0;
          const distToCenter = Math.hypot(s.pos[0], s.pos[2]);
          let wx = 0, wz = 0;
          if (distToCenter > 15.0) {
            wx = (-s.pos[0] / distToCenter) * wanderSpeed;
            wz = (-s.pos[2] / distToCenter) * wanderSpeed;
          } else {
            const ang = (this.sim_tick * 0.02) + (parseInt(s.id.slice(1)) || 0);
            wx = Math.cos(ang) * wanderSpeed;
            wz = Math.sin(ang) * wanderSpeed;
          }
          let next_x = s.pos[0] + wx;
          let next_z = s.pos[2] + wz;

          // Safe zone check
          let blocked = false;
          for (const lan of this.lanterns) {
            if (lan.lit && Math.hypot(next_x - lan.pos[0], next_z - lan.pos[2]) < this.tuning.safe_radius) {
              blocked = true;
              break;
            }
          }
          if (!blocked) {
            s.pos[0] = next_x;
            s.pos[2] = next_z;
          }
        }
      }

      // Height match
      const gy = this.getGroundHeight(s.pos[0], s.pos[2]);
      if (gy !== null) s.pos[1] = gy;
    }

    // Drifters movement
    for (let i = this.drifters.length - 1; i >= 0; i--) {
      const d = this.drifters[i];
      const distToPlayer = Math.hypot(this.player.pos[0] - d.pos[0], this.player.pos[2] - d.pos[2]);

      if (d.state === "idle") {
        if (this.player.carried >= 5 && distToPlayer <= 15.0) {
          d.state = "chase";
        } else {
          // Slow cruise 2 m/s
          const ang = this.sim_tick * 0.05 + i;
          d.pos[0] += (Math.cos(ang) * this.tuning.drifter_idle_speed) / 60.0;
          d.pos[2] += (Math.sin(ang) * this.tuning.drifter_idle_speed) / 60.0;
        }
      } else if (d.state === "chase") {
        if (this.player.carried < 5 || distToPlayer > 18.0) {
          d.state = "idle";
        } else if (distToPlayer > 0.001) {
          const step = this.tuning.drifter_speed / 60.0;
          d.pos[0] += ((this.player.pos[0] - d.pos[0]) / distToPlayer) * step;
          d.pos[2] += ((this.player.pos[2] - d.pos[2]) / distToPlayer) * step;
        }
      } else if (d.state === "flee") {
        d.flee_timer--;
        if (d.flee_timer <= 0) {
          this.drifters.splice(i, 1);
          continue;
        }
        // Flies away from Mây at 7 m/s
        if (distToPlayer > 0.001) {
          const step = this.tuning.drifter_speed / 60.0;
          d.pos[0] += ((d.pos[0] - this.player.pos[0]) / distToPlayer) * step;
          d.pos[2] += ((d.pos[2] - this.player.pos[2]) / distToPlayer) * step;
        }
      }
    }

    // 9. Touch: Drifters steal first, then Shades deal hit
    // Drifters steal
    if (this.player.fall_wait_timer <= 0 && this.state === "playing") {
      for (const d of this.drifters) {
        if (d.state === "chase") {
          const distXZ = Math.hypot(this.player.pos[0] - d.pos[0], this.player.pos[2] - d.pos[2]);
          if (distXZ <= 1.2) {
            const stealAmt = Math.min(this.tuning.drifter_steal_max, this.player.carried);
            this.player.carried -= stealAmt;
            d.stolen += stealAmt;
            d.state = "flee";
            d.flee_timer = 240;

            this.pending_events.push({
              type: "event",
              tick: next_tick,
              name: "drifter_steal",
              data: {
                drifter_id: d.id,
                amount: stealAmt,
                carried: this.player.carried
              }
            });
          }
        }
      }

      // Shades hit (max 1 hit per tick, sorted by id ascending)
      const sortedShades = [...this.shades].sort((a, b) => a.id.localeCompare(b.id));
      let hitDealtThisTick = false;
      const isPlayerSafe = this.lanterns.some(l => l.lit && Math.hypot(this.player.pos[0] - l.pos[0], this.player.pos[2] - l.pos[2]) < this.tuning.safe_radius);

      for (const s of sortedShades) {
        if (!isPlayerSafe && s.state === "chase" && (s.evict_timer || 0) <= 0) {
          const distXZ = Math.hypot(this.player.pos[0] - s.pos[0], this.player.pos[2] - s.pos[2]);
          const distY = Math.abs(this.player.pos[1] - s.pos[1]);

          if (distXZ <= this.tuning.shade_hit_radius_xz && distY <= this.tuning.shade_hit_height_diff) {
            if (this.player.invuln_timer <= 0 && !hitDealtThisTick) {
              hitDealtThisTick = true;
              this.player.flames -= 1;
              this.player.invuln_timer = this.tuning.invuln_ticks; // 90 ticks

              // Drop floor(carried / 2) motes scattered in ring 1.5-2.5m
              const droppedCount = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
              this.player.carried -= droppedCount;

              for (let k = 0; k < droppedCount; k++) {
                const dropAng = this.rng.range(0, Math.PI * 2);
                const dropR = this.rng.range(1.5, 2.5);
                const mx = this.player.pos[0] + Math.cos(dropAng) * dropR;
                const mz = this.player.pos[2] + Math.sin(dropAng) * dropR;
                const my = this.getGroundHeight(mx, mz) || this.player.pos[1];
                this.motes.push({
                  id: `M${this.next_mote_id++}`,
                  pos: [round3(mx), round3(my), round3(mz)],
                  kind: "dropped",
                  ttl_ticks: this.tuning.dropped_mote_ttl_ticks
                });
              }

              // Recoil shade 2m in 60 ticks
              s.state = "recoil";
              s.state_timer = this.tuning.shade_recoil_ticks;
              const dXZ = Math.hypot(s.pos[0] - this.player.pos[0], s.pos[2] - this.player.pos[2]);
              if (dXZ > 0.001) {
                s.push_dir = [(s.pos[0] - this.player.pos[0]) / dXZ, (s.pos[2] - this.player.pos[2]) / dXZ];
              } else {
                s.push_dir = [1.0, 0.0];
              }

              this.pending_events.push({
                type: "event",
                tick: next_tick,
                name: "player_hit",
                data: {
                  by: "shade",
                  flames: this.player.flames,
                  dropped: droppedCount
                }
              });

              if (this.player.flames <= 0) {
                this.state = "lost";
                this.pending_events.push({
                  type: "event",
                  tick: next_tick,
                  name: "game_over",
                  data: { result: "lost", reason: "no_flames" }
                });
                break;
              }
            }
          }
        }
      }
    }

    // 10. Spawn schedule (motes, Shades, Drifters)
    // Spawn motes every 240 ticks if < 30
    if (this.sim_tick % 240 === 0 && this.motes.length < 30) {
      const pts = this.mapData.moteSpawnPoints || [];
      const emptyPts = pts.filter(pt => {
        return !this.motes.some(m => Math.hypot(m.pos[0] - pt[0], m.pos[2] - pt[2]) < 1.0);
      });
      if (emptyPts.length > 0) {
        const pt = this.rng.choice(emptyPts);
        this.motes.push({
          id: `M${this.next_mote_id++}`,
          pos: [...pt],
          kind: "random",
          ttl_ticks: -1
        });
      }
    }

    // Spawn Shades
    const shadeInterval = this.mapData.shadeSpawnIntervalTicks;
    const shouldSpawnShade = (this.sim_tick === 300) || (this.sim_tick > 300 && (this.sim_tick - 300) % shadeInterval === 0);
    if (shouldSpawnShade && this.shades.length < this.mapData.maxShades) {
      const spawnCount = (this.sim_tick === 300) ? 2 : 1;
      for (let k = 0; k < spawnCount; k++) {
        if (this.shades.length >= this.mapData.maxShades) break;
        const validPts = (this.mapData.shadeSpawnPoints || []).filter(pt => {
          return Math.hypot(this.player.pos[0] - pt[0], this.player.pos[2] - pt[2]) >= 15.0;
        });
        if (validPts.length > 0) {
          const pt = this.rng.choice(validPts);
          this.shades.push({
            id: `S${this.next_shade_id++}`,
            pos: [...pt],
            state: "spawning",
            state_timer: 30,
            push_timer: 0,
            push_dir: [1.0, 0.0],
            evict_timer: 0
          });
        }
      }
    }

    // Spawn Drifters (Nights 2 & 3)
    if (this.night >= 2 && this.sim_tick % 1200 === 0 && this.drifters.length < 2) {
      const pts = this.mapData.moteSpawnPoints || [];
      if (pts.length > 0) {
        const pt = this.rng.choice(pts);
        this.drifters.push({
          id: `D${this.next_drifter_id++}`,
          pos: [pt[0], pt[1] + 1.2, pt[2]],
          state: "idle",
          stolen: 0,
          flee_timer: 0
        });
      }
    }

    // Wind scheduling (Night 3)
    if (this.wind.enabled) {
      const cycleTick = this.sim_tick % 1800; // 30s cycle
      if (cycleTick === 1500) {
        // Warning 2s before (leaf rustle)
      } else if (cycleTick >= 1620 && cycleTick < 1920) {
        if (!this.wind.active) {
          this.wind.active = true;
          this.wind.dir_deg = round3(this.rng.range(0, 360));
        }
      } else {
        this.wind.active = false;
      }
    }

    // 11. Win / Loss evaluation
    if (this.player.flames <= 0) {
      if (this.state === "playing") {
        this.state = "lost";
        this.pending_events.push({
          type: "event",
          tick: next_tick,
          name: "game_over",
          data: { result: "lost", reason: "no_flames" }
        });
      }
    } else {
      const allLit = this.lanterns.length > 0 && this.lanterns.every(l => l.lit);
      if (allLit && this.state === "playing") {
        this.state = "won";
        const timeBonus = Math.floor(this.time_left_s) * this.tuning.score.per_second_left;
        const flameBonus = this.player.flames * this.tuning.score.per_flame_left;
        this.score += timeBonus + flameBonus;
        this.pending_events.push({
          type: "event",
          tick: next_tick,
          name: "game_over",
          data: { result: "won", reason: "all_lit" }
        });
      } else if (this.time_left_s <= 0 && this.state === "playing") {
        this.state = "lost";
        this.pending_events.push({
          type: "event",
          tick: next_tick,
          name: "game_over",
          data: { result: "lost", reason: "dawn" }
        });
      }
    }

    this.current_tick = next_tick;
    return this.pending_events;
  }

  getSnapshot() {
    return {
      type: "snapshot",
      tick: this.current_tick,
      sim_tick: this.sim_tick,
      night: this.night,
      state: this.state,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      wind: {
        active: Boolean(this.wind.active),
        dir_deg: round3(this.wind.dir_deg)
      },
      player: {
        pos: [round3(this.player.pos[0]), round3(this.player.pos[1]), round3(this.player.pos[2])],
        vel: [round3(this.player.vel[0]), round3(this.player.vel[1]), round3(this.player.vel[2])],
        grounded: Boolean(this.player.grounded),
        flames: this.player.flames,
        carried: this.player.carried,
        invuln: this.player.invuln_timer > 0,
        dash_cd_s: round3(this.player.dash_cd_timer / 60.0),
        pulse_cd_s: round3(this.player.pulse_cooldown / 60.0),
        charm_s: round3(this.player.charm_timer / 60.0)
      },
      lanterns: this.lanterns.map(l => ({
        id: l.id,
        pos: [round3(l.pos[0]), round3(l.pos[1]), round3(l.pos[2])],
        lit: l.lit,
        deposited: l.deposited
      })),
      shades: this.shades.map(s => ({
        id: s.id,
        pos: [round3(s.pos[0]), round3(s.pos[1]), round3(s.pos[2])],
        state: s.state
      })),
      motes: this.motes.map(m => ({
        id: m.id,
        pos: [round3(m.pos[0]), round3(m.pos[1]), round3(m.pos[2])],
        kind: m.kind,
        ttl_s: m.ttl_ticks > 0 ? round3(m.ttl_ticks / 60.0) : -1
      })),
      drifters: this.drifters.map(d => ({
        id: d.id,
        pos: [round3(d.pos[0]), round3(d.pos[1]), round3(d.pos[2])],
        state: d.state,
        stolen: d.stolen
      })),
      charms: this.charms.map(c => ({
        id: c.id,
        available: Boolean(c.available),
        respawn_s: c.respawn_timer > 0 ? round3(c.respawn_timer / 60.0) : 0.0
      })),
      motes_active: this.motes.length
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GameEngine, PRNG, round3 };
}
