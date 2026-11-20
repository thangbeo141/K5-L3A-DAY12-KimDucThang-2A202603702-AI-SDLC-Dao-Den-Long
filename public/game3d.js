/**
 * 3D Frontend for Đảo Đèn Lồng (Lantern Island)
 * Conforming to Ticket-02 (Phase 2 - "Ba hòn đảo")
 */

let scene, camera, renderer, ambientLight, dirLight;
let engine;
let currentNight = 1;
let totalGameScore = 0;
let environmentGroup;

// Entity mesh mappings
let playerMesh;
let lanternMeshes = {};
let moteMeshes = {};
let shadeMeshes = {};
let drifterMeshes = {};
let charmMeshes = {};
let pulseEffectMesh = null;

// Controls & Camera
let keys = {};
let camYaw = 0;
let camPitch = 0.35;
let isMouseDown = false, prevMouseX = 0, prevMouseY = 0;
let mouseSensitivity = 1.0;
let soundVolume = 0.8;
let lastTickTime = performance.now();
const TICK_INTERVAL = 1000 / 60;

// Settings & LocalStorage
function loadSavedSettings() {
  try {
    const v = localStorage.getItem('dao_den_long_vol');
    if (v !== null) soundVolume = parseFloat(v);
    const s = localStorage.getItem('dao_den_long_sens');
    if (s !== null) mouseSensitivity = parseFloat(s);
  } catch (e) {}

  const volEl = document.getElementById('setting-volume');
  const sensEl = document.getElementById('setting-sens');
  if (volEl) volEl.value = Math.round(soundVolume * 100);
  if (sensEl) sensEl.value = Math.round(mouseSensitivity * 10);
  const volVal = document.getElementById('volume-val');
  const sensVal = document.getElementById('sens-val');
  if (volVal) volVal.innerText = `${Math.round(soundVolume * 100)}%`;
  if (sensVal) sensVal.innerText = `${mouseSensitivity.toFixed(1)}x`;
}

function updateSettings() {
  const volEl = document.getElementById('setting-volume');
  const sensEl = document.getElementById('setting-sens');
  if (volEl) {
    soundVolume = parseInt(volEl.value, 10) / 100;
    document.getElementById('volume-val').innerText = `${volEl.value}%`;
    try { localStorage.setItem('dao_den_long_vol', soundVolume.toString()); } catch (e) {}
  }
  if (sensEl) {
    mouseSensitivity = parseInt(sensEl.value, 10) / 10;
    document.getElementById('sens-val').innerText = `${mouseSensitivity.toFixed(1)}x`;
    try { localStorage.setItem('dao_den_long_sens', mouseSensitivity.toString()); } catch (e) {}
  }
}

function openSettings() {
  document.getElementById('settings-dialog').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settings-dialog').classList.add('hidden');
}

function showNightSelect() {
  document.getElementById('night-select-dialog').classList.remove('hidden');
}

function closeNightSelect() {
  document.getElementById('night-select-dialog').classList.add('hidden');
}

// ==========================================
// Web Audio API Procedural Sound Synthesizer
// ==========================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.2, gainPeak = 0.3) {
  if (soundVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  const finalGain = gainPeak * soundVolume;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(finalGain, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

const AudioSFX = {
  mote() { playTone(660, 'sine', 0.15, 0.25); },
  deposit() { playTone(440, 'triangle', 0.2, 0.3); },
  lanternLit() {
    playTone(523.25, 'sine', 0.4, 0.4);
    setTimeout(() => playTone(659.25, 'sine', 0.5, 0.4), 100);
    setTimeout(() => playTone(783.99, 'sine', 0.6, 0.5), 200);
  },
  pulse() { playTone(320, 'sine', 0.5, 0.5); },
  hit() { playTone(120, 'sawtooth', 0.3, 0.4); },
  jump() { playTone(300, 'sine', 0.18, 0.2); },
  dash() { playTone(500, 'triangle', 0.12, 0.3); },
  charm() {
    playTone(880, 'sine', 0.25, 0.35);
    setTimeout(() => playTone(1174, 'sine', 0.35, 0.35), 100);
  },
  drifterSteal() { playTone(220, 'sawtooth', 0.3, 0.35); },
  win() {
    [523, 659, 783, 1046].forEach((f, idx) => {
      setTimeout(() => playTone(f, 'triangle', 0.5, 0.4), idx * 120);
    });
  },
  lose() {
    [300, 260, 220, 180].forEach((f, idx) => {
      setTimeout(() => playTone(f, 'sawtooth', 0.4, 0.35), idx * 150);
    });
  }
};

// ==========================================
// Initialization & Three.js Scene Setup
// ==========================================
function init() {
  loadSavedSettings();
  const container = document.getElementById('game-container');

  // Scene with standard Fog #1B2350
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0E1430);
  scene.fog = new THREE.FogExp2(0x1B2350, 0.015);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lighting
  ambientLight = new THREE.AmbientLight(0x1B2350, 0.7);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0x8FA3B8, 0.6);
  dirLight.position.set(20, 45, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Pulse effect mesh
  const pulseGeo = new THREE.SphereGeometry(1, 32, 16);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: 0xF2C14E,
    transparent: true,
    opacity: 0,
    wireframe: true
  });
  pulseEffectMesh = new THREE.Mesh(pulseGeo, pulseMat);
  pulseEffectMesh.visible = false;
  scene.add(pulseEffectMesh);

  environmentGroup = new THREE.Group();
  scene.add(environmentGroup);

  setupControls();
  window.addEventListener('resize', onWindowResize);
}

// Build 3D Environments per Night
function buildEnvironment(night) {
  while (environmentGroup.children.length > 0) {
    environmentGroup.remove(environmentGroup.children[0]);
  }

  // Sea of clouds (#12384A)
  const cloudGeo = new THREE.PlaneGeometry(500, 500, 32, 32);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0x12384A,
    roughness: 0.9,
    transparent: true,
    opacity: 0.85
  });
  const cloudPlane = new THREE.Mesh(cloudGeo, cloudMat);
  cloudPlane.rotation.x = -Math.PI / 2;
  cloudPlane.position.y = -8;
  environmentGroup.add(cloudPlane);

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2F5D50, roughness: 0.85 });
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xC9B48A, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4A2F, roughness: 0.8 });

  if (night === 1) {
    // Night 1: Đảo Bến R=40m
    const island = new THREE.Mesh(new THREE.CylinderGeometry(40, 35, 8, 48), grassMat);
    island.position.y = -4;
    island.receiveShadow = true;
    environmentGroup.add(island);
  } else if (night === 2) {
    // Night 2: Đảo Cau: 2 islands R=28m at (0,0) and (70,0)
    const islandA = new THREE.Mesh(new THREE.CylinderGeometry(28, 24, 8, 40), grassMat);
    islandA.position.set(0, -4, 0);
    islandA.receiveShadow = true;
    environmentGroup.add(islandA);

    const islandB = new THREE.Mesh(new THREE.CylinderGeometry(28, 24, 8, 40), sandMat);
    islandB.position.set(70, -4, 0);
    islandB.receiveShadow = true;
    environmentGroup.add(islandB);

    // Bamboo bridge: x in [26, 44], z in [-2, 2]
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), woodMat);
    bridge.position.set(35, -0.2, 0);
    bridge.receiveShadow = true;
    environmentGroup.add(bridge);

    // 2 Launch pads
    createLaunchPadMesh(20, 0.05, 18);
    createLaunchPadMesh(50, 0.05, -18);
  } else if (night === 3) {
    // Night 3: Đảo Chuông: 3 tiers
    // Tier 0: Entire island R=45m, Y=0
    const tier0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 40, 8, 48), grassMat);
    tier0.position.set(0, -4, 0);
    environmentGroup.add(tier0);

    // Tier 1: Half-annulus R in [12, 24], z > 0, Y=3
    const tier1Shape = new THREE.Shape();
    tier1Shape.absarc(0, 0, 24, Math.PI, 2 * Math.PI, false);
    tier1Shape.absarc(0, 0, 12, 2 * Math.PI, Math.PI, true);

    const tier1Geo = new THREE.ExtrudeGeometry(tier1Shape, {
      depth: 3,
      bevelEnabled: false,
      curveSegments: 36
    });
    const tier1 = new THREE.Mesh(tier1Geo, sandMat);
    tier1.rotation.x = -Math.PI / 2;
    tier1.position.set(0, 0, 0);
    tier1.receiveShadow = true;
    environmentGroup.add(tier1);

    // Tier 2: Disc R=8m, Y=6
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 32), grassMat);
    tier2.position.set(0, 3, 0);
    environmentGroup.add(tier2);

    // Bell tower: R=2m cylinder 8m tall on Tier 2
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.2, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x5B5F6E, roughness: 0.7 })
    );
    tower.position.set(0, 10, 0);
    environmentGroup.add(tower);

    // 2 Ramps along 30° and 150°
    createRampMesh(30);
    createRampMesh(150);

    // Tier 1 Launch pad at (0, 3, 13)
    createLaunchPadMesh(0, 3.05, 13);
  }
}

function createLaunchPadMesh(x, y, z) {
  const padGeo = new THREE.CylinderGeometry(1.0, 1.1, 0.1, 24);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x8FA3B8, roughness: 0.4 });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.set(x, y, z);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.95, 24),
    new THREE.MeshBasicMaterial({ color: 0xF2C14E, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  pad.add(ring);

  environmentGroup.add(pad);
}

function createRampMesh(deg) {
  const ang = (deg * Math.PI) / 180;
  const rampGroup = new THREE.Group();

  // Ramp has horizontal run 6m (from R=30 to R=24) and vertical rise 3m (from Y=0 to Y=3)
  // Length along slope: hypot(6, 3) = 6.708m. Width = 3m, thickness = 0.3m.
  const rampBox = new THREE.Mesh(
    new THREE.BoxGeometry(6.708, 0.3, 3),
    new THREE.MeshStandardMaterial({ color: 0x6B4A2F, roughness: 0.85 })
  );
  // Center is at R = 27m, Y = 1.5m
  rampBox.position.set(27, 1.5, 0);
  // Outer end (R=30, x > 27) goes down to Y=0, inner end (R=24, x < 27) goes up to Y=3
  rampBox.rotation.z = -Math.atan2(3, 6);
  rampBox.receiveShadow = true;
  rampGroup.add(rampBox);

  // Rotate group around Y axis so it points at angle deg in XZ plane
  rampGroup.rotation.y = -ang;
  environmentGroup.add(rampGroup);
}

// Bé Mây Player Mesh with Nón Lá & Red Scarf (#C8102E)
function buildPlayerMesh() {
  const group = new THREE.Group();

  // Body: Áo Mây #E8E2D0
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 1.0, 16),
    new THREE.MeshStandardMaterial({ color: 0xE8E2D0 })
  );
  body.position.y = 0.5;
  group.add(body);

  // Red Scarf #C8102E
  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.09, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xC8102E })
  );
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.98;
  group.add(scarf);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffcc80 })
  );
  head.position.y = 1.15;
  group.add(head);

  // Nón Lá
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 0.4, 24),
    new THREE.MeshStandardMaterial({ color: 0xC9B48A, roughness: 0.9 })
  );
  hat.position.y = 1.45;
  group.add(hat);

  // Mini Lantern hanging on hat
  const miniLantern = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.12),
    new THREE.MeshBasicMaterial({ color: 0xFFB347 })
  );
  miniLantern.position.set(0.4, 1.25, 0.2);
  group.add(miniLantern);

  const playerLight = new THREE.PointLight(0xFFB347, 1.5, 6);
  playerLight.position.set(0.4, 1.25, 0.2);
  group.add(playerLight);

  playerMesh = group;
  scene.add(playerMesh);
}

// Sync World Entities
function syncEntities() {
  // 1. Lanterns
  for (const lan of engine.lanterns) {
    if (!lanternMeshes[lan.id]) {
      const g = new THREE.Group();
      // Post (#6B4A2F)
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 2.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x6B4A2F })
      );
      post.position.y = 1.25;
      g.add(post);

      // Cage (#5B5F6E)
      const cage = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7),
        new THREE.MeshStandardMaterial({ color: 0x5B5F6E, roughness: 0.8 })
      );
      cage.position.y = 2.5;
      g.add(cage);

      // Glowing Core
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x5B5F6E })
      );
      core.position.y = 2.5;
      g.add(core);

      // Light
      const pLight = new THREE.PointLight(0xFFB347, 0, 16);
      pLight.position.y = 2.7;
      g.add(pLight);

      // Safe Zone Circle Ring R=6.0m
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(5.85, 6.0, 48),
        new THREE.MeshBasicMaterial({ color: 0xF2C14E, side: THREE.DoubleSide, transparent: true, opacity: 0 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      g.add(ring);

      g.position.set(lan.pos[0], lan.pos[1], lan.pos[2]);
      scene.add(g);
      lanternMeshes[lan.id] = { group: g, core, light: pLight, ring };
    }

    const m = lanternMeshes[lan.id];
    if (lan.lit) {
      m.core.material.color.setHex(0xFFE9B0);
      m.light.intensity = 3.5;
      if (m.ring) {
        m.ring.material.opacity = 0.65;
        m.ring.rotation.z += 0.005;
      }
    } else {
      m.core.material.color.setHex(0x5B5F6E);
      m.light.intensity = 0;
      if (m.ring) m.ring.material.opacity = 0;
    }
  }

  // 2. Motes (Dual-layer emissive, NO PointLight to avoid shader recompilation)
  const currentMoteIds = new Set(engine.motes.map(m => m.id));
  for (const id in moteMeshes) {
    if (!currentMoteIds.has(id)) {
      scene.remove(moteMeshes[id]);
      delete moteMeshes[id];
    }
  }
  for (const mote of engine.motes) {
    if (!moteMeshes[mote.id]) {
      const g = new THREE.Group();
      // Core #FFF6C2
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xFFF6C2 })
      );
      g.add(orb);
      // Halo #FFE58A
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xFFE58A, transparent: true, opacity: 0.35 })
      );
      g.add(halo);
      g.position.y = 0.6;
      scene.add(g);
      moteMeshes[mote.id] = g;
    }
    moteMeshes[mote.id].position.x = mote.pos[0];
    moteMeshes[mote.id].position.y = mote.pos[1] + 0.6;
    moteMeshes[mote.id].position.z = mote.pos[2];
  }

  // 3. Shades (#120A1A with #7A3CFF rim)
  const currentShadeIds = new Set(engine.shades.map(s => s.id));
  for (const id in shadeMeshes) {
    if (!currentShadeIds.has(id)) {
      scene.remove(shadeMeshes[id].mesh);
      delete shadeMeshes[id];
    }
  }
  for (const s of engine.shades) {
    if (!shadeMeshes[s.id]) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.65),
        new THREE.MeshStandardMaterial({ color: 0x120A1A, roughness: 0.9 })
      );
      body.position.y = 0.65;
      g.add(body);

      // Glowing purple eyes #7A3CFF
      const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7A3CFF });
      const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
      eye1.position.set(0.2, 0.8, 0.45);
      const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
      eye2.position.set(-0.2, 0.8, 0.45);
      g.add(eye1);
      g.add(eye2);

      g.position.set(s.pos[0], s.pos[1], s.pos[2]);
      scene.add(g);
      shadeMeshes[s.id] = { mesh: g, body };
    }

    const sm = shadeMeshes[s.id];
    sm.mesh.position.set(s.pos[0], s.pos[1], s.pos[2]);
    if (s.state === 'stunned') {
      sm.body.material.color.setHex(0x3A3450); // Stunned color #3A3450
      sm.body.rotation.y += 0.2;
    } else {
      sm.body.material.color.setHex(0x120A1A);
    }
  }

  // 4. Drifters (#8FA3B8 flowing ribbon)
  const currentDrifterIds = new Set(engine.drifters.map(d => d.id));
  for (const id in drifterMeshes) {
    if (!currentDrifterIds.has(id)) {
      scene.remove(drifterMeshes[id]);
      delete drifterMeshes[id];
    }
  }
  for (const d of engine.drifters) {
    if (!drifterMeshes[d.id]) {
      const g = new THREE.Group();
      const ribbon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.05, 1.6, 12),
        new THREE.MeshStandardMaterial({ color: 0x8FA3B8, roughness: 0.3, transparent: true, opacity: 0.85 })
      );
      ribbon.rotation.x = Math.PI / 2;
      g.add(ribbon);
      g.position.set(d.pos[0], d.pos[1], d.pos[2]);
      scene.add(g);
      drifterMeshes[d.id] = g;
    }
    drifterMeshes[d.id].position.set(d.pos[0], d.pos[1], d.pos[2]);
    drifterMeshes[d.id].rotation.y += 0.05;
  }

  // 5. Charms (Red talisman #C8102E with gold rim #F2C14E)
  for (const c of engine.charms) {
    if (!charmMeshes[c.id]) {
      const g = new THREE.Group();
      const talisman = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.8, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xC8102E, roughness: 0.5 })
      );
      const goldRim = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.84, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xF2C14E })
      );
      g.add(goldRim);
      g.add(talisman);
      g.position.set(c.pos[0], c.pos[1] + 0.6, c.pos[2]);
      scene.add(g);
      charmMeshes[c.id] = g;
    }
    charmMeshes[c.id].visible = Boolean(c.available);
    if (c.available) charmMeshes[c.id].rotation.y += 0.03;
  }
}

// Controls
function setupControls() {
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;

    if (e.key === ' ') {
      keys['space'] = true;
      e.preventDefault();
      AudioSFX.jump();
    }
    if (e.key === 'Shift' || k === 'c') {
      keys['shift'] = true;
      AudioSFX.dash();
    }
    if (e.key === 'Escape' || k === 'p') {
      togglePause();
    }
    if (k === 'f' || k === 'q') {
      AudioSFX.pulse();
    }
    if (k === 'e') {
      AudioSFX.deposit();
    }
  });

  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    keys[k] = false;
    if (e.key === ' ') keys['space'] = false;
    if (e.key === 'Shift' || k === 'c') keys['shift'] = false;
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

      camYaw -= deltaX * 0.005 * mouseSensitivity;
      camPitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, camPitch + deltaY * 0.005 * mouseSensitivity));
    }
  });
}

function updateInput() {
  let mx = 0, mz = 0;
  if (keys['w'] || keys['arrowup']) mz += 1;
  if (keys['s'] || keys['arrowdown']) mz -= 1;
  // User mapping: A = Left, D = Right
  if (keys['a'] || keys['arrowleft']) mx += 1;
  if (keys['d'] || keys['arrowright']) mx -= 1;

  const deg = (camYaw * 180 / Math.PI) % 360;
  engine.setInput({
    move: [mx, mz],
    cam_yaw_deg: deg,
    jump: Boolean(keys[' '] || keys['space']),
    dash: Boolean(keys['shift'] || keys['c']),
    interact: Boolean(keys['e']),
    pulse: Boolean(keys['f'] || keys['q']),
    pause: false
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
  setTimeout(() => { flash.classList.remove('active'); }, 300);
}

function triggerPulseVisual() {
  if (pulseEffectMesh) {
    pulseEffectMesh.position.set(engine.player.pos[0], engine.player.pos[1] + 0.8, engine.player.pos[2]);
    pulseEffectMesh.scale.set(0.1, 0.1, 0.1);
    pulseEffectMesh.visible = true;
    pulseEffectMesh.material.opacity = 0.85;
  }
}

function handleGameEvent(evt) {
  if (evt.name === 'mote_picked') {
    AudioSFX.mote();
  } else if (evt.name === 'deposit') {
    AudioSFX.deposit();
    showToast(`🏮 Nạp ${evt.data.amount} đom đóm vào ${evt.data.lantern_id} (${evt.data.deposited}/${engine.tuning.lantern_cost})`);
  } else if (evt.name === 'lantern_lit') {
    AudioSFX.lanternLit();
    showToast(`🎉 ${evt.data.lantern_id} ĐÃ ĐƯỢC THẮP SÁNG! Vùng an toàn 6m mở rộng!`);
  } else if (evt.name === 'pulse') {
    AudioSFX.pulse();
    triggerPulseVisual();
    showToast(`💫 TỎA SÁNG! Đẩy lùi ${evt.data.stunned_ids.length} quái vật!`);
  } else if (evt.name === 'player_hit') {
    AudioSFX.hit();
    triggerFlashDamage();
    if (evt.data.by === 'fall') {
      showToast(`⚠️ Mây rơi xuống biển mây! Mất 1 Ngọn Lửa và toàn bộ đom đóm!`);
    } else {
      showToast(`💔 Bị Bóng Mực tấn công! Rơi ${evt.data.dropped} đom đóm!`);
    }
  } else if (evt.name === 'dash') {
    AudioSFX.dash();
  } else if (evt.name === 'charm_picked') {
    AudioSFX.charm();
    showToast(`✨ Nhặt được BÙA GIÓ! Tăng tốc và LƯỚT KHÔNG HỒI CHIÊU trong 10s!`);
  } else if (evt.name === 'drifter_steal') {
    AudioSFX.drifterSteal();
    showToast(`💨 Gió Lạc cướp mất ${evt.data.amount} đom đóm của Mây!`);
  } else if (evt.name === 'drifter_drop') {
    AudioSFX.lanternLit();
    showToast(`🎉 Tỏa Sáng trúng Gió Lạc! ${evt.data.amount} đom đóm rơi lại đảo!`);
  }
}

// HUD Updating
function updateHUD() {
  const flamesStr = '❤️'.repeat(Math.max(0, engine.player.flames));
  document.getElementById('hud-flames').innerText = flamesStr || '💀 Hết';

  const nightTitles = ["", "1: Đảo Bến", "2: Đảo Cau", "3: Đảo Chuông"];
  document.getElementById('hud-night').innerText = nightTitles[currentNight];

  // Timer mm:ss
  const totalSec = Math.ceil(engine.time_left_s);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  const timerEl = document.getElementById('hud-timer');
  timerEl.innerText = timeStr;
  if (totalSec <= 30) {
    timerEl.classList.add('urgent');
    if (totalSec <= 10 && totalSec > 0 && Math.floor(engine.time_left_s * 60) % 60 === 0) {
      playTone(800, 'triangle', 0.05, 0.2);
    }
  } else {
    timerEl.classList.remove('urgent');
  }

  // Lanterns & Score
  const litCount = engine.lanterns.filter(l => l.lit).length;
  document.getElementById('hud-lanterns').innerText = `${litCount} / ${engine.lanterns.length}`;
  document.getElementById('hud-score').innerText = engine.score + totalGameScore;

  // Standard progressive ambient light formula: 0.15 + 0.55 * (lit / total)
  if (ambientLight) {
    ambientLight.intensity = 0.15 + 0.55 * (litCount / (engine.lanterns.length || 1));
  }

  // 10-slot Mote Bag UI
  document.getElementById('bag-count').innerText = engine.player.carried;
  const slots = document.getElementById('mote-slots').children;
  for (let i = 0; i < slots.length; i++) {
    if (i < engine.player.carried) {
      slots[i].classList.add('filled');
    } else {
      slots[i].classList.remove('filled');
    }
  }

  // Skill Cooldown Bars
  const dashCdEl = document.getElementById('cd-dash');
  if (engine.player.charm_timer > 0) {
    dashCdEl.style.height = '0%';
  } else {
    const dashRatio = engine.player.dash_cd_timer / (engine.tuning.dash_cooldown_s * 60);
    dashCdEl.style.height = `${Math.min(100, dashRatio * 100)}%`;
  }

  const pulseCdEl = document.getElementById('cd-pulse');
  const pulseRatio = engine.player.pulse_cooldown / (engine.tuning.pulse_cooldown_s * 60);
  pulseCdEl.style.height = `${Math.min(100, pulseRatio * 100)}%`;

  // Interaction prompt
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
    prompt.innerHTML = `💡 Bấm <b>[E]</b> — Nạp ánh sáng vào <b>${nearLantern.id}</b> (${nearLantern.deposited}/${engine.tuning.lantern_cost})`;
  } else if (prompt) {
    prompt.classList.add('hidden');
  }

  // Offscreen Compass / Pointer to closest unlit lantern
  const pointer = document.getElementById('lantern-pointer');
  let closestUnlit = null;
  let closestDist = Infinity;
  for (const lan of engine.lanterns) {
    if (!lan.lit) {
      const d = Math.hypot(engine.player.pos[0] - lan.pos[0], engine.player.pos[2] - lan.pos[2]);
      if (d < closestDist) {
        closestDist = d;
        closestUnlit = lan;
      }
    }
  }
  if (closestUnlit && pointer && closestDist > 14) {
    pointer.classList.remove('hidden');
    const dx = closestUnlit.pos[0] - engine.player.pos[0];
    const dz = closestUnlit.pos[2] - engine.player.pos[2];
    const worldAngle = Math.atan2(dx, dz);
    const arrowAngle = (worldAngle - camYaw) * (180 / Math.PI);
    pointer.querySelector('.pointer-arrow').style.transform = `rotate(${arrowAngle}deg)`;
    pointer.querySelector('.pointer-text').innerText = `${closestUnlit.id} (${Math.round(closestDist)}m)`;
  } else if (pointer) {
    pointer.classList.add('hidden');
  }

  // Win / Loss Overlay
  const overlay = document.getElementById('message-overlay');
  const title = document.getElementById('overlay-title');
  const desc = document.getElementById('overlay-desc');
  const details = document.getElementById('overlay-score-details');
  const btnNext = document.getElementById('btn-next-night');

  if (engine.state === 'won') {
    overlay.classList.remove('hidden');
    if (currentNight === 3) {
      title.innerText = '🌅 BÌNH MINH TRÊN QUẦN ĐẢO!';
      desc.innerText = 'Mây đã hoàn thành xuất sắc cả 3 Đêm! Ánh nắng ban mai rạng rỡ trở lại.';
      btnNext.classList.add('hidden');
    } else {
      title.innerText = `🎉 Hoàn Thành Đêm ${currentNight}!`;
      desc.innerText = `Mây đã thắp sáng toàn bộ ngọn đèn trên đảo!`;
      btnNext.classList.remove('hidden');
    }
    details.innerHTML = `Điểm Đêm này: <b>${engine.score}</b> | Tổng điểm tích lũy: <b>${engine.score + totalGameScore}</b>`;
  } else if (engine.state === 'lost') {
    overlay.classList.remove('hidden');
    btnNext.classList.add('hidden');
    title.innerText = '🌧️ Thất Bại';
    desc.innerText = (engine.player.flames <= 0)
      ? 'Mây đã hết Ngọn Lửa sinh mệnh!'
      : 'Trời đã rạng sáng trước khi kịp thắp hết đèn!';
    details.innerHTML = `Hãy thử lại Đêm ${currentNight} để vượt qua thử thách nhé!`;
  } else if (engine.state === 'playing') {
    overlay.classList.add('hidden');
  }
}

// Flow & Transitions
function startGame(night = 1) {
  currentNight = night;
  if (night === 1) totalGameScore = 0;
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('night-select-dialog').classList.add('hidden');

  const intros = {
    1: {
      title: "Đêm 1: Đảo Bến",
      dialogue: `"Đêm nay sương buông dày lắm, Mây à. Hãy thu gom những chú đom đóm vàng và thắp sáng toàn bộ 5 ngọn đèn lồng lớn để giữ ấm Đảo Bến nhé!"`
    },
    2: {
      title: "Đêm 2: Đảo Cau",
      dialogue: `"Đảo Cau gồm 2 đảo lớn nối bằng cầu tre lộng gió. Hãy dùng bục phóng để bay qua lại và coi chừng Gió Lạc sẽ cướp đom đóm của con!"`
    },
    3: {
      title: "Đêm 3: Đảo Chuông",
      dialogue: `"Đảo Chuông có 3 tầng đá dựng đứng và tháp chuông cổ. Gió mạnh sẽ thổi theo từng cơn và Bóng Mực di chuyển rất nhanh. Hãy cẩn trọng từng bước chân!"`
    }
  };

  document.getElementById('intro-night-title').innerText = intros[night].title;
  document.getElementById('intro-dialogue').innerText = intros[night].dialogue;
  document.getElementById('night-intro').classList.remove('hidden');
}

function startCurrentNight() {
  document.getElementById('night-intro').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');

  buildEnvironment(currentNight);
  buildPlayerMesh();

  engine = new GameEngine(null, Date.now(), currentNight);
  engine.applyScenario(null);

  lanternMeshes = {};
  moteMeshes = {};
  shadeMeshes = {};
  drifterMeshes = {};
  charmMeshes = {};

  syncEntities();
  lastTickTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function restartCurrentNight() {
  document.getElementById('pause-menu').classList.add('hidden');
  document.getElementById('message-overlay').classList.add('hidden');

  for (const id in moteMeshes) scene.remove(moteMeshes[id]);
  moteMeshes = {};
  for (const id in shadeMeshes) scene.remove(shadeMeshes[id].mesh);
  shadeMeshes = {};
  for (const id in drifterMeshes) scene.remove(drifterMeshes[id]);
  drifterMeshes = {};
  for (const id in lanternMeshes) scene.remove(lanternMeshes[id].group);
  lanternMeshes = {};
  for (const id in charmMeshes) scene.remove(charmMeshes[id]);
  charmMeshes = {};

  engine = new GameEngine(null, Date.now(), currentNight);
  engine.applyScenario(null);
  syncEntities();

  lastTickTime = performance.now();
  keys = {};
}

function proceedNextNight() {
  totalGameScore += engine.score;
  document.getElementById('message-overlay').classList.add('hidden');
  startGame(currentNight + 1);
}

function returnToMainMenu() {
  document.getElementById('pause-menu').classList.add('hidden');
  document.getElementById('message-overlay').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('main-menu').classList.remove('hidden');
}

function togglePause() {
  if (!engine) return;
  if (engine.state === 'playing') {
    engine.state = 'paused';
    document.getElementById('pause-menu').classList.remove('hidden');
  } else if (engine.state === 'paused') {
    resumeGame();
  }
}

function resumeGame() {
  if (engine && engine.state === 'paused') {
    engine.state = 'playing';
    document.getElementById('pause-menu').classList.add('hidden');
    lastTickTime = performance.now();
  }
}

// Main Game Loop
function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  if (!engine || engine.state === 'paused') return;

  if (now - lastTickTime > 150) {
    lastTickTime = now;
  }

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
    moteMeshes[id].position.y = (moteMeshes[id].position.y || 0.6) + Math.sin(t + parseInt(id.slice(1) || 0)) * 0.005;
  }

  // Sync entity positions
  syncEntities();
  if (playerMesh) {
    playerMesh.position.set(engine.player.pos[0], engine.player.pos[1], engine.player.pos[2]);

    // Invulnerability flicker
    if (engine.player.invuln_timer > 0) {
      playerMesh.visible = (Math.floor(now / 80) % 2 === 0);
    } else {
      playerMesh.visible = true;
    }

    // Character rotation facing
    const [vx, , vz] = engine.player.vel || [0, 0, 0];
    if (Math.hypot(vx, vz) > 0.1) {
      playerMesh.rotation.y = Math.atan2(vx, vz);
    }
  }

  // 3rd Person Follow Camera
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
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.onload = init;
