// 推幣機試玩版：檯面、推板、投幣、幣掉下去加錢。
import * as THREE from './lib/three.module.js';
import RAPIER from './lib/rapier.mjs';

await RAPIER.init();

// ===== 數值（之後調手感主要改這裡） =====
const TABLE_W = 8;           // 檯面寬
const FRONT_Z = 2;           // 檯面前緣（幣掉過這裡就算贏）
const BACK_Z = -10;          // 檯面最後面
const WALL_Z = -6.3;         // 推板上方擋牆的位置
const PUSHER_DEPTH = 5;      // 推板前後長度
const PUSHER_H = 0.6;        // 推板高度
const PUSHER_MID = -6;       // 推板中心來回的中點
const PUSHER_AMP = 1.2;      // 推板來回的幅度
const PUSHER_PERIOD = 3.2;   // 推板來回一次幾秒
const COIN_R = 0.38;
const COIN_H = 0.1;
const DROP_Y = 3.2;          // 投幣高度
const DROP_Z = -4.6;         // 投幣的前後位置（推板上方）
const STEP = 1 / 60;           // 物理一步的秒數
const START_WALLET = 30;
const START_COINS = 200;     // 一開檯面上已經有的幣
const MAX_COINS = 420;       // 檯面上幣的上限（保護效能）
const DROP_GAP = 0.28;       // 按住連投的間隔秒數
const REFILL_BELOW = 10;     // 手上少於這個數就會慢慢補
const REFILL_SEC = 6;        // 每幾秒補 1 枚

// ===== 狀態 =====
let wallet = START_WALLET;
let won = 0;
let aimX = 0;
let pointerDown = false;
let lastDrop = -1;
let refillTimer = 0;
let simTime = 0;
const coins = [];

// ===== 畫面 =====
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14121c);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xfff4e0, 0x302840, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(4, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 10, bottom: -10, near: 1, far: 40 });
scene.add(sun);
const warm = new THREE.PointLight(0xffb85c, 14, 20);
warm.position.set(0, 5, 2);
scene.add(warm);

// ===== 物理 =====
const world = new RAPIER.World({ x: 0, y: -19.6, z: 0 });
world.timestep = 1 / 60;
const TABLE_FRICTION = 0.3;
const COIN_FRICTION = 0.3;

function addBox(hx, hy, hz, x, y, z, color, opts = {}) {
  const desc = opts.kinematic ? RAPIER.RigidBodyDesc.kinematicPositionBased() : RAPIER.RigidBodyDesc.fixed();
  const body = world.createRigidBody(desc.setTranslation(x, y, z));
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(TABLE_FRICTION).setRestitution(0.05), body);
  let mesh = null;
  if (color !== null) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: opts.metal ?? 0.1,
      roughness: opts.rough ?? 0.8,
      transparent: !!opts.opacity,
      opacity: opts.opacity ?? 1,
    });
    mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = !opts.opacity;
    scene.add(mesh);
  }
  return { body, mesh };
}

const halfW = TABLE_W / 2;
const tableLen = FRONT_Z - BACK_Z;
// 檯面
addBox(halfW, 0.5, tableLen / 2, 0, -0.5, (FRONT_Z + BACK_Z) / 2, 0x1f5b57);
// 左右玻璃
addBox(0.15, 3, tableLen / 2, -halfW - 0.15, 3, (FRONT_Z + BACK_Z) / 2, 0x9fd8ff, { opacity: 0.12 });
addBox(0.15, 3, tableLen / 2, halfW + 0.15, 3, (FRONT_Z + BACK_Z) / 2, 0x9fd8ff, { opacity: 0.12 });
// 推板上方的擋牆（推板往回縮時，把推板上的幣刮下來）
addBox(halfW, 3, 0.2, 0, PUSHER_H + 0.05 + 3, WALL_Z, 0x3b2f4f, { rough: 0.6 });
// 推板
const pusher = addBox(halfW - 0.02, PUSHER_H / 2, PUSHER_DEPTH / 2, 0, PUSHER_H / 2, PUSHER_MID, 0xc9ccd6, { kinematic: true, metal: 0.7, rough: 0.3 });
// 前緣金邊（只有樣子）
const lip = new THREE.Mesh(
  new THREE.BoxGeometry(TABLE_W, 0.08, 0.12),
  new THREE.MeshStandardMaterial({ color: 0xf4c95d, metalness: 0.8, roughness: 0.3 }),
);
lip.position.set(0, 0.0, FRONT_Z - 0.06);
scene.add(lip);
// 下方出幣口（只有樣子）
const tray = new THREE.Mesh(
  new THREE.BoxGeometry(TABLE_W + 1, 0.3, 3),
  new THREE.MeshStandardMaterial({ color: 0x2a2236, roughness: 0.9 }),
);
tray.position.set(0, -3.2, FRONT_Z + 1.6);
tray.receiveShadow = true;
scene.add(tray);

// ===== 幣 =====
const coinGeo = new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_H, 28);
const coinMeshMat = new THREE.MeshStandardMaterial({ color: 0xf4c95d, metalness: 0.55, roughness: 0.35 });
const COIN_EDGE = 0.03;
const coinEuler = new THREE.Euler();
const coinQuat = new THREE.Quaternion();

function spawnCoin(x, y, z, tilt = 0) {
  if (coins.length >= MAX_COINS) return null;
  coinEuler.set(Math.random() * tilt, Math.random() * Math.PI, Math.random() * tilt);
  coinQuat.setFromEuler(coinEuler);
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setRotation({ x: coinQuat.x, y: coinQuat.y, z: coinQuat.z, w: coinQuat.w })
      .setLinearDamping(0.05)
      .setAngularDamping(0.3)
      .setCcdEnabled(true),
  );
  world.createCollider(
    RAPIER.ColliderDesc.roundCylinder(COIN_H / 2 - COIN_EDGE, COIN_R - COIN_EDGE, COIN_EDGE)
      .setDensity(1)
      .setFriction(COIN_FRICTION)
      .setRestitution(0.05),
    body,
  );
  const mesh = new THREE.Mesh(coinGeo, coinMeshMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  const coin = { body, mesh };
  coins.push(coin);
  return coin;
}

function removeCoin(i) {
  const c = coins[i];
  world.removeRigidBody(c.body);
  scene.remove(c.mesh);
  coins.splice(i, 1);
}

// ===== 推板移動 =====
function pusherZ(t) {
  return PUSHER_MID + PUSHER_AMP * Math.sin((t / PUSHER_PERIOD) * Math.PI * 2);
}
function movePusher(t) {
  pusher.body.setNextKinematicTranslation({ x: 0, y: PUSHER_H / 2, z: pusherZ(t) });
}

// ===== 一開始先鋪幣 =====
function prefill() {
  const pusherFront = PUSHER_MID + PUSHER_DEPTH / 2;
  for (let i = 0; i < START_COINS; i++) {
    const x = (Math.random() * 2 - 1) * (halfW - COIN_R - 0.1);
    const z = pusherFront - 1 + Math.random() * (FRONT_Z - 0.6 - pusherFront + 1);
    spawnCoin(x, 0.3 + (i % 6) * 0.25, z, 0.3);
  }
  // 讓幣先落定，這段掉下去的不算
    for (let s = 0; s < 240; s++) {
    simTime += STEP;
    movePusher(simTime);
    world.step();
    for (let i = coins.length - 1; i >= 0; i--) {
      if (coins[i].body.translation().y < -1) removeCoin(i);
    }
  }
}

// ===== 介面 =====
const walletEl = document.getElementById('wallet');
const wonEl = document.getElementById('won');
const refillEl = document.getElementById('refill');
const hintEl = document.getElementById('hint');

function bump(el) {
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}
function updateHud() {
  walletEl.textContent = wallet;
  wonEl.textContent = won;
  if (wallet < REFILL_BELOW) {
    const left = Math.ceil(REFILL_SEC - refillTimer);
    refillEl.textContent = `手上少於 ${REFILL_BELOW} 枚，${left} 秒後補 1 枚`;
  } else {
    refillEl.textContent = '';
  }
}
function floatText(text, worldPos) {
  const p = worldPos.clone().project(camera);
  const el = document.createElement('div');
  el.className = 'float';
  el.textContent = text;
  el.style.left = `${(p.x * 0.5 + 0.5) * window.innerWidth - 10}px`;
  el.style.top = `${(-p.y * 0.5 + 0.5) * window.innerHeight - 20}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ===== 聲音（很簡單的合成音） =====
let audio = null;
function beep(freq, dur, vol = 0.08, type = 'sine') {
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur);
  } catch (e) { /* 沒聲音也能玩 */ }
}

// ===== 瞄準與投幣 =====
const aimGhost = new THREE.Mesh(coinGeo, new THREE.MeshBasicMaterial({ color: 0xf4c95d, transparent: true, opacity: 0.35 }));
aimGhost.position.set(0, DROP_Y, DROP_Z);
scene.add(aimGhost);

const raycaster = new THREE.Raycaster();
const dropPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -DROP_Z);
const tmpV = new THREE.Vector3();
const ndc = new THREE.Vector2();

function aimFromEvent(e) {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (raycaster.ray.intersectPlane(dropPlane, tmpV)) {
    const lim = halfW - COIN_R - 0.05;
    aimX = Math.max(-lim, Math.min(lim, tmpV.x));
  }
}

function dropCoin() {
  if (wallet <= 0) {
    beep(180, 0.15, 0.06, 'square');
    return;
  }
  const c = spawnCoin(aimX + (Math.random() - 0.5) * 0.05, DROP_Y, DROP_Z, 0.4);
  if (!c) return;
  wallet--;
  bump(walletEl);
  beep(900, 0.06, 0.05, 'triangle');
  hintEl.style.opacity = 0;
  updateHud();
}

canvas.addEventListener('pointermove', aimFromEvent);
canvas.addEventListener('pointerdown', (e) => {
  aimFromEvent(e);
  pointerDown = true;
  canvas.setPointerCapture?.(e.pointerId);
  dropCoin();
  lastDrop = simTime;
});
const stop = () => { pointerDown = false; };
canvas.addEventListener('pointerup', stop);
canvas.addEventListener('pointercancel', stop);

// ===== 鏡頭跟著螢幕比例調整 =====
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // 直的螢幕把鏡頭拉遠，讓整個檯面寬度放得下
  const needW = TABLE_W + 1.5;
  const halfFovX = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  const dist = Math.max(13, (needW / 2) / Math.tan(halfFovX) * 1.05);
  camera.position.set(0, dist * 0.68, -0.5 + dist * 0.72);
  camera.lookAt(0, -0.5, -3.2);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ===== 主迴圈 =====
let acc = 0;
let lastT = performance.now();

// 物理走一步，並處理掉下去的幣
function stepSim() {
  simTime += STEP;
  movePusher(simTime);
  world.step();
  for (let i = coins.length - 1; i >= 0; i--) {
    const b = coins[i].body.translation();
    if (b.y < -1.2) {
      if (b.z > FRONT_Z - 0.5) {
        won++;
        wallet++;
        floatText('+1', new THREE.Vector3(b.x, 0, FRONT_Z));
        bump(wonEl);
        bump(walletEl);
        beep(1320 + Math.random() * 200, 0.12, 0.07);
      }
      removeCoin(i);
    }
  }
}

function tick(now) {
  const frame = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  acc += frame;
  let steps = 0;
  while (acc >= STEP && steps < 4) {
    stepSim();
    acc -= STEP;
    steps++;
  }
  if (steps === 4) acc = 0;

  // 按住連投
  if (pointerDown && simTime - lastDrop >= DROP_GAP) {
    dropCoin();
    lastDrop = simTime;
  }

  // 沒錢時慢慢補
  if (wallet < REFILL_BELOW) {
    refillTimer += frame;
    if (refillTimer >= REFILL_SEC) {
      refillTimer = 0;
      wallet++;
      bump(walletEl);
    }
  } else {
    refillTimer = 0;
  }

  // 同步畫面
  for (const c of coins) {
    c.mesh.position.copy(c.body.translation());
    c.mesh.quaternion.copy(c.body.rotation());
  }
  pusher.mesh.position.copy(pusher.body.translation());
  aimGhost.position.x = aimX;
  aimGhost.rotation.y += frame * 2;

  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

prefill();
updateHud();
document.getElementById('loading').classList.add('hide');
// 給測試用
window.__game = { coins, world, get wallet() { return wallet; }, get won() { return won; }, dropAt(x) { aimX = x; dropCoin(); }, simulate(sec) { for (let i = 0; i < sec * 60; i++) stepSim(); } };
requestAnimationFrame((t) => { lastT = t; tick(t); });
