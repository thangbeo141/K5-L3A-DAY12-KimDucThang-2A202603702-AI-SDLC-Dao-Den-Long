/**
 * Core Deterministic Game Engine for Đảo Đèn Lồng (Lantern Island)
 * Strict compliance with Test Contract v1.0
 */

// Deterministic Pseudo-Random Number Generator (Mulberry32)
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
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

class GameEngine {
  constructor(contractTuning, seed = 42) {
    this.tuning = Object.assign({
      player_speed: 6.0,
      carry_capacity: 5,
      lantern_cost: 3,
      lantern_count_night1: 5,
      pickup_radius: 2.0,
      interact_radius: 3.0,
      pulse_cost: 1,
      pulse_radius: 5.0,
      night1_duration_s: 300,
      flames: 3,
      invuln_s: 1.5,
      hit_drop_ratio: 0.5,
      pulse_stun_s: 3.0,
      pulse_push_m: 4.0,
      pulse_cooldown_s: 2.0,
      safe_radius: 4.0,
      shade_speed: 3.5,
      shade_hit_radius: 1.2,
      fall_enabled: false,
      score: {
        per_mote: 10,
        per_lantern: 100,
        per_stun: 20,
        per_second_left: 1,
        per_flame_left: 50
      }
    }, contractTuning || {});

    this.rng = new PRNG(seed);
    this.current_tick = 0;
    this.state = "playing"; // "playing" | "won" | "lost"
    this.score = 0;
    this.time_left_s = this.tuning.night1_duration_s;

    // Player state
    this.player = {
      pos: [0.0, 0.0, 0.0],
      carried: 0,
      flames: this.tuning.flames,
      invuln_timer: 0,
      pulse_cooldown: 0
    };

    // Default Lanterns (5 lanterns on Đảo Bến at radius 25m)
    this.lanterns = [
      { id: "L1", pos: [0.0, 0.0, 25.0], lit: false, deposited: 0 },
      { id: "L2", pos: [23.776, 0.0, 7.725], lit: false, deposited: 0 },
      { id: "L3", pos: [14.695, 0.0, -20.225], lit: false, deposited: 0 },
      { id: "L4", pos: [-14.695, 0.0, -20.225], lit: false, deposited: 0 },
      { id: "L5", pos: [-23.776, 0.0, 7.725], lit: false, deposited: 0 }
    ];

    // Motes
    this.motes = [];
    this.next_mote_id = 1;

    // Shades
    this.shades = [];
    this.next_shade_id = 1;

    // Input state
    this.current_input = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false
    };
    this.prev_input = Object.assign({}, this.current_input);

    this.pending_events = [];
  }

  initDefaultWorld() {
    // Generate 20 motes scattered on island (radius 5m to 30m)
    this.motes = [];
    for (let i = 0; i < 20; i++) {
      const angle = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(5, 30);
      this.motes.push({
        id: `M${this.next_mote_id++}`,
        pos: [round3(Math.cos(angle) * r), 0.0, round3(Math.sin(angle) * r)]
      });
    }

    // Generate 3 shades
    this.shades = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i * (Math.PI * 2 / 3)) + 0.5;
      const r = 22.0;
      this.shades.push({
        id: `S${this.next_shade_id++}`,
        pos: [round3(Math.cos(angle) * r), 0.0, round3(Math.sin(angle) * r)],
        state: "chase",
        stun_timer: 0
      });
    }
  }

  applyScenario(scenario) {
    if (!scenario) {
      this.initDefaultWorld();
      return;
    }

    if (scenario.time_left_s !== undefined) {
      this.time_left_s = scenario.time_left_s;
    }

    if (scenario.player) {
      if (scenario.player.pos) this.player.pos = [...scenario.player.pos];
      if (scenario.player.carried !== undefined) this.player.carried = scenario.player.carried;
      if (scenario.player.flames !== undefined) this.player.flames = scenario.player.flames;
    }

    if (scenario.lanterns !== undefined) {
      this.lanterns = scenario.lanterns.map((sl, idx) => ({
        id: sl.id || `L${idx + 1}`,
        pos: sl.pos ? [...sl.pos] : [0, 0, 0],
        deposited: sl.deposited || 0,
        lit: sl.lit !== undefined ? sl.lit : ((sl.deposited || 0) >= this.tuning.lantern_cost)
      }));
    }

    // Motes
    if (scenario.motes !== undefined) {
      this.motes = scenario.motes.map((m, idx) => {
        const pos = Array.isArray(m) ? m : m.pos;
        const id = (!Array.isArray(m) && m.id) ? m.id : `M${idx + 1}`;
        return { id, pos: [pos[0], pos[1] || 0, pos[2]] };
      });
    } else if (scenario.random_motes !== false) {
      this.initDefaultWorld();
    }

    // Shades
    if (scenario.shades !== undefined) {
      this.shades = scenario.shades.map((s, idx) => {
        const pos = Array.isArray(s) ? s : s.pos;
        const id = (!Array.isArray(s) && s.id) ? s.id : `S${idx + 1}`;
        return {
          id,
          pos: [pos[0], pos[1] || 0, pos[2]],
          state: s.state || "chase",
          stun_timer: 0
        };
      });
    } else if (scenario.random_shades !== false && this.shades.length === 0) {
      // If random_shades not false and no shades loaded, generate defaults
      for (let i = 0; i < 3; i++) {
        const angle = (i * (Math.PI * 2 / 3)) + 0.5;
        const r = 22.0;
        this.shades.push({
          id: `S${this.next_shade_id++}`,
          pos: [round3(Math.cos(angle) * r), 0.0, round3(Math.sin(angle) * r)],
          state: "chase",
          stun_timer: 0
        });
      }
    }
  }

  setInput(newInput) {
    Object.assign(this.current_input, newInput);
  }

  step() {
    this.pending_events = [];
    const next_tick = this.current_tick + 1;

    if (this.state !== "playing") {
      this.current_tick = next_tick;
      return this.pending_events;
    }

    // 1. Time countdown
    this.time_left_s = Math.max(0, this.tuning.night1_duration_s - (next_tick / 60));
    if (this.time_left_s <= 0 && this.state === "playing") {
      this.state = "lost";
      this.pending_events.push({
        type: "event",
        tick: next_tick,
        name: "game_over",
        data: { result: "lost", reason: "dawn" }
      });
    }

    // Edge triggers comparing current step input against previous step input
    const jump_triggered = Boolean(this.current_input.jump) && !Boolean(this.prev_input.jump);
    const interact_triggered = Boolean(this.current_input.interact) && !Boolean(this.prev_input.interact);
    const pulse_triggered = Boolean(this.current_input.pulse) && !Boolean(this.prev_input.pulse);
    this.prev_input = Object.assign({}, this.current_input);

    // Jump physics
    if (jump_triggered && this.player.pos[1] <= 0.001) {
      this.player.vy = 8.5;
    }
    if (this.player.pos[1] > 0 || (this.player.vy && this.player.vy > 0)) {
      this.player.vy = (this.player.vy || 0) - (22.0 / 60.0);
      this.player.pos[1] = Math.max(0, this.player.pos[1] + (this.player.vy / 60.0));
      if (this.player.pos[1] <= 0.0001) {
        this.player.pos[1] = 0.0;
        this.player.vy = 0;
      }
    }

    // 2. Player movement
    const [mx, mz] = this.current_input.move || [0, 0];
    let len = Math.hypot(mx, mz);
    let norm_x = mx;
    let norm_z = mz;
    if (len > 1.0) {
      norm_x = mx / len;
      norm_z = mz / len;
    }

    const rad = ((this.current_input.cam_yaw_deg || 0) * Math.PI) / 180.0;
    const cos_t = Math.cos(rad);
    const sin_t = Math.sin(rad);

    // Contract coordinate movement:
    // x' = x*cosθ + z*sinθ, z' = -x*sinθ + z*cosθ
    const world_dx = norm_x * cos_t + norm_z * sin_t;
    const world_dz = -norm_x * sin_t + norm_z * cos_t;

    const speed_per_tick = this.tuning.player_speed / 60.0;
    this.player.pos[0] += world_dx * speed_per_tick;
    this.player.pos[2] += world_dz * speed_per_tick;

    // Timers
    if (this.player.invuln_timer > 0) this.player.invuln_timer--;
    if (this.player.pulse_cooldown > 0) this.player.pulse_cooldown--;

    // 3. Mote collection
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const mote = this.motes[i];
      const dist = Math.hypot(this.player.pos[0] - mote.pos[0], this.player.pos[2] - mote.pos[2]);
      if (dist <= this.tuning.pickup_radius) {
        if (this.player.carried < this.tuning.carry_capacity) {
          this.player.carried += 1;
          this.score += this.tuning.score.per_mote;
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

    // 4. Interact (Deposit into Lantern)
    if (interact_triggered) {
      // Find closest unlit lantern within interact_radius
      let closest_lan = null;
      let min_dist = Infinity;
      for (const lan of this.lanterns) {
        if (!lan.lit) {
          const d = Math.hypot(this.player.pos[0] - lan.pos[0], this.player.pos[2] - lan.pos[2]);
          if (d <= this.tuning.interact_radius && d < min_dist) {
            min_dist = d;
            closest_lan = lan;
          }
        }
      }

      if (closest_lan) {
        const needed = this.tuning.lantern_cost - closest_lan.deposited;
        const deposit_amt = Math.min(this.player.carried, needed);
        if (deposit_amt > 0) {
          this.player.carried -= deposit_amt;
          closest_lan.deposited += deposit_amt;
          this.pending_events.push({
            type: "event",
            tick: next_tick,
            name: "deposit",
            data: {
              lantern_id: closest_lan.id,
              amount: deposit_amt,
              deposited: closest_lan.deposited
            }
          });

          if (closest_lan.deposited >= this.tuning.lantern_cost) {
            closest_lan.lit = true;
            this.score += this.tuning.score.per_lantern;
            this.pending_events.push({
              type: "event",
              tick: next_tick,
              name: "lantern_lit",
              data: { lantern_id: closest_lan.id }
            });

            // Check Win Condition
            const all_lit = this.lanterns.length > 0 && this.lanterns.every(l => l.lit);
            if (all_lit && this.state === "playing") {
              this.state = "won";
              const time_bonus = Math.round(this.time_left_s * this.tuning.score.per_second_left);
              const flame_bonus = this.player.flames * this.tuning.score.per_flame_left;
              this.score += time_bonus + flame_bonus;
              this.pending_events.push({
                type: "event",
                tick: next_tick,
                name: "game_over",
                data: { result: "won", reason: "all_lit" }
              });
            }
          }
        }
      }
    }

    // 5. Pulse (Tỏa sáng)
    if (pulse_triggered && this.state === "playing") {
      if (this.player.carried >= this.tuning.pulse_cost && this.player.pulse_cooldown <= 0) {
        this.player.carried -= this.tuning.pulse_cost;
        this.player.pulse_cooldown = Math.round(this.tuning.pulse_cooldown_s * 60);

        const stunned_ids = [];
        for (const shade of this.shades) {
          const d = Math.hypot(this.player.pos[0] - shade.pos[0], this.player.pos[2] - shade.pos[2]);
          if (d <= this.tuning.pulse_radius) {
            shade.state = "stunned";
            shade.stun_timer = Math.round(this.tuning.pulse_stun_s * 60);
            if (d > 0.0001) {
              shade.pos[0] += ((shade.pos[0] - this.player.pos[0]) / d) * this.tuning.pulse_push_m;
              shade.pos[2] += ((shade.pos[2] - this.player.pos[2]) / d) * this.tuning.pulse_push_m;
            } else {
              shade.pos[0] += this.tuning.pulse_push_m;
            }
            stunned_ids.push(shade.id);
            this.score += this.tuning.score.per_stun;
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

    // 6. Shades AI & Collision
    for (const shade of this.shades) {
      if (shade.state === "stunned") {
        shade.stun_timer--;
        if (shade.stun_timer <= 0) {
          shade.state = "chase";
        }
      } else if (shade.state === "chase") {
        const dx = this.player.pos[0] - shade.pos[0];
        const dz = this.player.pos[2] - shade.pos[2];
        const dist = Math.hypot(dx, dz);

        if (dist > 0.0001) {
          const step_dist = this.tuning.shade_speed / 60.0;
          let next_x = shade.pos[0] + (dx / dist) * Math.min(step_dist, dist);
          let next_z = shade.pos[2] + (dz / dist) * Math.min(step_dist, dist);

          // Avoid safe_radius around lit lanterns
          let blocked = false;
          for (const lan of this.lanterns) {
            if (lan.lit) {
              const d_lan = Math.hypot(next_x - lan.pos[0], next_z - lan.pos[2]);
              if (d_lan < this.tuning.safe_radius) {
                blocked = true;
                const cur_d = Math.hypot(shade.pos[0] - lan.pos[0], shade.pos[2] - lan.pos[2]);
                if (cur_d >= this.tuning.safe_radius) {
                  const ang = Math.atan2(shade.pos[2] - lan.pos[2], shade.pos[0] - lan.pos[0]);
                  next_x = lan.pos[0] + Math.cos(ang) * this.tuning.safe_radius;
                  next_z = lan.pos[2] + Math.sin(ang) * this.tuning.safe_radius;
                  blocked = false;
                }
                break;
              }
            }
          }

          if (!blocked) {
            shade.pos[0] = next_x;
            shade.pos[2] = next_z;
          }
        }

        // Hit player check (player is safe inside safe_radius of any lit lantern)
        const isPlayerSafe = this.lanterns.some(l => l.lit && Math.hypot(this.player.pos[0] - l.pos[0], this.player.pos[2] - l.pos[2]) < this.tuning.safe_radius);
        const hit_dist = Math.hypot(shade.pos[0] - this.player.pos[0], shade.pos[2] - this.player.pos[2]);
        if (!isPlayerSafe && hit_dist <= this.tuning.shade_hit_radius && this.state === "playing") {
          if (this.player.invuln_timer <= 0) {
            this.player.flames -= 1;
            this.player.invuln_timer = Math.round(this.tuning.invuln_s * 60);
            const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
            this.player.carried -= dropped;

            this.pending_events.push({
              type: "event",
              tick: next_tick,
              name: "player_hit",
              data: {
                by: "shade",
                flames: this.player.flames,
                dropped: dropped
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
      }
    }

    this.current_tick = next_tick;
    return this.pending_events;
  }

  getSnapshot() {
    return {
      type: "snapshot",
      tick: this.current_tick,
      sim_tick: this.current_tick,
      state: this.state,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      player: {
        pos: [round3(this.player.pos[0]), round3(this.player.pos[1]), round3(this.player.pos[2])],
        flames: this.player.flames,
        carried: this.player.carried
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
      motes_active: this.motes.length
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GameEngine, PRNG, round3 };
}
