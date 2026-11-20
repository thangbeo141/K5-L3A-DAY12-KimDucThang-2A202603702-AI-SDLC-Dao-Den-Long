/**
 * 3D Frontend for Đảo Đèn Lồng (Lantern Island)
 * Using Three.js and the deterministic GameEngine
 */

let scene, camera, renderer;
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
  const ambientLight = new THREE.AmbientLight(0x1a2138, 1.2);
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

      g.position.set(lan.pos[0], lan.pos[1], lan.pos[2]);
      scene.add(g);
      lanternMeshes[lan.id] = { group: g, core, light: pLight };
    }

    // Update visuals based on lit state
    const m = lanternMeshes[lan.id];
    if (lan.lit) {
      m.core.material.color.setHex(0xffea00);
      m.light.intensity = 3.5;
    } else {
      m.core.material.color.setHex(0x3e2723);
      m.light.intensity = 0;
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
  // Add new
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
      g.position.set(mote.pos[0], 0.6, mote.pos[2]);
      scene.add(g);
      moteMeshes[mote.id] = g;
    }
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
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.key.toLowerCase() === 'f') {
      triggerPulse();
    }
    if (e.key.toLowerCase() === 'e') {
      engine.setInput({ interact: true });
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
    if (e.key.toLowerCase() === 'e') {
      engine.setInput({ interact: false });
    }
    if (e.key === ' ' || e.key.toLowerCase() === 'f') {
      engine.setInput({ pulse: false });
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

function triggerPulse() {
  engine.setInput({ pulse: true });
  // Visual pulse animation
  if (pulseEffectMesh) {
    pulseEffectMesh.position.set(engine.player.pos[0], 0.5, engine.player.pos[2]);
    pulseEffectMesh.scale.set(0.1, 0.1, 0.1);
    pulseEffectMesh.visible = true;
    pulseEffectMesh.material.opacity = 0.8;
  }
}

function updateInput() {
  let mx = 0, mz = 0;
  if (keys['w'] || keys['arrowup']) mz += 1;
  if (keys['s'] || keys['arrowdown']) mz -= 1;
  if (keys['a'] || keys['arrowleft']) mx += 1; // Left relative to camera view
  if (keys['d'] || keys['arrowright']) mx -= 1; // Right relative to camera view

  const deg = (camYaw * 180 / Math.PI) % 360;
  engine.setInput({
    move: [mx, mz],
    cam_yaw_deg: deg
  });
}

function updateHUD() {
  const flamesStr = '❤️'.repeat(Math.max(0, engine.player.flames));
  document.getElementById('hud-flames').innerText = flamesStr || '💀 Hết';
  document.getElementById('hud-motes').innerText = `${engine.player.carried} / ${engine.tuning.carry_capacity}`;

  const litCount = engine.lanterns.filter(l => l.lit).length;
  document.getElementById('hud-lanterns').innerText = `${litCount} / 5`;
  document.getElementById('hud-time').innerText = `${Math.ceil(engine.time_left_s)}s`;
  document.getElementById('hud-score').innerText = engine.score;

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
  engine = new GameEngine(null, Date.now());
  engine.applyScenario(null);
  document.getElementById('message-overlay').classList.add('hidden');
  syncEntities();
}

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  // Run simulation ticks
  while (now - lastTickTime >= TICK_INTERVAL) {
    updateInput();
    engine.step();
    lastTickTime += TICK_INTERVAL;
  }

  // Pulse animation expansion
  if (pulseEffectMesh && pulseEffectMesh.visible) {
    pulseEffectMesh.scale.addScalar(0.25);
    pulseEffectMesh.material.opacity -= 0.03;
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
