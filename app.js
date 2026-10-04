// 推幣機：檯面、推板、投幣、幣掉下去加錢，用贏來的幣在商店買升級。
import * as THREE from './lib/three.module.js';
import RAPIER from './lib/rapier.mjs';
import { RoomEnvironment } from './lib/RoomEnvironment.js';
import { makeCoinMaterials } from './coin.js?v=0.0.16';
import { START_LAYOUT, START_PHASE } from './start-layout.js?v=0.0.16';

// 物理引擎的核心（wasm）另外下載壓縮過的版本，下載量少一大半；
// 瀏覽器太舊不能解壓縮時，改抓沒壓縮的版本
async function initPhysics() {
  const gzUrl = new URL('./lib/rapier_wasm3d_bg.wasm.gz', import.meta.url);
  const rawUrl = new URL('./lib/rapier_wasm3d_bg.wasm', import.meta.url);
  if ('DecompressionStream' in window) {
    try {
      const res = await fetch(gzUrl);
      if (res.ok) {
        const stream = res.body.pipeThrough(new DecompressionStream('gzip'));
        await RAPIER.init(new Response(stream, { headers: { 'Content-Type': 'application/wasm' } }));
        return;
      }
    } catch (e) { /* 改用沒壓縮的 */ }
  }
  await RAPIER.init(rawUrl);
}
document.getElementById('loading').textContent = '機台準備中……（下載物理引擎）';
await initPhysics();
document.getElementById('loading').textContent = '機台準備中……（擺硬幣）';

// ===== 數值（之後調手感主要改這裡） =====
const TABLE_W = 8;           // 檯面寬（推板也是這麼寬）
const GUTTER = 0.7;          // 兩側溝的寬度，幣掉進去就被機台吃掉
const FRONT_Z = 2;           // 檯面前緣（幣掉過這裡就算贏）
const BACK_Z = -10;          // 檯面最後面
const WALL_Z = -6.3;         // 推板上方擋牆的位置
const PUSHER_DEPTH = 5;      // 推板前後長度
const PUSHER_H = 0.6;        // 推板高度
const PUSHER_MID = -6;       // 推板中心來回的中點
const PUSHER_AMP = 1.2;      // 推板來回的幅度
const COIN_R = 0.38;
const COIN_H = 0.1;
const DROP_Y = 3.2;          // 投幣高度
const DROP_Z = -4.6;         // 投幣的前後位置（推板上方）
const STEP = 1 / 60;           // 物理一步的秒數
const START_WALLET = 30;
const MAX_COINS = 420;       // 檯面上幣的上限（保護效能）
const DROP_GAP = 0.28;       // 按住連投的間隔秒數
const MOM_GIVE = 10;         // 媽媽每次給幾枚
const MOM_CAP = 100;         // 手上滿這麼多，媽媽就先不給（免得掛機刷）

// ===== 商店升級 =====
// 增量遊戲的節奏：一開始只有一項、很便宜；買過一次才會出現下一項，越後面的越好也越貴。
// 每升一級價錢乘上 growth。levels 第 0 格是還沒升級時的數值。
const UPGRADES = {
  refill: {
    name: '媽媽十元',
    desc: '冒著被打的風險……每隔一段時間跟媽媽討 10 枚。升級讓你討得更勤，手上滿 100 枚就不好意思再討了。',
    levels: [20, 17, 14, 11, 8, 6],           // 媽媽幾秒給一次
    base: 8, growth: 1.6,
  },
  speed: {
    name: '推板加速',
    desc: '推板來回得更快，幣推得更勤',
    levels: [3.2, 3.0, 2.8, 2.6, 2.4, 2.2],   // 推板來回一次幾秒
    base: 20, growth: 1.7,
  },
  guard: {
    name: '側溝擋板',
    desc: '從前緣往後裝擋板，幣比較不會掉進兩側溝',
    levels: [0, 0.9, 1.8, 2.7, 3.6, 4.4],     // 擋板長度
    base: 40, growth: 1.75,
  },
  lucky: {
    name: '大金幣',
    desc: '投幣時有機會掉出大金幣（推下去值 10 枚），升級讓機會變大',
    levels: [0, 0.02, 0.03, 0.045, 0.06, 0.08], // 每投一枚變成大金幣的機率（沒買就沒有）
    base: 80, growth: 1.8,
  },
  rain: {
    name: '金幣雨機率',
    desc: '解鎖金幣雨：每一秒都有小小的機會下一場，升級讓機會變大',
    levels: [0, 0.004, 0.006, 0.009, 0.013, 0.018], // 每秒下金幣雨的機率（沒買就不會下）
    base: 150, growth: 1.9,
  },
  rainSize: {
    name: '金幣雨變大',
    desc: '每場金幣雨撒下來的幣變多',
    levels: [30, 40, 50, 65, 80, 100],        // 一場金幣雨幾枚
    base: 300, growth: 2,
  },
};
// 價錢一律取 10 的倍數，而且每一級至少比上一級貴 10
for (const u of Object.values(UPGRADES)) {
  let prev = 0;
  u.prices = u.levels.slice(1).map((_, i) => {
    const p = Math.max(prev + 10, Math.round((u.base * Math.pow(u.growth, i)) / 10) * 10);
    prev = p;
    return p;
  });
}
const UPGRADE_KEYS = Object.keys(UPGRADES);
const BIG_VALUE = 10;         // 大金幣推下去值幾枚
const BIG_R = 0.55;
const BIG_H = 0.14;

// ===== 狀態 =====
let wallet = START_WALLET;
let won = 0;
let lost = 0;
let aimX = 0;
let pointerDown = false;
let autoDrop = false;         // 右鍵切換的自動連續投幣
let lastDrop = -1;
let refillTimer = 0;
let simTime = 0;
let pusherPhase = 0;         // 推板走到來回的哪裡（0 到 1）
const upgrades = Object.fromEntries(UPGRADE_KEYS.map((k) => [k, 0]));
let rainTimer = 0;           // 每滿一秒擲一次金幣雨
let rainQueue = 0;           // 金幣雨還有幾枚要下
const coins = [];

// ===== 保底式假隨機 =====
// 機率 p 的事件：第 n 次沒中時，下一次的機率是 C × n；一中就從頭算。
// 長期看起來就是 p，但不會連續很久都不中，也不太會連續中。
function prdC(p) {
  if (p <= 0) return 0;
  // 給定 C 算出長期的平均機率
  const rateOf = (c) => {
    let notYet = 1;
    let expected = 0;
    const maxN = Math.ceil(1 / c);
    for (let n = 1; n <= maxN; n++) {
      const hit = Math.min(1, c * n) * notYet;
      expected += n * hit;
      notYet -= hit;
    }
    return 1 / expected;
  };
  let lo = 0;
  let hi = p;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (rateOf(mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

class PseudoRandom {
  constructor(p) {
    this.count = 0;
    this.setChance(p);
  }
  setChance(p) {
    this.p = p;
    this.c = prdC(p);
  }
  roll() {
    this.count++;
    if (Math.random() < this.c * this.count) {
      this.count = 0;
      return true;
    }
    return false;
  }
}

function upValue(key) {
  return UPGRADES[key].levels[upgrades[key]];
}

// ===== 畫面 =====
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14121c);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

// 金屬要有東西可以反射才會亮，給它一個虛擬房間當倒影
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;
scene.environmentIntensity = 0.6;
const hemi = new THREE.HemisphereLight(0xfff4e0, 0x302840, 0.6);
scene.add(hemi);
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
const outerW = halfW + GUTTER; // 玻璃牆的位置
const tableLen = FRONT_Z - BACK_Z;
// 檯面
addBox(halfW, 0.5, tableLen / 2, 0, -0.5, (FRONT_Z + BACK_Z) / 2, 0x1f5b57);
// 左右玻璃
addBox(0.15, 3, tableLen / 2, -outerW - 0.15, 3, (FRONT_Z + BACK_Z) / 2, 0x9fd8ff, { opacity: 0.12 });
addBox(0.15, 3, tableLen / 2, outerW + 0.15, 3, (FRONT_Z + BACK_Z) / 2, 0x9fd8ff, { opacity: 0.12 });
// 推板上方的擋牆（推板往回縮時，把推板上的幣刮下來）
addBox(outerW, 3, 0.2, 0, PUSHER_H + 0.05 + 3, WALL_Z, 0x3b2f4f, { rough: 0.6 });
// 推板
const pusher = addBox(halfW - 0.02, PUSHER_H / 2, PUSHER_DEPTH / 2, 0, PUSHER_H / 2, PUSHER_MID, 0x8d92a3, { kinematic: true, metal: 0.7, rough: 0.3 });
// 前緣金邊（只有樣子）
const lip = new THREE.Mesh(
  new THREE.BoxGeometry(TABLE_W, 0.08, 0.12),
  new THREE.MeshStandardMaterial({ color: 0xf4c95d, metalness: 0.8, roughness: 0.3 }),
);
lip.position.set(0, 0.0, FRONT_Z - 0.06);
scene.add(lip);
// 兩側溝底下的暗坑（只有樣子）
for (const side of [-1, 1]) {
  const pit = new THREE.Mesh(
    new THREE.BoxGeometry(GUTTER, 0.2, tableLen),
    new THREE.MeshStandardMaterial({ color: 0x0b0a10, roughness: 1 }),
  );
  pit.position.set(side * (halfW + GUTTER / 2), -2.5, (FRONT_Z + BACK_Z) / 2);
  scene.add(pit);
}
// 下方出幣口（只有樣子）
const tray = new THREE.Mesh(
  new THREE.BoxGeometry(TABLE_W + GUTTER * 2 + 1, 0.3, 3),
  new THREE.MeshStandardMaterial({ color: 0x2a2236, roughness: 0.9 }),
);
tray.position.set(0, -3.2, FRONT_Z + 1.6);
tray.receiveShadow = true;
scene.add(tray);

// ===== 幣 =====
const coinGeo = new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_H, 28);
const coinMatFancy = makeCoinMaterials();
const coinMatPlain = new THREE.MeshLambertMaterial({ color: 0xd9a53a, emissive: 0x1a1000 });
let coinMeshMat = coinMatFancy;
// 大金幣：大一號、背面寫 10，顏色比一般幣深一點點
const bigGeo = new THREE.CylinderGeometry(BIG_R, BIG_R, BIG_H, 32);
const bigMatFancy = makeCoinMaterials('10').map((m) => {
  m.color.multiply(new THREE.Color(0xddcfb4)); // 在原本的顏色上壓深一點點（側邊也是）
  return m;
});
const bigMatPlain = new THREE.MeshLambertMaterial({ color: 0xc7952f, emissive: 0x160c00 });
let bigMeshMat = bigMatFancy;
const COIN_EDGE = 0.03;
const coinEuler = new THREE.Euler();
const coinQuat = new THREE.Quaternion();

function spawnCoin(x, y, z, tilt = 0, big = false) {
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
    RAPIER.ColliderDesc.roundCylinder(
      (big ? BIG_H : COIN_H) / 2 - COIN_EDGE,
      (big ? BIG_R : COIN_R) - COIN_EDGE,
      COIN_EDGE,
    )
      .setDensity(1)
      .setContactSkin(0.01) // 留一層很薄的皮，疊在一起時比較不會抖
      .setFriction(COIN_FRICTION)
      .setRestitution(0.05),
    body,
  );
  const mesh = big ? new THREE.Mesh(bigGeo, bigMeshMat) : new THREE.Mesh(coinGeo, coinMeshMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  const coin = { body, mesh, value: big ? BIG_VALUE : 1 };
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
// 用「走到哪裡」記推板位置，這樣升級加速時推板不會突然跳位置
function movePusher() {
  pusherPhase = (pusherPhase + STEP / upValue('speed')) % 1;
  const z = PUSHER_MID + PUSHER_AMP * Math.sin(pusherPhase * Math.PI * 2);
  pusher.body.setNextKinematicTranslation({ x: 0, y: PUSHER_H / 2, z });
}
function pusherSpeedZ() {
  const w = (Math.PI * 2) / upValue('speed');
  return PUSHER_AMP * w * Math.cos(pusherPhase * Math.PI * 2);
}

// ===== 側溝擋板 =====
const guardMat = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 0.8, roughness: 0.35 });
let guards = [];
function buildGuards() {
  for (const g of guards) {
    world.removeRigidBody(g.body);
    scene.remove(g.mesh);
  }
  guards = [];
  const len = upValue('guard');
  if (len <= 0) return;
  for (const side of [-1, 1]) {
    const x = side * (halfW + 0.05);
    const z = FRONT_Z - len / 2;
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.15, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.05, 0.15, len / 2).setFriction(TABLE_FRICTION), body);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, len), guardMat);
    mesh.position.set(x, 0.15, z);
    mesh.castShadow = true;
    scene.add(mesh);
    guards.push({ body, mesh });
  }
}

// ===== 一開始先鋪幣 =====
// 用事先模擬好的擺法（start-layout.js），不用每次開遊戲都等硬幣落定
function prefill() {
  pusherPhase = START_PHASE;
  for (const c of START_LAYOUT) {
    const coin = spawnCoin(c[0], c[1], c[2]);
    if (coin) coin.body.setRotation({ x: c[3], y: c[4], z: c[5], w: c[6] }, true);
  }
}

// ===== 介面 =====
const walletEl = document.getElementById('wallet');
const refillEl = document.getElementById('refill');
const hintEl = document.getElementById('hint');
const autoBtn = document.getElementById('autoBtn');
const shopBtn = document.getElementById('shopBtn');
// 手機沒有右鍵，用按鈕切換
autoBtn.addEventListener('click', () => {
  setAuto(!autoDrop);
  if (autoDrop) {
    dropCoin();
    lastDrop = simTime;
  }
});

function bump(el) {
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}
let shopShownWallet = -1;
function updateHud() {
  walletEl.textContent = wallet;
  shopBtn.classList.toggle('ready', canAffordSomething());
  // 商店開著時，錢變了就更新按鈕能不能按
  if (shopEl.classList.contains('show') && shopShownWallet !== wallet) {
    shopShownWallet = wallet;
    renderShop();
  }
  if (wallet < MOM_CAP) {
    const left = Math.ceil(upValue('refill') - refillTimer);
    refillEl.textContent = `${left} 秒後獲得 ${MOM_GIVE} 枚`;
  } else {
    refillEl.textContent = `手上滿 ${MOM_CAP} 枚，先不會獲得`;
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
// 每個音效都有分類，設定裡可以分開關；總開關關掉就全部不響
const SOUND_KINDS = {
  drop: '投幣',
  clink: '硬幣碰撞',
  win: '幣掉下來',
  big: '大金幣',
  rain: '金幣雨',
  mom: '媽媽給錢',
  shop: '商店購買',
};
const SOUND_KEY = 'pretty_drop_sound';
const soundOn = { master: true };
for (const k of Object.keys(SOUND_KINDS)) soundOn[k] = true;
try { Object.assign(soundOn, JSON.parse(localStorage.getItem(SOUND_KEY) || '{}')); } catch (e) { /* 用預設 */ }

let audio = null;
function beep(freq, dur, vol = 0.08, type = 'sine', kind = 'drop') {
  if (!soundOn.master || !soundOn[kind]) return;
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

// 幣在動的聲音：零星的叮叮碰撞聲，正在亂動的幣越多叮得越頻繁（差別不誇張）
function clink(strength) {
  const base = 2600 + Math.random() * 1800;
  beep(base, 0.05, 0.008 + 0.012 * strength * Math.random(), 'sine', 'clink');
  beep(base * 1.48, 0.035, 0.005 + 0.006 * strength * Math.random(), 'sine', 'clink');
}

let movingCount = 0;
let soundFrame = 0;
function updateCoinSound() {
  if (!audio) return;
  if (++soundFrame % 3 === 0) {
    // 跟著推板一起走的幣（坐在推板上、被平穩推著）不太會響，只算亂動的
    const vp = pusherSpeedZ();
    let n = 0;
    for (const c of coins) {
      const v = c.body.linvel();
      const still = v.x * v.x + v.y * v.y + v.z * v.z;
      const withPusher = v.x * v.x + v.y * v.y + (v.z - vp) * (v.z - vp);
      if (Math.min(still, withPusher) > 0.6) n++;
    }
    movingCount = n;
  }
  const level = Math.pow(Math.min(1, movingCount / 12), 0.6);
  if (movingCount > 0 && Math.random() < 0.04 + 0.25 * level) clink(level);
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

const bigChance = new PseudoRandom(UPGRADES.lucky.levels[0]);
const rainChance = new PseudoRandom(UPGRADES.rain.levels[0]);

function setAuto(on) {
  autoDrop = on;
  autoBtn.classList.toggle('on', on);
  autoBtn.textContent = on ? '自動中' : '自動';
}

function dropCoin() {
  // 手上沒幣就安靜地什麼都不做；自動投幣不會關掉，有錢了會繼續投
  if (wallet <= 0) return;
  if (bigChance.p !== upValue('lucky')) bigChance.setChance(upValue('lucky'));
  // 還沒買「大金幣」就完全不會出現，保底進度也不累積
  const big = upValue('lucky') > 0 && bigChance.roll();
  const c = spawnCoin(aimX + (Math.random() - 0.5) * 0.05, DROP_Y, DROP_Z, 0.4, big);
  if (!c) return;
  if (big) {
    floatText('大金幣！', new THREE.Vector3(aimX, DROP_Y, DROP_Z));
    beep(1500, 0.15, 0.05, 'triangle', 'big');
  }
  wallet--;
  bump(walletEl);
  beep(900, 0.06, 0.05, 'triangle', 'drop');
  hintEl.style.opacity = 0;
  updateHud();
}

canvas.addEventListener('pointermove', aimFromEvent);
// 右鍵：開始／停止自動連續投幣
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  aimFromEvent(e);
  setAuto(!autoDrop);
  if (autoDrop) {
    dropCoin();
    lastDrop = simTime;
  }
});
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
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
  const needW = TABLE_W + GUTTER * 2 + 1.5;
  const halfFovX = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  const dist = Math.max(13, (needW / 2) / Math.tan(halfFovX) * 1.05);
  camera.position.set(0, dist * 0.68, -0.5 + dist * 0.72);
  camera.lookAt(0, -0.5, -3.2);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ===== 畫質設定 =====
// 高：全部效果；中：關陰影、解析度降一點；低：再關反射和幣面圖案，解析度最低
const QUALITY_KEY = 'pretty_drop_quality';
let quality = 'high';
try { quality = localStorage.getItem(QUALITY_KEY) || 'high'; } catch (e) { /* 存不了就用預設 */ }

function applyQuality(q) {
  quality = q;
  try { localStorage.setItem(QUALITY_KEY, q); } catch (e) { /* 存不了也沒關係 */ }
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(q === 'high' ? Math.min(dpr, 2) : q === 'mid' ? Math.min(dpr, 1.25) : 1);
  const shadows = q === 'high';
  renderer.shadowMap.enabled = shadows;
  sun.castShadow = shadows;
  scene.environment = q === 'low' ? null : envTex;
  hemi.intensity = q === 'low' ? 1.4 : 0.6;
  coinMeshMat = q === 'low' ? coinMatPlain : coinMatFancy;
  bigMeshMat = q === 'low' ? bigMatPlain : bigMatFancy;
  for (const c of coins) c.mesh.material = c.value > 1 ? bigMeshMat : coinMeshMat;
  scene.traverse((o) => {
    if (!o.material) return;
    for (const m of [].concat(o.material)) m.needsUpdate = true;
  });
  for (const b of document.querySelectorAll('#settings button[data-q]')) {
    b.classList.toggle('on', b.dataset.q === q);
  }
  resize();
}

// 設定分頁
for (const t of document.querySelectorAll('#settings .tab')) {
  t.addEventListener('click', () => {
    for (const x of document.querySelectorAll('#settings .tab')) x.classList.toggle('on', x === t);
    for (const p of document.querySelectorAll('#settings .pane')) p.hidden = p.dataset.pane !== t.dataset.tab;
  });
}

// 音效開關
const soundListEl = document.getElementById('soundList');
function renderSound() {
  const rows = [['master', '總開關']].concat(Object.entries(SOUND_KINDS));
  soundListEl.innerHTML = rows.map(([k, name]) => {
    const dim = k !== 'master' && !soundOn.master ? ' dim' : '';
    return `<div class="toggleRow${k === 'master' ? ' master' : ''}${dim}"><span>${name}</span><button type="button" data-sound="${k}" class="${soundOn[k] ? 'on' : ''}">${soundOn[k] ? '開' : '關'}</button></div>`;
  }).join('');
}
soundListEl.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-sound]');
  if (!b) return;
  soundOn[b.dataset.sound] = !soundOn[b.dataset.sound];
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(soundOn)); } catch (err) { /* 存不了也沒關係 */ }
  renderSound();
});
renderSound();

document.getElementById('settingsBtn').addEventListener('click', () => {
  shopEl.classList.remove('show');
  document.getElementById('settings').classList.toggle('show');
});
for (const b of document.querySelectorAll('#settings button[data-q]')) {
  b.addEventListener('click', () => applyQuality(b.dataset.q));
}

// ===== 金幣雨 =====
const rainBanner = document.getElementById('rainBanner');
let rainSpawn = 0;
let rainRate = 0;
function startRain() {
  rainQueue = upValue('rainSize');
  rainRate = rainQueue / 2.5;
  rainSpawn = 0;
  rainBanner.classList.remove('show');
  void rainBanner.offsetWidth;
  rainBanner.classList.add('show');
  [880, 1100, 1320, 1760].forEach((f, k) => setTimeout(() => beep(f, 0.18, 0.06, 'triangle', 'rain'), k * 90));
}

// ===== 商店 =====
const shopEl = document.getElementById('shop');
const shopListEl = document.getElementById('shopList');
const shopWalletEl = document.getElementById('shopWallet');

// 上一項買過一次，下一項才會出現
function shopVisible(i) {
  return i === 0 || upgrades[UPGRADE_KEYS[i - 1]] >= 1;
}

function canAffordSomething() {
  return UPGRADE_KEYS.some((key, i) => {
    const lv = upgrades[key];
    return shopVisible(i) && lv < UPGRADES[key].prices.length && wallet >= UPGRADES[key].prices[lv];
  });
}

function renderShop() {
  shopWalletEl.textContent = wallet;
  let html = '';
  UPGRADE_KEYS.forEach((key, i) => {
    if (!shopVisible(i)) return;
    const u = UPGRADES[key];
    const lv = upgrades[key];
    const max = u.prices.length;
    const dots = '●'.repeat(lv) + '○'.repeat(max - lv);
    const price = u.prices[lv];
    const btn = lv >= max
      ? '<button type="button" disabled>已滿級</button>'
      : `<button type="button" data-buy="${key}" ${wallet < price ? 'disabled' : ''}>${price} 枚</button>`;
    html += `<div class="item"><div class="info"><div class="name">${u.name}<span class="lv">${dots}</span></div><div class="desc">${u.desc}</div></div>${btn}</div>`;
  });
  const next = UPGRADE_KEYS.findIndex((_, i) => !shopVisible(i));
  if (next > 0) html += '<div class="item locked"><div class="info"><div class="desc">買下上面最後一項，就會出現新的升級</div></div></div>';
  shopListEl.innerHTML = html;
}

function buy(key) {
  const i = UPGRADE_KEYS.indexOf(key);
  if (i < 0 || !shopVisible(i)) return;
  const u = UPGRADES[key];
  const lv = upgrades[key];
  if (lv >= u.prices.length || wallet < u.prices[lv]) return;
  wallet -= u.prices[lv];
  upgrades[key]++;
  if (key === 'guard') buildGuards();
  beep(660, 0.08, 0.06, 'triangle', 'shop');
  setTimeout(() => beep(990, 0.12, 0.06, 'triangle', 'shop'), 80);
  bump(walletEl);
  renderShop();
  saveGame();
}

shopBtn.addEventListener('click', () => {
  document.getElementById('settings').classList.remove('show');
  renderShop();
  shopEl.classList.toggle('show');
});
document.getElementById('shopClose').addEventListener('click', () => shopEl.classList.remove('show'));
shopListEl.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-buy]');
  if (b) buy(b.dataset.buy);
});

// ===== 存檔 =====
// 存在這台裝置的瀏覽器裡；可以匯出成檔案備份、再匯入
const SAVE_KEY = 'pretty_drop_save';
let resetting = false;       // 按了重新開始就不要再存

function saveData() {
  return {
    version: 1,
    wallet,
    upgrades: { ...upgrades },
    pusherPhase,
    bigCount: bigChance.count,
    rainCount: rainChance.count,
    won,
    lost,
    coins: coins.map((c) => {
      const t = c.body.translation();
      const r = c.body.rotation();
      const arr = [t.x, t.y, t.z, r.x, r.y, r.z, r.w].map((v) => Math.round(v * 1000) / 1000);
      if (c.value > 1) arr.push(1); // 第 8 格有 1 表示大金幣
      return arr;
    }),
  };
}

function saveGame() {
  if (resetting) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData())); } catch (e) { /* 存不了就算了 */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function applySave(d) {
  wallet = Math.max(0, Math.floor(Number(d.wallet) || 0));
  for (const key of Object.keys(upgrades)) {
    const lv = Math.floor(Number(d.upgrades?.[key]) || 0);
    upgrades[key] = Math.min(UPGRADES[key].prices.length, Math.max(0, lv));
  }
  pusherPhase = Number(d.pusherPhase) || 0;
  bigChance.count = Math.max(0, Math.floor(Number(d.bigCount) || 0));
  rainChance.count = Math.max(0, Math.floor(Number(d.rainCount) || 0));
  won = Number(d.won) || 0;
  lost = Number(d.lost) || 0;
  for (const c of (d.coins || []).slice(0, MAX_COINS)) {
    const coin = spawnCoin(c[0], c[1], c[2], 0, c[7] === 1);
    if (coin) coin.body.setRotation({ x: c[3], y: c[4], z: c[5], w: c[6] }, true);
  }
}

setInterval(saveGame, 5000);
window.addEventListener('pagehide', saveGame);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(saveData())], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '推幣機存檔.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
const importFile = document.getElementById('importFile');
document.getElementById('importBtn').addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const f = importFile.files[0];
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (typeof d.wallet !== 'number' || !Array.isArray(d.coins)) throw new Error('bad');
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    location.reload();
  } catch (e) {
    alert('這個檔案讀不出來，可能不是推幣機的存檔。');
  }
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('確定要重新開始嗎？手上的幣、升級、檯面上的幣都會清空。')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 沒關係 */ }
  resetting = true;
  location.reload();
});

// ===== 主迴圈 =====
let acc = 0;
let lastT = performance.now();

// 物理走一步，並處理掉下去的幣
function stepSim() {
  simTime += STEP;
  movePusher();
  world.step();
  for (let i = coins.length - 1; i >= 0; i--) {
    const b = coins[i].body.translation();
    const value = coins[i].value;
    if (b.y < -1.2) {
      if (b.z > FRONT_Z - 0.5 && Math.abs(b.x) < halfW + 0.1) {
        won += value;
        wallet += value;
        floatText(`+${value}`, new THREE.Vector3(b.x, 0, FRONT_Z));
        bump(walletEl);
        if (value > 1) {
          [1320, 1660, 1980].forEach((f, k) => setTimeout(() => beep(f, 0.15, 0.07, 'sine', 'big'), k * 70));
        } else {
          beep(1320 + Math.random() * 200, 0.12, 0.07, 'sine', 'win');
        }
      } else {
        lost += value;
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

  // 按住連投，或自動投幣
  if ((pointerDown || autoDrop) && simTime - lastDrop >= DROP_GAP) {
    dropCoin();
    lastDrop = simTime;
  }

  // 每一秒擲一次金幣雨（保底式假隨機）
  rainTimer += frame;
  if (rainTimer >= 1) {
    rainTimer -= 1;
    if (rainChance.p !== upValue('rain')) rainChance.setChance(upValue('rain'));
    if (upValue('rain') > 0 && rainQueue <= 0 && rainChance.roll()) startRain();
  }

  // 金幣雨：大約 2.5 秒內，一枚一枚從畫面上方翻轉著掉下來
  if (rainQueue > 0) {
    rainSpawn += frame * rainRate;
    while (rainSpawn >= 1 && rainQueue > 0) {
      rainSpawn -= 1;
      const x = (Math.random() * 2 - 1) * (halfW - COIN_R - 0.2);
      const c = spawnCoin(x, 9 + Math.random() * 3, -5.5 + Math.random() * 6, Math.PI);
      if (!c) { rainQueue = 0; break; }
      c.body.setLinvel({ x: 0, y: -2 - Math.random() * 2, z: 0 }, true);
      c.body.setAngvel({ x: (Math.random() - 0.5) * 16, y: 0, z: (Math.random() - 0.5) * 16 }, true);
      rainQueue--;
      if (Math.random() < 0.3) clink(0.6);
    }
  }

  // 媽媽十元：固定時間給 10 枚，手上滿 100 枚就先不給（給了也不超過 100）
  if (wallet < MOM_CAP) {
    refillTimer += frame;
    if (refillTimer >= upValue('refill')) {
      refillTimer = 0;
      wallet = Math.min(MOM_CAP, wallet + MOM_GIVE);
      bump(walletEl);
      beep(990, 0.1, 0.05, 'triangle', 'mom');
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

  updateCoinSound();
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

applyQuality(quality);
const saved = loadSave();
if (saved) applySave(saved);
else prefill();
buildGuards();
updateHud();
document.getElementById('loading').classList.add('hide');
// 給測試用
window.__game = { coins, world, camera, get moving() { return movingCount; }, applyQuality, get quality() { return quality; }, get wallet() { return wallet; }, get won() { return won; }, get lost() { return lost; }, dropAt(x) { aimX = x; dropCoin(); }, upgrades, buy, setWallet(n) { wallet = n; }, startRain, UPGRADES, get rain() { return rainQueue; }, PseudoRandom, get auto() { return autoDrop; }, soundOn, bigChance, setAuto, saveGame, saveData, simulate(sec) { for (let i = 0; i < sec * 60; i++) stepSim(); } };
requestAnimationFrame((t) => { lastT = t; tick(t); });
