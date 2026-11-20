/**
 * 3D Frontend for Đảo Đèn Lồng (Lantern Island)
 * Using Three.js and the deterministic GameEngine
 */

let scene, camera, renderer, ambientLight;
let engine;
let playerMesh, lanternMeshes = {}, moteMeshes = {}, shadeMeshes = {};
let pulseEffectMesh = null;
let keys = {};
let camYaw = 0;
let camPitch = 0.35;
let isMouseDown = false, prevMouseX = 0, prevMouseY = 0;
let lastTickTime = performance.now();
const TICK_INTERVAL = 1000 / 60; // 60 ticks per sec

function init() {
  const container = document.getElementById('game-container');

  // 1. Scene & Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060714);
  scene.fog = new THREE.FogExp2(0x0a0c20, 0.018);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

  // 2. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 3. Lighting
  ambientLight = new THREE.AmbientLight(0x1a2138, 1.2);
  scene.add(ambientLight);

  const moonLight = new THREE.DirectionalLight(0x7986cb, 0.6);
  moonLight.position.set(20, 40, 20);
  moonLight.castShadow = true;
  scene.add(moonLight);

  // 4. Build Environment (Round Island & Sea of clouds)
  buildEnvironment();

  // 5. Initialize Game Engine
  engine = new GameEngine(null, Date.now());
  engine.applyScenario(null);

  // 6. Build Entity Meshes
  buildPlayerMesh();
  syncEntities();

  // 7. Event Listeners
  setupControls();
  window.addEventListener('resize', onWindowResize);

  // 8. Start Loop
  lastTickTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function buildEnvironment() {
  // Round Island: cylinder / disc
  const islandGeo = new THREE.CylinderGeometry(35, 30, 8, 48);
  const islandMat = new THREE.MeshStandardMaterial({
    color: 0x1e3f20, // deep night grass
    roughness: 0.85,
    metalness: 0.1
  });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.y = -4;
  island.receiveShadow = true;
  scene.add(island);

  // Sea of clouds below
  const cloudGeo = new THREE.PlaneGeometry(300, 300, 32, 32);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0x1b2238,
    roughness: 0.9,
    transparent: true,
    opacity: 0.8
  });
  const cloudPlane = new THREE.Mesh(cloudGeo, cloudMat);
  cloudPlane.rotation.x = -Math.PI / 2;
  cloudPlane.position.y = -7;
  scene.add(cloudPlane);

  // Pulse effect geometry
  const pulseGeo = new THREE.SphereGeometry(1, 32, 16);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: 0xffb74d,
    transparent: true,
    opacity: 0,
    wireframe: true
  });
  pulseEffectMesh = new THREE.Mesh(pulseGeo, pulseMat);
  pulseEffectMesh.visible = false;
  scene.add(pulseEffectMesh);
}

function buildPlayerMesh() {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.0, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3949ab });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.15;
  group.add(head);

  // Nón Lá (Conical hat)
  const hatGeo = new THREE.ConeGeometry(0.8, 0.4, 24);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 1.45;
  group.add(hat);

  // Little hanging lantern on hat
  const miniLanternGeo = new THREE.DodecahedronGeometry(0.12);
  const miniLanternMat = new THREE.MeshBasicMaterial({ color: 0xffb300 });
  const miniLantern = new THREE.Mesh(miniLanternGeo, miniLanternMat);
  miniLantern.position.set(0.4, 1.25, 0.2);
  group.add(miniLantern);

  const playerLight = new THREE.PointLight(0xffa726, 1.5, 6);
  playerLight.position.set(0.4, 1.25, 0.2);
  group.add(playerLight);

  playerMesh = group;
  scene.add(playerMesh);
}

function syncEntities() {
  // Sync Lanterns
  for (const lan of engine.lanterns) {
    if (!lanternMeshes[lan.id]) {
      const g = new THREE.Group();
      // Post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 2.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x3e2723 })
      );
      post.position.y = 1.25;
      g.add(post);

      // Lantern cage
      const cage = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7),
        new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 })
      );
      cage.position.y = 2.5;
      g.add(cage);

      // Light glow core
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x424242 })
      );
      core.position.y = 2.5;
      g.add(core);

      // Point Light
      const pLight = new THREE.PointLight(0xff9800, 0, 15);
      pLight.position.y = 2.7;
      g.add(pLight);

      // Safe Zone Circle Ring on ground (radius = 4m)
      const ringGeo = new THREE.RingGeometry(3.85, 4.0, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffb74d,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      g.add(ring);

      g.position.set(lan.pos[0], lan.pos[1], lan.pos[2]);
      scene.add(g);
      lanternMeshes[lan.id] = { group: g, core, light: pLight, ring };
    }

    // Update visuals based on lit state
    const m = lanternMeshes[lan.id];
    if (lan.lit) {
      m.core.material.color.setHex(0xffea00);
      m.light.intensity = 3.5;
      if (m.ring) {
        m.ring.material.opacity = 0.65;
        m.ring.rotation.z += 0.005;
      }
    } else {
      m.core.material.color.setHex(0x3e2723);
      m.light.intensity = 0;
      if (m.ring) m.ring.material.opacity = 0;
    }
  }

  // Sync Motes
  const currentMoteIds = new Set(engine.motes.map(m => m.id));
  // Remove dead
  for (const id in moteMeshes) {
    if (!currentMoteIds.has(id)) {
      scene.remove(moteMeshes[id]);
      delete moteMeshes[id];
    }
  }
  // Add new or update position
  for (const mote of engine.motes) {
    if (!moteMeshes[mote.id]) {
      const g = new THREE.Group();
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffeb3b })
      );
      g.add(orb);
      const l = new THREE.PointLight(0xffd54f, 1.2, 4);
      g.add(l);
      g.position.y = 0.6;
      scene.add(g);
      moteMeshes[mote.id] = g;
    }
    moteMeshes[mote.id].position.x = mote.pos[0];
    moteMeshes[mote.id].position.z = mote.pos[2];
  }

  // Sync Shades
  const currentShadeIds = new Set(engine.shades.map(s => s.id));
  for (const id in shadeMeshes) {
    if (!currentShadeIds.has(id)) {
      scene.remove(shadeMeshes[id].mesh);
      delete shadeMeshes[id];
    }
  }
  for (const shade of engine.shades) {
    if (!shadeMeshes[shade.id]) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.65),
        new THREE.MeshStandardMaterial({ color: 0x120024, roughness: 0.9 })
      );
      body.position.y = 0.65;
      g.add(body);

      // Glowing purple eyes
      const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xba68c8 });
      const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
      eye1.position.set(0.2, 0.8, 0.45);
      const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
      eye2.position.set(-0.2, 0.8, 0.45);
      g.add(eye1);
      g.add(eye2);

      g.position.set(shade.pos[0], shade.pos[1], shade.pos[2]);
      scene.add(g);
      shadeMeshes[shade.id] = { mesh: g, body };
    }

    const sm = shadeMeshes[shade.id];
    sm.mesh.position.set(shade.pos[0], shade.pos[1], shade.pos[2]);
    if (shade.state === 'stunned') {
      sm.body.rotation.y += 0.2;
      sm.mesh.scale.set(0.8, 0.8, 0.8);
    } else {
      sm.mesh.scale.set(1.0, 1.0, 1.0);
    }
  }
}

function setupControls() {
  window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (e.key === ' ') {
        keys['space'] = true;
        e.preventDefault();
      }

      // Friendly instant feedback when trying to interact without conditions
      if (k === 'e') {
        let near = false;
        for (const lan of engine.lanterns) {
          if (!lan.lit && Math.hypot(engine.player.pos[0] - lan.pos[0], engine.player.pos[2] - lan.pos[2]) <= engine.tuning.interact_radius) {
            near = true;
            break;
          }
        }
          if (!near) {
            showToast("💡 Hãy lại gần chân cột Đèn Lồng Lớn rồi bấm [E] nhé!");
          } else if (engine.player.carried <= 0) {
            showToast("⚠️ Túi rỗng (0 đom đóm)! Hãy đi nhặt các đốm vàng trước!");
          }
          }

          if (k === 'f' || k === 'q') {
            if (engine.player.carried < engine.tuning.pulse_cost) {
              showToast("⚠️ Cần ít nhất 1 đom đóm để Tỏa Sáng [F]!");
            } else if (engine.player.pulse_cooldown > 0) {
              showToast("⏳ Đang hồi chiêu Tỏa Sáng...");
            }
}
  });

window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  keys[k] = false;
  if (e.key === ' ') {
    keys['space'] = false;
  }
  });

window.addEventListener('mousedown', e => {
  isMouseDown = true;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
});

window.addEventListener('mouseup', () => { isMouseDown = false; });

window.addEventListener('mousemove', e => {
  if (isMouseDown) {
    const deltaX = e.clientX - prevMouseX;
    const deltaY = e.clientY - prevMouseY;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    camYaw -= deltaX * 0.005;
    camPitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, camPitch + deltaY * 0.005));
  }
});
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerText = msg;
  container.appendChild(t);
  setTimeout(() => {
    if (t.parentNode) t.parentNode.removeChild(t);
  }, 2600);
}

function triggerFlashDamage() {
  const flash = document.getElementById('flash-overlay');
  if (!flash) return;
  flash.classList.add('active');
  setTimeout(() => {
    flash.classList.remove('active');
  }, 350);
}

function triggerPulseVisual() {
  if (pulseEffectMesh) {
    pulseEffectMesh.position.set(engine.player.pos[0], 0.5, engine.player.pos[2]);
    pulseEffectMesh.scale.set(0.1, 0.1, 0.1);
    pulseEffectMesh.visible = true;
    pulseEffectMesh.material.opacity = 0.85;
  }
}

function handleGameEvent(evt) {
  if (evt.name === 'mote_picked') {
    showToast(`✨ Nhặt được Đom Đóm! (${evt.data.carried}/${engine.tuning.carry_capacity})`);
  } else if (evt.name === 'deposit') {
    showToast(`🏮 Nạp ${evt.data.amount} đom đóm vào ${evt.data.lantern_id} (${evt.data.deposited}/${engine.tuning.lantern_cost})`);
  } else if (evt.name === 'lantern_lit') {
    showToast(`🎉 ${evt.data.lantern_id} ĐÃ ĐƯỢC THẮP SÁNG! Vùng an toàn 4m mở rộng!`);
  } else if (evt.name === 'pulse') {
    triggerPulseVisual();
    showToast(`💫 TỎA SÁNG! Đẩy lùi và làm choáng ${evt.data.stunned_ids.length} Bóng Mực!`);
  } else if (evt.name === 'player_hit') {
    triggerFlashDamage();
    showToast(`💔 Mây bị Bóng Mực tấn công! Mất 1 Sinh Lực, rơi ${evt.data.dropped} đom đóm!`);
  }
}

function updateInput() {
  let mx = 0, mz = 0;
  if (keys['w'] || keys['arrowup']) mz += 1;
  if (keys['s'] || keys['arrowdown']) mz -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1; // Right
  if (keys['a'] || keys['arrowleft']) mx -= 1;  // Left

  const deg = (camYaw * 180 / Math.PI) % 360;
  engine.setInput({
    move: [mx, mz],
    cam_yaw_deg: deg,
    jump: Boolean(keys[' '] || keys['space']),
    interact: Boolean(keys['e']),
    pulse: Boolean(keys['f'] || keys['q'])
  });
}

function updateHUD() {
  const flamesStr = '❤️'.repeat(Math.max(0, engine.player.flames));
  document.getElementById('hud-flames').innerText = flamesStr || '💀 Hết';
  const isFull = engine.player.carried >= engine.tuning.carry_capacity;
  const motesEl = document.getElementById('hud-motes');
  if (isFull) {
    motesEl.innerText = `${engine.player.carried} / ${engine.tuning.carry_capacity} (ĐẦY TÚI!)`;
    motesEl.style.color = '#ffa726';
    for (const mote of engine.motes) {
      const d = Math.hypot(engine.player.pos[0] - mote.pos[0], engine.player.pos[2] - mote.pos[2]);
      if (d <= engine.tuning.pickup_radius + 0.8) {
        if (!window._lastBagFullToast || Date.now() - window._lastBagFullToast > 3000) {
          window._lastBagFullToast = Date.now();
          showToast("🎒 Túi đom đóm đã ĐẦY (5/5)! Hãy lại Đèn Lồng bấm [E] nạp trước nhé!");
        }
        break;
      }
    }
  } else {
    motesEl.innerText = `${engine.player.carried} / ${engine.tuning.carry_capacity}`;
    motesEl.style.color = '#ffffff';
  }

  const litCount = engine.lanterns.filter(l => l.lit).length;
  document.getElementById('hud-lanterns').innerText = `${litCount} / 5`;
  document.getElementById('hud-time').innerText = `${Math.ceil(engine.time_left_s)}s`;
  document.getElementById('hud-score').innerText = engine.score;

  // Brighten island ambient lighting as lanterns light up
  if (ambientLight) {
    ambientLight.intensity = 1.0 + (litCount * 0.3);
  }

  // Interaction Prompt for closest unlit lantern
  const prompt = document.getElementById('interact-prompt');
  let nearLantern = null;
  let minD = Infinity;
  for (const lan of engine.lanterns) {
    if (!lan.lit) {
      const d = Math.hypot(engine.player.pos[0] - lan.pos[0], engine.player.pos[2] - lan.pos[2]);
      if (d <= engine.tuning.interact_radius && d < minD) {
        minD = d;
        nearLantern = lan;
      }
    }
  }

  if (nearLantern && prompt) {
    prompt.classList.remove('hidden');
    if (engine.player.carried > 0) {
      prompt.innerHTML = `💡 Bấm <b>[E]</b> để nạp Đom Đóm vào <b>${nearLantern.id}</b> (${nearLantern.deposited}/${engine.tuning.lantern_cost})`;
    } else {
      prompt.innerHTML = `⚠️ Đứng gần <b>${nearLantern.id}</b>! Cần tìm thêm Đom Đóm để nạp!`;
    }
  } else if (prompt) {
    prompt.classList.add('hidden');
  }

  // Check Game Over Overlay
  const overlay = document.getElementById('message-overlay');
  const title = document.getElementById('overlay-title');
  const desc = document.getElementById('overlay-desc');

  if (engine.state === 'won') {
    overlay.classList.remove('hidden');
    title.innerText = '🎉 Chiến Thắng!';
    desc.innerText = `Mây đã thắp sáng cả 5 Đèn Lồng! Tổng điểm: ${engine.score}`;
  } else if (engine.state === 'lost') {
    overlay.classList.remove('hidden');
    title.innerText = '🌧️ Thua Cuộc';
    desc.innerText = (engine.player.flames <= 0)
      ? 'Mây đã bị Bóng Mực bắt trúng và hết sinh lực!'
      : 'Trời đã rạng sáng trước khi thắp đủ đèn!';
  } else {
    overlay.classList.add('hidden');
  }
}

function restartGame() {
  for (const id in moteMeshes) {
    scene.remove(moteMeshes[id]);
  }
  moteMeshes = {};
  for (const id in shadeMeshes) {
    scene.remove(shadeMeshes[id].mesh);
  }
  shadeMeshes = {};
  for (const id in lanternMeshes) {
    scene.remove(lanternMeshes[id].group);
  }
  lanternMeshes = {};

  engine = new GameEngine(null, Date.now());
  engine.applyScenario(null);
  document.getElementById('message-overlay').classList.add('hidden');
  lastTickTime = performance.now();
  keys = {};
  syncEntities();
}

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  // Prevent accumulator spiral / lag spikes when switching tabs
  if (now - lastTickTime > 150) {
    lastTickTime = now;
  }

  // Run simulation ticks
  while (now - lastTickTime >= TICK_INTERVAL) {
    updateInput();
    const events = engine.step();
    for (const evt of events) {
      handleGameEvent(evt);
    }
    lastTickTime += TICK_INTERVAL;
  }

  // Pulse animation expansion
  if (pulseEffectMesh && pulseEffectMesh.visible) {
    pulseEffectMesh.scale.addScalar(0.35);
    pulseEffectMesh.material.opacity -= 0.04;
    if (pulseEffectMesh.material.opacity <= 0) {
      pulseEffectMesh.visible = false;
    }
  }

  // Floating animation for motes
  const t = now * 0.003;
  for (const id in moteMeshes) {
    moteMeshes[id].position.y = 0.6 + Math.sin(t + parseInt(id.slice(1) || 0)) * 0.15;
  }

  // Sync entity positions
  syncEntities();
  playerMesh.position.set(engine.player.pos[0], engine.player.pos[1], engine.player.pos[2]);

  // Invulnerability flicker
  if (playerMesh) {
    if (engine.player.invuln_timer > 0) {
      playerMesh.visible = (Math.floor(now / 80) % 2 === 0);
    } else {
      playerMesh.visible = true;
    }
  }

  // Rotate player mesh toward movement direction
  const [mx, mz] = engine.current_input.move || [0, 0];
  if (Math.hypot(mx, mz) > 0.01) {
    const rad = ((engine.current_input.cam_yaw_deg || 0) * Math.PI) / 180.0;
    const cos_t = Math.cos(rad);
    const sin_t = Math.sin(rad);
    const wx = mx * cos_t + mz * sin_t;
    const wz = -mx * sin_t + mz * cos_t;
    playerMesh.rotation.y = Math.atan2(wx, wz);
  }

  // Update Camera 3rd person follow (Camera stays BEHIND Mây looking forward)
  const camDist = 12;
  const camX = engine.player.pos[0] - camDist * Math.sin(camYaw) * Math.cos(camPitch);
  const camZ = engine.player.pos[2] - camDist * Math.cos(camYaw) * Math.cos(camPitch);
  const camY = engine.player.pos[1] + camDist * Math.sin(camPitch);

  camera.position.set(camX, Math.max(1, camY), camZ);
  camera.lookAt(engine.player.pos[0], engine.player.pos[1] + 1.2, engine.player.pos[2]);

  updateHUD();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;
