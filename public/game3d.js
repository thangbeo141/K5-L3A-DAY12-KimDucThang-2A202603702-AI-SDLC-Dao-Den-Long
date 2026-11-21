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
let gameLoopRunning = false;
let isColorblindMode = false;

// Settings & LocalStorage
function applyColorblindMode() {
  if (isColorblindMode) {
    document.body.classList.add('colorblind-mode');
  } else {
    document.body.classList.remove('colorblind-mode');
  }
}

function loadSavedSettings() {
  try {
    const v = localStorage.getItem('dao_den_long_vol');
    if (v !== null) soundVolume = parseFloat(v);
    const s = localStorage.getItem('dao_den_long_sens');
    if (s !== null) mouseSensitivity = parseFloat(s);
    const cb = localStorage.getItem('dao_den_long_colorblind');
    if (cb !== null) isColorblindMode = (cb === 'true');
  } catch (e) {}

  const volEl = document.getElementById('setting-volume');
  const sensEl = document.getElementById('setting-sens');
  const cbEl = document.getElementById('setting-colorblind');
  if (volEl) volEl.value = Math.round(soundVolume * 100);
  if (sensEl) sensEl.value = Math.round(mouseSensitivity * 10);
  if (cbEl) cbEl.checked = isColorblindMode;
  const volVal = document.getElementById('volume-val');
  const sensVal = document.getElementById('sens-val');
  const cbVal = document.getElementById('cb-val');
  if (volVal) volVal.innerText = `${Math.round(soundVolume * 100)}%`;
  if (sensVal) sensVal.innerText = `${mouseSensitivity.toFixed(1)}x`;
  if (cbVal) cbVal.innerText = isColorblindMode ? 'Bật' : 'Tắt';
  applyColorblindMode();
}

function updateSettings() {
  const volEl = document.getElementById('setting-volume');
  const sensEl = document.getElementById('setting-sens');
  const cbEl = document.getElementById('setting-colorblind');
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
  if (cbEl) {
    isColorblindMode = cbEl.checked;
    const cbVal = document.getElementById('cb-val');
    if (cbVal) cbVal.innerText = isColorblindMode ? 'Bật' : 'Tắt';
    try { localStorage.setItem('dao_den_long_colorblind', isColorblindMode.toString()); } catch (e) {}
    applyColorblindMode();
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
  const stoneCliffMat = new THREE.MeshStandardMaterial({ color: 0x484B56, roughness: 0.9, side: THREE.DoubleSide });
  const tier1FloorMat = new THREE.MeshStandardMaterial({ color: 0xC9B48A, roughness: 0.85, side: THREE.DoubleSide });
  const tier2FloorMat = new THREE.MeshStandardMaterial({ color: 0x366352, roughness: 0.8, side: THREE.DoubleSide });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide });

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
    // Tier 0: Entire island R=45m, Y=0 (from Y=-8 to Y=0)
    const tier0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 40, 8, 48), grassMat);
    tier0.position.set(0, -4, 0);
    tier0.receiveShadow = true;
    environmentGroup.add(tier0);

    // Tier 1: Half-annulus R in [12, 24], Z > 0, Y=3 with cliff walls and end caps
    createTier1Mesh(tier1FloorMat, stoneCliffMat);

    // 2 Ramps width 3m along 30° and 150° (from R=30, Y=0 to R=24, Y=3)
    createRampMesh(30, woodMat);
    createRampMesh(150, woodMat);

    // Tier 2: Disc R=8m, Y=6 (from Y=0 to Y=6) with golden rim
    createTier2Mesh(tier2FloorMat, stoneCliffMat, goldTrimMat);

    // Bell Tower: R=2m cylinder 8m tall on Tier 2 with pagoda roof and golden bell
    createBellTowerMesh(goldTrimMat);

    // Tier 1 Launch pad at (0, 3.05, 13)
    createLaunchPadMesh(0, 3.05, 13);
  }
}

function createTier1Mesh(floorMat, cliffMat) {
  const group = new THREE.Group();
  const N = 48; // segments for half circle
  const R_in = 12.0;
  const R_out = 24.0;
  const H = 3.0;

  // 1. Top floor (Y = 3.0, R in [12, 24], Z >= 0, angle 0 to PI)
  const floorPositions = [];
  const floorNormals = [];

  for (let i = 0; i < N; i++) {
    const a1 = (i / N) * Math.PI;
    const a2 = ((i + 1) / N) * Math.PI;

    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const c2 = Math.cos(a2), s2 = Math.sin(a2);

    const in1 = [R_in * c1, H, R_in * s1];
    const in2 = [R_in * c2, H, R_in * s2];
    const out1 = [R_out * c1, H, R_out * s1];
    const out2 = [R_out * c2, H, R_out * s2];

    // Triangle 1
    floorPositions.push(...in1, ...out1, ...out2);
    floorNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);

    // Triangle 2
    floorPositions.push(...in1, ...out2, ...in2);
    floorNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }

  const floorGeo = new THREE.BufferGeometry();
  floorGeo.setAttribute('position', new THREE.Float32BufferAttribute(floorPositions, 3));
  floorGeo.setAttribute('normal', new THREE.Float32BufferAttribute(floorNormals, 3));
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // 2. Cliff walls: outer wall (R=24), inner wall (R=12), and end caps at Z=0
  const wallPositions = [];
  const wallNormals = [];

  // Outer cliff wall (R = 24.0, from Y=0 to Y=3 in Z > 0)
  for (let i = 0; i < N; i++) {
    const a1 = (i / N) * Math.PI;
    const a2 = ((i + 1) / N) * Math.PI;

    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const c2 = Math.cos(a2), s2 = Math.sin(a2);

    const b1 = [R_out * c1, 0.0, R_out * s1];
    const t1 = [R_out * c1, H, R_out * s1];
    const b2 = [R_out * c2, 0.0, R_out * s2];
    const t2 = [R_out * c2, H, R_out * s2];

    wallPositions.push(...b1, ...t1, ...t2);
    wallNormals.push(c1, 0, s1, c1, 0, s1, c2, 0, s2);

    wallPositions.push(...b1, ...t2, ...b2);
    wallNormals.push(c1, 0, s1, c2, 0, s2, c2, 0, s2);
  }

  // Inner cliff wall (R = 12.0, from Y=0 to Y=3 in Z > 0, facing inward)
  for (let i = 0; i < N; i++) {
    const a1 = (i / N) * Math.PI;
    const a2 = ((i + 1) / N) * Math.PI;

    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const c2 = Math.cos(a2), s2 = Math.sin(a2);

    const b1 = [R_in * c1, 0.0, R_in * s1];
    const t1 = [R_in * c1, H, R_in * s1];
    const b2 = [R_in * c2, 0.0, R_in * s2];
    const t2 = [R_in * c2, H, R_in * s2];

    wallPositions.push(...b1, ...t2, ...t1);
    wallNormals.push(-c1, 0, -s1, -c2, 0, -s2, -c1, 0, -s1);

    wallPositions.push(...b1, ...b2, ...t2);
    wallNormals.push(-c1, 0, -s1, -c2, 0, -s2, -c2, 0, -s2);
  }

  // End Cap 1: at angle 0 (Z=0, X in [12, 24], Y in [0, 3], normal = [0, 0, -1])
  const e1_b1 = [R_in, 0, 0];
  const e1_t1 = [R_in, H, 0];
  const e1_b2 = [R_out, 0, 0];
  const e1_t2 = [R_out, H, 0];
  wallPositions.push(...e1_b1, ...e1_t2, ...e1_t1);
  wallNormals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
  wallPositions.push(...e1_b1, ...e1_b2, ...e1_t2);
  wallNormals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);

  // End Cap 2: at angle PI (Z=0, X in [-24, -12], Y in [0, 3], normal = [0, 0, -1])
  const e2_b1 = [-R_out, 0, 0];
  const e2_t1 = [-R_out, H, 0];
  const e2_b2 = [-R_in, 0, 0];
  const e2_t2 = [-R_in, H, 0];
  wallPositions.push(...e2_b1, ...e2_t2, ...e2_t1);
  wallNormals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
  wallPositions.push(...e2_b1, ...e2_b2, ...e2_t2);
  wallNormals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);

  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
  wallGeo.setAttribute('normal', new THREE.Float32BufferAttribute(wallNormals, 3));
  const wallMesh = new THREE.Mesh(wallGeo, cliffMat);
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  environmentGroup.add(group);
}

function createRampMesh(deg, rampMat) {
  const ang = (deg * Math.PI) / 180;
  const c = Math.cos(ang);
  const s = Math.sin(ang);

  // Perpendicular unit vector across ramp width
  const halfW = 1.5; // width = 3m
  const px = -s * halfW;
  const pz = c * halfW;

  // Foot of ramp at R = 30m, Y = 0.0
  const fx = 30.0 * c;
  const fz = 30.0 * s;
  const fL = [fx - px, 0.02, fz - pz];
  const fR = [fx + px, 0.02, fz + pz];

  // Top of ramp at R = 24m, Y = 3.0
  const tx = 24.0 * c;
  const tz = 24.0 * s;
  const tL = [tx - px, 3.02, tz - pz];
  const tR = [tx + px, 3.02, tz + pz];

  // Upward slope normal:
  // Run = -6m (towards center), Rise = +3m
  const nRaw = [3.0 * pz, 6.0, -3.0 * px];
  const nLen = Math.hypot(nRaw[0], nRaw[1], nRaw[2]) || 1;
  const nx = nRaw[0] / nLen, ny = nRaw[1] / nLen, nz = nRaw[2] / nLen;

  const positions = [];
  const normals = [];

  // Top ramp walking surface
  positions.push(...fL, ...tL, ...tR);
  normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);

  positions.push(...fL, ...tR, ...fR);
  normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);

  // Left solid side skirt down to Y=0
  const fL_b = [fL[0], 0, fL[2]];
  const tL_b = [tL[0], 0, tL[2]];
  positions.push(...fL_b, ...tL, ...fL);
  normals.push(-s, 0, c, -s, 0, c, -s, 0, c);
  positions.push(...fL_b, ...tL_b, ...tL);
  normals.push(-s, 0, c, -s, 0, c, -s, 0, c);

  // Right solid side skirt down to Y=0
  const fR_b = [fR[0], 0, fR[2]];
  const tR_b = [tR[0], 0, tR[2]];
  positions.push(...fR_b, ...fR, ...tR);
  normals.push(s, 0, -c, s, 0, -c, s, 0, -c);
  positions.push(...fR_b, ...tR, ...tR_b);
  normals.push(s, 0, -c, s, 0, -c, s, 0, -c);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  const mat = rampMat.clone();
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  environmentGroup.add(mesh);
}

function createTier2Mesh(floorMat, cliffMat, goldMat) {
  const group = new THREE.Group();

  // Tier 2 cylinder: R=8m, height 6m (from Y=0 to Y=6, center Y=3)
  const cylGeo = new THREE.CylinderGeometry(8.0, 8.0, 6.0, 48);
  const materials = [cliffMat, floorMat, cliffMat];
  const cylMesh = new THREE.Mesh(cylGeo, materials);
  cylMesh.position.set(0, 3.0, 0);
  cylMesh.receiveShadow = true;
  group.add(cylMesh);

  // Golden edge border around Tier 2 at Y=6.03
  const rimGeo = new THREE.RingGeometry(7.8, 8.0, 48);
  const rimMesh = new THREE.Mesh(rimGeo, goldMat);
  rimMesh.rotation.x = -Math.PI / 2;
  rimMesh.position.set(0, 6.03, 0);
  group.add(rimMesh);

  environmentGroup.add(group);
}

function createBellTowerMesh(goldMat) {
  const group = new THREE.Group();

  // Tower stone cylinder: R=2m, height 8m (from Y=6 to Y=14, center at Y=10)
  const towerGeo = new THREE.CylinderGeometry(2.0, 2.1, 8.0, 24);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x4A4E5A, roughness: 0.85 });
  const towerMesh = new THREE.Mesh(towerGeo, towerMat);
  towerMesh.position.set(0, 10.0, 0);
  towerMesh.receiveShadow = true;
  group.add(towerMesh);

  // Pagoda roof eave at Y=14.0
  const roofGeo = new THREE.ConeGeometry(3.3, 1.4, 8);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8B2500, roughness: 0.6 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 14.7, 0);
  group.add(roof);

  // Golden spire at the tip
  const spireGeo = new THREE.CylinderGeometry(0.1, 0.4, 2.0, 8);
  const spire = new THREE.Mesh(spireGeo, goldMat);
  spire.position.set(0, 16.2, 0);
  group.add(spire);

  // Golden Ancient Bell hanging in the tower (at Y=10.8)
  const bellGeo = new THREE.CylinderGeometry(0.6, 1.0, 1.6, 16);
  const bell = new THREE.Mesh(bellGeo, goldMat);
  bell.position.set(0, 10.8, 0);
  group.add(bell);

  environmentGroup.add(group);
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

  // Glowing center
  const centerOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x00E5FF })
  );
  centerOrb.position.y = 0.15;
  pad.add(centerOrb);

  environmentGroup.add(pad);
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

      // Tear mark slits on cage for unlit state
      const tearGroup = new THREE.Group();
      const tearMat = new THREE.LineBasicMaterial({ color: 0x1A1515 });
      const tearGeo1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.35, 2.7, 0.45),
        new THREE.Vector3(0.2, 2.3, 0.45)
      ]);
      const tearGeo2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.15, 2.4, 0.45),
        new THREE.Vector3(0.35, 2.6, 0.45)
      ]);
      tearGroup.add(new THREE.Line(tearGeo1, tearMat));
      tearGroup.add(new THREE.Line(tearGeo2, tearMat));
      g.add(tearGroup);

      // Glowing Core
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x5B5F6E })
      );
      core.position.y = 2.5;
      g.add(core);

      // 3D Fuel Bar above lantern
      const fuelBarGroup = new THREE.Group();
      fuelBarGroup.position.set(0, 3.5, 0);
      const barBg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x1A1D24, side: THREE.DoubleSide })
      );
      fuelBarGroup.add(barBg);

      const barFillGeo = new THREE.PlaneGeometry(1.16, 0.08);
      barFillGeo.translate(0.58, 0, 0); // pivot left edge
      const barFill = new THREE.Mesh(
        barFillGeo,
        new THREE.MeshBasicMaterial({ color: 0x52D172, side: THREE.DoubleSide })
      );
      barFill.position.x = -0.58;
      fuelBarGroup.add(barFill);
      g.add(fuelBarGroup);

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
      lanternMeshes[lan.id] = { group: g, core, light: pLight, ring, fuelBar: fuelBarGroup, barFill, tearMarks: tearGroup };
    }

    const m = lanternMeshes[lan.id];
    if (lan.lit) {
      m.group.scale.set(1.0, 1.0, 1.0);
      m.tearMarks.visible = false;
      m.fuelBar.visible = true;
      if (camera) m.fuelBar.quaternion.copy(camera.quaternion);

      const fuelRatio = Math.max(0, Math.min(1.0, lan.fuel / 100.0));
      m.barFill.scale.x = fuelRatio;

      const isLow = (lan.fuel < 30.0);
      if (isLow) {
        // 1 Hz Blink when fuel < 30
        const blinkOn = Math.floor(performance.now() / 500) % 2 === 0;
        if (blinkOn) {
          m.core.material.color.setHex(0xFFE9B0);
          m.light.intensity = 3.5;
          m.barFill.material.color.setHex(isColorblindMode ? 0xFFFFFF : 0xFF5A5F);
        } else {
          m.core.material.color.setHex(0x5B5F6E);
          m.light.intensity = 0.4;
          m.barFill.material.color.setHex(0x333333);
        }
        // Safe zone is lost when fuel < 30
        if (m.ring) m.ring.material.opacity = 0;
      } else {
        m.core.material.color.setHex(0xFFE9B0);
        m.light.intensity = 3.5;
        m.barFill.material.color.setHex(0x52D172);
        if (m.ring) {
          m.ring.material.opacity = 0.65;
          m.ring.rotation.z += 0.005;
        }
      }
    } else {
      // Unlit: 20% vertical squish and visible tear marks
      m.group.scale.set(1.0, 0.8, 1.0);
      m.tearMarks.visible = true;
      m.fuelBar.visible = false;
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
      shadeMeshes[s.id] = { mesh: g, body, eye1, eye2 };
    }

    const sm = shadeMeshes[s.id];
    sm.mesh.position.set(s.pos[0], s.pos[1], s.pos[2]);

    // Colorblind mode: eyes and rim change from #7A3CFF to #00B3FF
    const eyeColor = isColorblindMode ? 0x00B3FF : 0x7A3CFF;
    sm.eye1.material.color.setHex(eyeColor);
    sm.eye2.material.color.setHex(eyeColor);

    if (s.state === 'stunned') {
      sm.body.material.color.setHex(0x3A3450); // Stunned color #3A3450
      sm.body.rotation.y += 0.2;
    } else if (s.state === 'drain') {
      sm.body.material.color.setHex(isColorblindMode ? 0x004466 : 0x2A153A); // Draining posture
      sm.body.rotation.y += 0.05;
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
    showToast(`🏮 Nạp ${evt.data.amount} đom đóm vào ${evt.data.lantern_id} (${evt.data.deposited})`);
  } else if (evt.name === 'refuel') {
    AudioSFX.deposit();
    showToast(`⛽ Châm ${evt.data.amount} đom đóm vào ${evt.data.lantern_id} (Dầu: ${evt.data.fuel}/100)`);
  } else if (evt.name === 'lantern_out') {
    AudioSFX.hit();
    showToast(`⚠️ Đèn ${evt.data.lantern_id} đã cạn sạch dầu và tắt!`);
  } else if (evt.name === 'lantern_lit') {
    AudioSFX.lanternLit();
    const litMsg = evt.data.relight ? "THẮP LẠI THÀNH CÔNG" : "ĐÃ ĐƯỢC THẮP SÁNG";
    showToast(`🎉 ${evt.data.lantern_id} ${litMsg}! Vùng an toàn 6m mở rộng!`);
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

  // Dynamic Mote Bag UI (Carried / Dynamic Capacity up to 20)
  const cap = engine.player.capacity || 10;
  const bagCapEl = document.getElementById('bag-capacity');
  if (bagCapEl) bagCapEl.innerText = cap;
  document.getElementById('bag-count').innerText = engine.player.carried;

  const slotContainer = document.getElementById('mote-slots');
  if (slotContainer) {
    while (slotContainer.children.length < cap) {
      const div = document.createElement('div');
      div.className = 'slot';
      slotContainer.appendChild(div);
    }
    while (slotContainer.children.length > cap) {
      slotContainer.removeChild(slotContainer.lastChild);
    }
    const slots = slotContainer.children;
    for (let i = 0; i < slots.length; i++) {
      if (i < engine.player.carried) {
        slots[i].classList.add('filled');
      } else {
        slots[i].classList.remove('filled');
      }
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

  // Interaction prompt (Considers unlit lanterns or lit lanterns with fuel < 100)
  const prompt = document.getElementById('interact-prompt');
  let candidate = null;
  let minD = Infinity;
  for (const lan of engine.lanterns) {
    const canReceive = !lan.lit || (lan.lit && lan.fuel < 100);
    if (canReceive) {
      const d = Math.hypot(engine.player.pos[0] - lan.pos[0], engine.player.pos[2] - lan.pos[2]);
      if (d <= engine.tuning.interact_radius && d < minD) {
        minD = d;
        candidate = lan;
      }
    }
  }
  if (candidate && prompt) {
    prompt.classList.remove('hidden');
    if (!candidate.lit) {
      const cost = candidate.ever_lit ? engine.tuning.relight_cost : engine.tuning.lantern_cost;
      const actText = candidate.ever_lit ? "Thắp lại đèn (5 đom đóm)" : "Nạp ánh sáng";
      prompt.innerHTML = `💡 Bấm <b>[E]</b> — ${actText} vào <b>${candidate.id}</b> (${candidate.deposited}/${cost})`;
    } else {
      prompt.innerHTML = `⛽ Bấm <b>[E]</b> — Châm dầu vào <b>${candidate.id}</b> (Dầu: ${Math.round(candidate.fuel)}/100)`;
    }
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
      desc.innerText = 'Mây đã kiên cường giữ đảo sáng rạng ngời và sống sót qua cả 3 Đêm!';
      btnNext.classList.add('hidden');
    } else {
      title.innerText = `🌅 Sống Sót Tới Bình Minh Đêm ${currentNight}!`;
      desc.innerText = `Mây đã bảo vệ hòn đảo an toàn trước bóng tối cho tới khi mặt trời mọc!`;
      btnNext.classList.remove('hidden');
    }
    details.innerHTML = `Điểm Đêm này: <b>${engine.score}</b> | Tổng điểm tích lũy: <b>${engine.score + totalGameScore}</b><br><small>Thưởng bình minh: +50/ngọn lửa & +50 + [dầu]/đèn đang sáng!</small>`;
  } else if (engine.state === 'lost') {
    overlay.classList.remove('hidden');
    btnNext.classList.add('hidden');
    title.innerText = '🌧️ Thất Bại';
    desc.innerText = (engine.player.flames <= 0)
      ? 'Mây đã hết Ngọn Lửa sinh mệnh!'
      : 'Trời đã rạng sáng nhưng không đủ 60% ngọn đèn được thắp sáng!';
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

  // Clean up all entity meshes from previous night
  if (playerMesh) {
    scene.remove(playerMesh);
    playerMesh = null;
  }
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

  buildEnvironment(currentNight);
  buildPlayerMesh();

  engine = new GameEngine(null, Date.now(), currentNight);
  engine.applyScenario(null);

  syncEntities();
  lastTickTime = performance.now();
  if (!gameLoopRunning) {
    gameLoopRunning = true;
    requestAnimationFrame(gameLoop);
  }
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
