// 推幣機：檯面、推板、投幣、幣掉下去加錢，用贏來的幣在商店買升級。
import * as THREE from './lib/three.module.js';
import RAPIER from './lib/rapier.mjs';
import { RoomEnvironment } from './lib/RoomEnvironment.js';
import { makeCoinMaterials } from './coin.js?v=0.0.30';
import { START_LAYOUT, START_PHASE } from './start-layout.js?v=0.0.30';
import {
  RARITY, SLOTS, SLIME_SETS, SET_BY_ID, slimeInfo, makeSlimeMesh, slimeHullPoints,
  updateSlimeEffects, drawSlimeIcon,
} from './slime.js?v=0.0.30';
import { ACHIEVEMENTS, DECORATIONS, DECORATION_SLOTS, STAT_NAMES } from './achievements.js?v=0.0.30';

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
const GUTTER = 1.1;          // 兩側溝的寬度，幣掉進去就被機台吃掉（越寬吃越多）
const TABLE_W = 9.4 - GUTTER * 2; // 檯面寬（推板也是這麼寬）；外框固定，側溝變寬檯面就變窄
const FRONT_Z = 2;           // 檯面前緣（幣掉過這裡就算贏）
const BACK_Z = -10;          // 檯面最後面
const WALL_Z = -6.3;         // 推板上方擋牆的位置
const PUSHER_DEPTH = 5;      // 推板前後長度
const PUSHER_H = 0.6;        // 推板高度
const PUSHER_MID = -6;       // 推板中心來回的中點
const PUSHER_AMP = 1.2;      // 推板來回的幅度
const COIN_R = 0.5;          // 硬幣做大顆、厚一點，每一枚看起來比較值錢
const COIN_H = 0.14;
const DROP_Y = 3.2;          // 投幣高度
const DROP_Z = -4.6;         // 投幣的前後位置（推板上方）
const STEP = 1 / 60;           // 物理一步的秒數
const START_WALLET = 30;
const MAX_COINS = 300;       // 檯面上幣的上限（保護效能）
const GUARD_H = 0.07;         // 側溝擋板的高度（一枚幣厚 0.1）
const MOM_GIVE = 10;         // 媽媽每次給幾枚
const MOM_CAP = 100;         // 手上滿這麼多，媽媽就先不給（免得掛機刷）

// ===== 商店升級 =====
// 增量遊戲的節奏：一開始只有一項、很便宜；買過一次才會出現下一項，越後面的越好也越貴。
// 每升一級價錢乘上 growth。levels 第 0 格是還沒升級時的數值。
const UPGRADES = {
  refill: {
    name: '媽媽十元',
    desc: '冒著被打的風險……再投一點錢……升級以增加課金的勇氣。',
    levels: [30, 26, 22, 19, 16, 14, 12, 10],          // 媽媽幾秒給一次
    base: 10, growth: 1.45,
  },
  dropRate: {
    name: '投幣速度',
    desc: '手變快，一秒能投更多枚（一開始一秒一枚）',
    levels: [1.0, 0.85, 0.72, 0.6, 0.5, 0.42, 0.35],  // 兩次投幣之間至少隔幾秒
    base: 10, growth: 1.5,
  },
  speed: {
    name: '推板加速',
    desc: '推板來回得更快，幣推得更勤',
    levels: [3.2, 3.05, 2.9, 2.75, 2.6, 2.45, 2.3, 2.2], // 推板來回一次幾秒
    base: 20, growth: 1.45,
  },
  guard: {
    name: '側溝擋板',
    desc: '從前緣往後裝矮矮的擋板，幣比較不會掉進兩側溝',
    levels: [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2],   // 擋板長度
    base: 30, growth: 1.5,
  },
  lucky: {
    name: '大金幣',
    desc: '投幣時有機會掉出大金幣（推下去值 10 枚），升級讓機會變大',
    levels: [0, 0.015, 0.025, 0.035, 0.045, 0.055, 0.065, 0.08], // 每投一枚變成大金幣的機率（沒買就沒有）
    base: 60, growth: 1.5,
  },
  rain: {
    name: '金幣雨機率',
    desc: '解鎖金幣雨：每一秒都有小小的機會下一場，升級讓機會變大',
    levels: [0, 0.003, 0.0045, 0.006, 0.0075, 0.009, 0.011, 0.013, 0.016], // 每秒下金幣雨的機率（沒買就不會下）
    base: 100, growth: 1.5,
  },
  rainSize: {
    name: '金幣雨變大',
    desc: '每場金幣雨撒下來的幣變多',
    levels: [30, 40, 50, 60, 70, 80, 100, 150],        // 一場金幣雨幾枚
    base: 150, growth: 1.55,
  },
  multi: {
    name: '一次多投',
    desc: '每投一次，一起丟出好幾枚（每枚一樣要花 1 枚）',
    levels: [1, 2, 3, 4, 5],                            // 一次丟幾枚
    base: 400, growth: 2,
  },
};
// 遊戲裡的錢：100 以內取 10 的倍數，超過 100 取 50 的倍數，看起來比較乾脆
function niceMoney(x) {
  return x <= 100 ? Math.max(10, Math.round(x / 10) * 10) : Math.round(x / 50) * 50;
}
// 比 x 大的下一個「乾脆的數字」
function nextNice(x) {
  return x < 100 ? x + 10 : x + 50;
}
// 每一級的價錢，而且每一級一定比上一級貴
for (const u of Object.values(UPGRADES)) {
  let prev = 0;
  u.prices = u.levels.slice(1).map((_, i) => {
    let p = niceMoney(u.base * Math.pow(u.growth, i));
    if (p <= prev) p = nextNice(prev);
    prev = p;
    return p;
  });
}
const UPGRADE_KEYS = Object.keys(UPGRADES);
const BIG_VALUE = 10;         // 大金幣推下去值幾枚
const BIG_R = 0.7;
const BIG_H = 0.18;

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
// 成就：累計數字、達成了哪些、成就點數、買了哪些裝飾品、各位置裝了哪個
const stats = Object.fromEntries(Object.keys(STAT_NAMES).map((k) => [k, 0]));
const achieved = {};
let achPoints = 0;
const ownedDecor = {};
const equipped = {};
let achTimer = 0;
const dolls = [];            // 檯面上的史萊姆娃娃
const collection = {};       // 圖鑑：每種娃娃收集了幾隻
const DOLL_CHANCE = 0.03;    // 每秒放一隻娃娃的機率（保底式，平均大約 35 秒一隻）
const RARE_CHANCE = 0.2;     // 放出來的是稀有（第 7 到 9 隻）的機率
const LEGEND_CHANCE = 0.03;  // 放出來的是傳說（第 10 隻）的機率
let activeSets = ['jelly'];  // 現在用哪幾套娃娃（可以同時選好幾套，機率不變）
const MAX_DOLLS = 4;         // 檯面上最多同時幾隻
let dollTimer = 0;

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
const table = addBox(halfW, 0.5, tableLen / 2, 0, -0.5, (FRONT_Z + BACK_Z) / 2, 0x1f5b57);
// 左右玻璃
addBox(0.15, 3, tableLen / 2, -outerW - 0.15, 3, (FRONT_Z + BACK_Z) / 2, 0x9fd8ff, { opacity: 0.12 });
addBox(0.15, 3, tableLen / 2, outerW + 0.15, 3, (FRONT_Z + BACK_Z) / 2, 0x9fd8ff, { opacity: 0.12 });
// 推板上方的擋牆（推板往回縮時，把推板上的幣刮下來）
addBox(outerW, 3, 0.2, 0, PUSHER_H + 0.05 + 3, WALL_Z, 0x3b2f4f, { rough: 0.6 });
// 推板
const pusher = addBox(halfW - 0.02, PUSHER_H / 2, PUSHER_DEPTH / 2, 0, PUSHER_H / 2, PUSHER_MID, 0x8d92a3, { kinematic: true, metal: 0.7, rough: 0.3 });
// 推板表面比較澀，推板變快時上面的幣才會跟著走，不會一直滑來滑去
pusher.body.collider(0).setFriction(0.9);
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

// ===== 史萊姆娃娃 =====
function spawnDoll(id, scale, pos, rot) {
  if (!slimeInfo(id)) return null;
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation(rot || { x: 0, y: 0, z: 0, w: 1 })
      .setLinearDamping(0.1)
      .setAngularDamping(0.4)
      .setCcdEnabled(true),
  );
  world.createCollider(
    RAPIER.ColliderDesc.convexHull(slimeHullPoints(scale))
      .setDensity(0.35)
      .setFriction(0.5)
      .setRestitution(0.1)
      .setContactSkin(0.01),
    body,
  );
  const mesh = makeSlimeMesh(id, scale, quality !== 'low');
  scene.add(mesh);
  const doll = { id, scale, body, mesh };
  dolls.push(doll);
  return doll;
}

function removeDoll(i) {
  const d = dolls[i];
  world.removeRigidBody(d.body);
  scene.remove(d.mesh);
  dolls.splice(i, 1);
}

// 機台放一隻新的娃娃到推板上方，稀有度也用保底式假隨機
function dropNewDoll(forceRarity) {
  let rarity = 'common';
  if (forceRarity) rarity = forceRarity;
  else if (legendChance.roll()) rarity = 'legend';
  else if (rareChance.roll()) rarity = 'rare';
  const pool = SLOTS.map((sl, i) => i).filter((i) => SLOTS[i].rarity === rarity);
  const slot = pool[Math.floor(Math.random() * pool.length)];
  const set = activeSets[Math.floor(Math.random() * activeSets.length)];
  const id = `${set}.${slot}`;
  const scale = 0.85 + Math.random() * 0.35; // 大小略有不同
  const yaw = (Math.random() - 0.5) * 0.8;   // 大致面向玩家
  spawnDoll(id, scale, { x: (Math.random() - 0.5) * 4, y: 3.2, z: DROP_Z }, { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
  beep(700, 0.12, 0.05, 'triangle', 'doll');
  setTimeout(() => beep(1050, 0.16, 0.05, 'triangle', 'doll'), 110);
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
    // 擋板只有一點點高（比一枚幣還矮），平平滑過來的幣會被擋住，被擠上來的還是會翻過去
    const h = GUARD_H;
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, h / 2, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.05, h / 2, len / 2).setFriction(TABLE_FRICTION), body);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, len), guardMat);
    mesh.position.set(x, h / 2, z);
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
  // 開局先放一隻普通的娃娃在檯面中間，讓玩家一眼看到目標
  spawnDoll('jelly.0', 1, { x: 0.3, y: 1.6, z: -0.6 });
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
  tryDrop();
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
function floatText(text, worldPos, cls = '') {
  const p = worldPos.clone().project(camera);
  const el = document.createElement('div');
  el.className = cls ? `float ${cls}` : 'float';
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
  doll: '娃娃',
  wheel: '轉盤',
  item: '道具',
  ach: '成就達成',
};
const SOUND_KEY = 'pretty_drop_sound';
const soundOn = { master: true, volume: 7 }; // volume：0 到 10
for (const k of Object.keys(SOUND_KINDS)) soundOn[k] = true;
try { Object.assign(soundOn, JSON.parse(localStorage.getItem(SOUND_KEY) || '{}')); } catch (e) { /* 用預設 */ }

let audio = null;
function beep(freq, dur, vol = 0.08, type = 'sine', kind = 'drop') {
  if (!soundOn.master || !soundOn[kind] || !soundOn.volume) return;
  vol *= soundOn.volume / 7; // 7 是原本的音量
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
const dollChance = new PseudoRandom(DOLL_CHANCE);
const rareChance = new PseudoRandom(RARE_CHANCE);
const legendChance = new PseudoRandom(LEGEND_CHANCE);

function setAuto(on) {
  autoDrop = on;
  autoBtn.classList.toggle('on', on);
  autoBtn.textContent = on ? '自動中' : '自動';
}

function dropCoin() {
  // 手上沒幣就安靜地什麼都不做；自動投幣不會關掉，有錢了會繼續投
  if (wallet <= 0) return;
  if (bigChance.p !== upValue('lucky')) bigChance.setChance(upValue('lucky'));
  // 一次多投：一起丟出好幾枚，左右稍微散開；手上不夠就丟手上有的
  const n = Math.min(wallet, upValue('multi'));
  let dropped = 0;
  for (let k = 0; k < n; k++) {
    // 還沒買「大金幣」就完全不會出現，保底進度也不累積
    const big = upValue('lucky') > 0 && bigChance.roll();
    const spread = n > 1 ? (k - (n - 1) / 2) * 0.75 : 0;
    const lim = halfW - COIN_R - 0.05;
    const x = Math.max(-lim, Math.min(lim, aimX + spread + (Math.random() - 0.5) * 0.05));
    const c = spawnCoin(x, DROP_Y + k * 0.15, DROP_Z + (Math.random() - 0.5) * 0.3, 0.4, big);
    if (!c) break;
    dropped++;
    if (big) {
      floatText('大金幣！', new THREE.Vector3(x, DROP_Y, DROP_Z));
      beep(1500, 0.15, 0.05, 'triangle', 'big');
    }
  }
  if (!dropped) return;
  wallet -= dropped;
  stats.coinsDropped += dropped;
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
  tryDrop();
});
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  aimFromEvent(e);
  pointerDown = true;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 有些情況抓不到，沒關係 */ }
  tryDrop();
});
// 投幣速度有上限：離上一次還不夠久就先不投（按住或自動會等時間到再投）
function tryDrop() {
  if (simTime - lastDrop < upValue('dropRate')) return;
  dropCoin();
  lastDrop = simTime;
}
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
  for (const c of coins) {
    if (c.glued) c.mesh.material = q === 'low' ? glueMatPlain : glueMats;
    else c.mesh.material = c.value > 1 ? bigMeshMat : coinMeshMat;
  }
  // 娃娃換畫質要整隻重做（高／中是真的透光，低是假的半透明）
  for (const d of dolls) {
    scene.remove(d.mesh);
    d.mesh = makeSlimeMesh(d.id, d.scale, q !== 'low');
    scene.add(d.mesh);
  }
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
  const vol = `<div class="volRow"><span>音量</span><input type="range" id="volSlider" min="0" max="10" step="1" value="${soundOn.volume}"><b id="volNum">${soundOn.volume}</b></div>`;
  soundListEl.innerHTML = vol + rows.map(([k, name]) => {
    const dim = k !== 'master' && !soundOn.master ? ' dim' : '';
    return `<div class="toggleRow${k === 'master' ? ' master' : ''}${dim}"><span>${name}</span><button type="button" data-sound="${k}" class="${soundOn[k] ? 'on' : ''}">${soundOn[k] ? '開' : '關'}</button></div>`;
  }).join('');
}
soundListEl.addEventListener('input', (e) => {
  if (e.target.id !== 'volSlider') return;
  soundOn.volume = Number(e.target.value);
  document.getElementById('volNum').textContent = soundOn.volume;
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(soundOn)); } catch (err) { /* 存不了也沒關係 */ }
});
// 放開滑桿時響一聲，讓玩家聽聽看現在多大聲
soundListEl.addEventListener('change', (e) => {
  if (e.target.id === 'volSlider') beep(990, 0.1, 0.06, 'triangle', 'drop');
});
soundListEl.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-sound]');
  if (!b) return;
  soundOn[b.dataset.sound] = !soundOn[b.dataset.sound];
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(soundOn)); } catch (err) { /* 存不了也沒關係 */ }
  renderSound();
});
renderSound();

// ===== 圖鑑 =====
const bookEl = document.getElementById('book');
const bookListEl = document.getElementById('bookList');
// 每一套收集了幾種
function kindsIn(setId) {
  return SET_BY_ID[setId].skins.filter((_, i) => collection[`${setId}.${i}`] > 0).length;
}
// 上一套收集到指定種數，下一套就解鎖
function setUnlocked(set) {
  return !set.unlock || kindsIn(set.unlock.set) >= set.unlock.kinds;
}
let bookTab = 'jelly';

function renderBook() {
  const total = SLIME_SETS.reduce((n, st) => n + kindsIn(st.id), 0);
  document.getElementById('bookCount').textContent = `${total} / ${SLIME_SETS.length * 10}`;
  const set = SET_BY_ID[bookTab];
  const unlocked = setUnlocked(set);
  let head = '<div class="bookTabs">';
  for (const st of SLIME_SETS) {
    const lock = setUnlocked(st) ? '' : ' locked';
    head += `<button type="button" class="bookTab${st.id === bookTab ? ' on' : ''}${lock}" data-set="${st.id}">${st.name}${activeSets.includes(st.id) ? '・使用中' : ''}</button>`;
  }
  head += '</div>';
  if (!unlocked) {
    const need = SET_BY_ID[set.unlock.set];
    head += `<div class="bookLock">在「${need.name}」收集 ${set.unlock.kinds} 種就會解鎖（現在 ${kindsIn(need.id)} 種）</div>`;
  } else if (activeSets.includes(set.id)) {
    const off = activeSets.length > 1 ? `<button type="button" class="useSet off" data-use="${set.id}">不要用這套</button>` : '（至少要用一套）';
    head += `<div class="bookUse">「${set.name}」使用中（${kindsIn(set.id)} / 10）${off}</div>`;
  } else {
    head += `<div class="bookUse"><button type="button" class="useSet" data-use="${set.id}">也用「${set.name}」</button>（${kindsIn(set.id)} / 10）</div>`;
  }
  head += '<div class="bookTip">可以同時用好幾套，稀有度的機率不會變。想收集的話，只選還沒收集完的套就好。</div>';
  bookListEl.innerHTML = head + '<div class="bookGrid"></div>';
  const grid = bookListEl.querySelector('.bookGrid');
  set.skins.forEach((skin, i) => {
    const id = `${set.id}.${i}`;
    const n = collection[id] || 0;
    const slot = SLOTS[i];
    const r = RARITY[slot.rarity];
    const cell = document.createElement('div');
    cell.className = n > 0 ? 'bookCell owned' : 'bookCell';
    cell.dataset.id = id;
    const cv = document.createElement('canvas');
    cv.width = 96;
    cv.height = 80;
    drawSlimeIcon(cv.getContext('2d'), id, 96, 80, n > 0);
    const name = document.createElement('div');
    name.className = 'bookName';
    name.textContent = n > 0 ? skin.name : '？？？';
    const info = document.createElement('div');
    info.className = 'bookInfo';
    info.innerHTML = `<span style="color:${r.color}">${r.name}</span> ${slot.value} 枚${n > 0 ? `<br>收集 ×${n}` : ''}`;
    cell.append(cv, name, info);
    grid.appendChild(cell);
  });
}
bookListEl.addEventListener('click', (e) => {
  const cellEl = e.target.closest('.bookCell.owned');
  if (cellEl) { openViewer(cellEl.dataset.id); return; }
  const tab = e.target.closest('button[data-set]');
  if (tab) {
    bookTab = tab.dataset.set;
    renderBook();
    return;
  }
  const use = e.target.closest('button[data-use]');
  if (use && setUnlocked(SET_BY_ID[use.dataset.use])) {
    const id = use.dataset.use;
    if (activeSets.includes(id)) {
      if (activeSets.length > 1) activeSets = activeSets.filter((x) => x !== id);
    } else {
      activeSets.push(id);
    }
    renderBook();
    saveGame();
  }
});
document.getElementById('bookBtn').addEventListener('click', () => {
  document.getElementById('ach').classList.remove('show');
  shopEl.classList.remove('show');
  document.getElementById('settings').classList.remove('show');
  bookTab = activeSets[0];
  renderBook();
  bookEl.classList.toggle('show');
});
document.getElementById('bookClose').addEventListener('click', () => bookEl.classList.remove('show'));

// ===== 圖鑑裡點娃娃：放大展示，可以左右轉 =====
const viewerEl = document.getElementById('viewer');
const viewerCanvas = document.getElementById('viewerCanvas');
let viewer = null;   // 第一次打開才建立（用自己的一個小畫面）
let viewerMesh = null;
let viewerYaw = 0;
let viewerDrag = null;
let viewerOpen = false;

function setupViewer() {
  const r = new THREE.WebGLRenderer({ canvas: viewerCanvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene();
  sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  sc.environmentIntensity = 0.7;
  sc.add(new THREE.HemisphereLight(0xfff4e0, 0x302840, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(2, 4, 3);
  sc.add(key);
  // 腳下放幾枚硬幣，半透明的娃娃才看得出透光
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(coinGeo, coinMatFancy);
    const a = (i / 7) * Math.PI * 2;
    c.position.set(Math.cos(a) * 0.55, -0.05, Math.sin(a) * 0.55 - 0.1);
    c.rotation.y = a;
    sc.add(c);
  }
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  cam.position.set(0, 0.9, 2.3);
  cam.lookAt(0, 0.3, 0);
  viewer = { r, sc, cam };
}

function openViewer(id) {
  const info = slimeInfo(id);
  if (!info) return;
  if (!viewer) setupViewer();
  if (viewerMesh) viewer.sc.remove(viewerMesh);
  viewerMesh = makeSlimeMesh(id, 1, quality !== 'low');
  viewer.sc.add(viewerMesh);
  viewerYaw = 0;
  const r = RARITY[info.rarity];
  document.getElementById('viewerName').textContent = info.skin.name;
  document.getElementById('viewerInfo').innerHTML = `<span style="color:${r.color}">${r.name}</span>　${info.value} 枚　收集 ×${collection[id] || 0}`;
  viewerEl.classList.add('show');
  if (!viewerOpen) {
    viewerOpen = true;
    requestAnimationFrame(viewerLoop);
  }
}

function viewerLoop(t) {
  if (!viewerOpen) return;
  const w = viewerCanvas.clientWidth;
  if (viewer.r.domElement.width !== Math.round(w * viewer.r.getPixelRatio())) viewer.r.setSize(w, w, false);
  if (!viewerDrag) viewerYaw += 0.006; // 沒在拖的時候慢慢轉
  viewerMesh.rotation.y = viewerYaw;
  updateSlimeEffects(viewerMesh, t / 1000);
  viewer.r.render(viewer.sc, viewer.cam);
  requestAnimationFrame(viewerLoop);
}

viewerCanvas.addEventListener('pointerdown', (e) => {
  viewerDrag = { x: e.clientX, yaw: viewerYaw };
  viewerCanvas.setPointerCapture?.(e.pointerId);
});
viewerCanvas.addEventListener('pointermove', (e) => {
  if (viewerDrag) viewerYaw = viewerDrag.yaw + (e.clientX - viewerDrag.x) * 0.012;
});
const endDrag = () => { viewerDrag = null; };
viewerCanvas.addEventListener('pointerup', endDrag);
viewerCanvas.addEventListener('pointercancel', endDrag);
function closeViewer() {
  viewerEl.classList.remove('show');
  viewerOpen = false;
}
document.getElementById('viewerClose').addEventListener('click', closeViewer);
viewerEl.addEventListener('click', (e) => { if (e.target === viewerEl) closeViewer(); });

// ===== 掉下來的慶祝 =====
// 連續推下來的幣：畫面下方有一個「+N」越疊越大，停一下才消失
const comboEl = document.getElementById('combo');
let comboCount = 0;
let comboTimer = 0;
function addCombo(v) {
  comboCount += v;
  comboTimer = 1.6;
  comboEl.textContent = `+${comboCount}`;
  comboEl.style.fontSize = `${Math.min(64, 26 + Math.sqrt(comboCount) * 5)}px`;
  comboEl.classList.add('show');
  comboEl.classList.remove('pop');
  void comboEl.offsetWidth;
  comboEl.classList.add('pop');
}
function updateCombo(frame) {
  if (comboTimer <= 0) return;
  comboTimer -= frame;
  if (comboTimer <= 0) {
    comboEl.classList.remove('show');
    comboCount = 0;
  }
}

function bigCoinFanfare() {
  [1046, 1318, 1568, 2093].forEach((f, k) => setTimeout(() => beep(f, 0.22, 0.07, 'triangle', 'big'), k * 90));
  flash('rgba(244, 201, 93, 0.18)');
}

function flash(color) {
  const el = document.getElementById('flash');
  el.style.background = color;
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}

// 娃娃推下來：畫面中間跳出卡片，金額一路往上跳，彩紙飛出來
const celebEl = document.getElementById('celebrate');
let celebTimer = null;
function celebrate(id, isNew, unlockedSet) {
  const info = slimeInfo(id);
  const r = RARITY[info.rarity];
  const cv = document.getElementById('celebIcon');
  drawSlimeIcon(cv.getContext('2d'), id, cv.width, cv.height, true);
  document.getElementById('celebRarity').innerHTML = `<span style="color:${r.color}">${r.name}</span>${isNew ? '　<span class="newTag">新！</span>' : ''}`;
  document.getElementById('celebName').textContent = info.skin.name;
  document.getElementById('celebExtra').textContent = unlockedSet ? `解鎖新的一套：「${unlockedSet}」，可以在圖鑑換` : '';
  const valEl = document.getElementById('celebValue');
  const t0 = performance.now();
  const dur = 900 + Math.min(1500, info.value * 4);
  const count = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    valEl.textContent = `+${Math.round(info.value * (1 - Math.pow(1 - k, 2)))} 枚`;
    if (k < 1 && celebEl.classList.contains('show')) requestAnimationFrame(count);
  };
  celebEl.classList.add('show');
  celebEl.dataset.rarity = info.rarity;
  requestAnimationFrame(count);
  // 彩紙
  const conf = document.getElementById('confetti');
  conf.innerHTML = '';
  const n = info.rarity === 'legend' ? 70 : info.rarity === 'rare' ? 45 : 28;
  const colors = ['#f4c95d', '#ff8fa8', '#8fd3ff', '#b4ee86', '#dcc8ff', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    p.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    conf.appendChild(p);
  }
  flash(info.rarity === 'legend' ? 'rgba(244, 201, 93, 0.35)' : 'rgba(255, 255, 255, 0.18)');
  // 音樂：稀有度越高越長
  const tune = info.rarity === 'legend'
    ? [523, 659, 784, 1046, 784, 1046, 1318, 1568, 2093]
    : info.rarity === 'rare' ? [523, 659, 784, 1046, 1318, 1568] : [659, 784, 1046, 1318];
  tune.forEach((f, k) => setTimeout(() => beep(f, 0.26, 0.07, 'triangle', 'doll'), k * 120));
  clearTimeout(celebTimer);
  celebTimer = setTimeout(closeCelebrate, info.rarity === 'legend' ? 4500 : 3200);
}
function closeCelebrate() {
  celebEl.classList.remove('show');
  document.getElementById('confetti').innerHTML = '';
}
celebEl.addEventListener('click', closeCelebrate);

// 畫面上方的小通知
const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(html) {
  toastEl.innerHTML = html;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// ===== 成就與成就商店 =====
const achEl = document.getElementById('ach');
const achListEl = document.getElementById('achList');
let achTab = 'list';
// 裝飾品換外觀時可以動到的東西
const decorView = { THREE, scene, table: table.mesh, coinMatFancy, bigMatFancy, coinMatPlain, bigMatPlain };

function checkAchievements() {
  const kinds = SLIME_SETS.reduce((n, st) => n + kindsIn(st.id), 0);
  const state = {
    stats, collection, upgrades, wallet,
    kinds,
    totalKinds: SLIME_SETS.length * 10,
    setsDone: SLIME_SETS.filter((st) => kindsIn(st.id) >= 10).length,
    legend: SLIME_SETS.some((st) => collection[`${st.id}.9`] > 0),
    maxed: UPGRADE_KEYS.filter((k) => upgrades[k] >= UPGRADES[k].prices.length).length,
    upgradeCount: UPGRADE_KEYS.length,
  };
  for (const a of ACHIEVEMENTS) {
    if (achieved[a.id] || !a.check(state)) continue;
    achieved[a.id] = true;
    achPoints += a.points;
    toast(`成就達成：${a.name}　+${a.points} 點`);
    beep(1046, 0.12, 0.05, 'triangle', 'ach');
    setTimeout(() => beep(1568, 0.2, 0.05, 'triangle', 'ach'), 120);
    if (achEl.classList.contains('show')) renderAch();
  }
}

function equipDecor(id) {
  const d = DECORATIONS.find((x) => x.id === id);
  if (!d || !ownedDecor[id]) return;
  const old = DECORATIONS.find((x) => x.id === equipped[d.slot]);
  if (old && old.remove) old.remove(decorView);
  if (equipped[d.slot] === id) {
    delete equipped[d.slot]; // 再按一次就拿下來
  } else {
    equipped[d.slot] = id;
    d.apply(decorView);
  }
}

function renderAch() {
  document.getElementById('achPoints').textContent = achPoints;
  let html = '<div class="bookTabs">'
    + `<button type="button" class="bookTab${achTab === 'list' ? ' on' : ''}" data-achtab="list">成就</button>`
    + `<button type="button" class="bookTab${achTab === 'shop' ? ' on' : ''}" data-achtab="shop">成就商店</button></div>`;
  if (achTab === 'list') {
    const done = ACHIEVEMENTS.filter((a) => achieved[a.id]).length;
    html += `<div class="bookUse">已達成 ${done} / ${ACHIEVEMENTS.length}</div>`;
    for (const a of ACHIEVEMENTS) {
      const ok = achieved[a.id];
      html += `<div class="item achItem${ok ? ' done' : ''}"><div class="info"><div class="name">${ok ? '✓ ' : ''}${a.name}</div><div class="desc">${a.desc}</div></div><div class="achPts">${a.points} 點</div></div>`;
    }
  } else {
    html += '<div class="bookTip">用成就點數買裝飾品，只改外觀，不影響遊戲。</div>';
    if (!DECORATIONS.length) {
      html += '<div class="bookLock">裝飾品準備中，之後會上架。</div>';
    }
    for (const [slot, slotName] of Object.entries(DECORATION_SLOTS)) {
      const items = DECORATIONS.filter((d) => d.slot === slot);
      if (!items.length) continue;
      html += `<div class="bookUse">${slotName}</div>`;
      for (const d of items) {
        let btn;
        if (!ownedDecor[d.id]) btn = `<button type="button" data-decorbuy="${d.id}" ${achPoints < d.price ? 'disabled' : ''}>${d.price} 點</button>`;
        else btn = `<button type="button" data-decoruse="${d.id}">${equipped[slot] === d.id ? '拿下來' : '裝上'}</button>`;
        html += `<div class="item"><div class="info"><div class="name">${d.name}</div></div>${btn}</div>`;
      }
    }
  }
  achListEl.innerHTML = html;
}

achListEl.addEventListener('click', (e) => {
  const tab = e.target.closest('button[data-achtab]');
  if (tab) { achTab = tab.dataset.achtab; renderAch(); return; }
  const buyB = e.target.closest('button[data-decorbuy]');
  if (buyB) {
    const d = DECORATIONS.find((x) => x.id === buyB.dataset.decorbuy);
    if (d && !ownedDecor[d.id] && achPoints >= d.price) {
      achPoints -= d.price;
      ownedDecor[d.id] = true;
      equipDecor(d.id);
      saveGame();
    }
    renderAch();
    return;
  }
  const useB = e.target.closest('button[data-decoruse]');
  if (useB) { equipDecor(useB.dataset.decoruse); saveGame(); renderAch(); }
});
document.getElementById('achBtn').addEventListener('click', () => {
  shopEl.classList.remove('show');
  bookEl.classList.remove('show');
  document.getElementById('settings').classList.remove('show');
  renderAch();
  achEl.classList.toggle('show');
});
document.getElementById('achClose').addEventListener('click', () => achEl.classList.remove('show'));

// 設定的「其他」頁：作弊（測試用）
for (const b of document.querySelectorAll('#settings button[data-cheat]')) {
  b.addEventListener('click', () => {
    const c = b.dataset.cheat;
    if (c === 'coin100') wallet += 100;
    else if (c === 'coin1000') wallet += 1000;
    else if (c === 'doll') dropNewDoll();
    else if (c === 'legend') dropNewDoll('legend');
    else if (c === 'rain') startRain();
    else if (c === 'sets') {
      // 每一套都補到解鎖下一套需要的種數
      for (const st of SLIME_SETS) for (let i = 0; i < 6; i++) collection[`${st.id}.${i}`] = Math.max(1, collection[`${st.id}.${i}`] || 0);
    } else if (c === 'ach') achPoints += 10;
    else if (c === 'ticket') dropProp('ticket');
    else if (c === 'item') dropProp('item');
    bump(walletEl);
    toast(`作弊：${b.textContent}`);
    saveGame();
  });
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  achEl.classList.remove('show');
  shopEl.classList.remove('show');
  bookEl.classList.remove('show');
  document.getElementById('settings').classList.toggle('show');
});
for (const b of document.querySelectorAll('#settings button[data-q]')) {
  b.addEventListener('click', () => applyQuality(b.dataset.q));
}

// ===== 金幣雨 =====
const rainBanner = document.getElementById('rainBanner');
let rainSpawn = 0;
let rainRate = 0;
// ===== 彩券與特殊道具：兩個獨立系統，都是檯面上的實體東西 =====
// 特殊道具：機台隨機（保底式）放上檯面，推下前緣馬上發動
const ITEMS = {
  wind: { name: '一陣風', label: '風', color: '#9fd8ff', dark: '#2a6fb0', desc: '往前吹 2 秒，把檯面上的幣往前推' },
  glue: { name: '黏黏球', label: '黏', color: '#6fd36a', dark: '#2d7a2a', desc: '把一小堆幣黏成一大塊' },
  quake: { name: '地震', label: '震', color: '#ff8a3d', dark: '#b3261e', desc: '檯面抖一抖，把卡住的幣抖鬆' },
};
const ITEM_CHANCE = 0.02;    // 每秒放一個道具的機率（保底式，平均大約 50 秒一個）
const TICKET_CHANCE = 0.006; // 每秒放一張彩券的機率（保底式，平均大約 3 分鐘一張），檯面上同時最多 1 張
const MAX_PROPS = 3;         // 檯面上道具加彩券最多幾個
// 彩券轉盤：推下檯面上的彩券免費轉一次；也可以花錢轉
const WHEEL = [
  { label: '10 枚', coins: 10, weight: 4, color: '#3b3150' },
  { label: '20 枚', coins: 20, weight: 4, color: '#2f4a5e' },
  { label: '30 枚', coins: 30, weight: 3, color: '#4a3b2a' },
  { label: '50 枚', coins: 50, weight: 3, color: '#2f5a44' },
  { label: '80 枚', coins: 80, weight: 2, color: '#3b3150' },
  { label: '100 枚', coins: 100, weight: 2, color: '#5a3a3a' },
  { label: '150 枚', coins: 150, weight: 1, color: '#2f4a5e' },
  { label: '大獎 500 枚', coins: 500, jackpot: true, weight: 0, color: '#7a5a1a' },
];
const WHEEL_PRICE = 60;      // 花錢轉一次的價錢（平均大約拿回 60，有賺有賠）
const JACKPOT_CHANCE = 0.03; // 每轉一次中大獎的機率（保底式）
let freeSpins = 0;           // 推下彩券拿到的免費次數
const props = [];            // 檯面上的道具和彩券
let propTimer = 0;
let windTime = 0;
let quakeTime = 0;
let quakeTick = 0;

function startRain() {
  stats.rains++;
  rainQueue = upValue('rainSize');
  rainRate = rainQueue / 2.5;
  rainSpawn = 0;
  rainBanner.classList.remove('show');
  void rainBanner.offsetWidth;
  rainBanner.classList.add('show');
  [880, 1100, 1320, 1760].forEach((f, k) => setTimeout(() => beep(f, 0.18, 0.06, 'triangle', 'rain'), k * 90));
}

// 道具效果：一陣風、地震在 stepSim 裡每一步施力；黏黏球馬上把一小堆幣黏起來
const glueMats = coinMatFancy.map((m) => {
  const c = m.clone();
  c.color = c.color.clone().multiply(new THREE.Color(0xb8f0b0)); // 黏住的幣帶一點綠
  return c;
});
const glueMatPlain = new THREE.MeshLambertMaterial({ color: 0x9ccf6a, emissive: 0x102000 });

// ===== 檯面上的道具和彩券（實體） =====
function labelTexture(bg, text, sub) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 112, 112);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${sub ? 44 : 72}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, sub ? 54 : 68);
  if (sub) {
    ctx.font = 'bold 20px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(sub, 64, 96);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const propMats = {};
function propMaterial(type, kind) {
  const key = `${type}.${kind}`;
  if (propMats[key]) return propMats[key];
  if (type === 'ticket') {
    // 反光調低，顏色才不會被燈光洗淡
    const tex = labelTexture('#c8323c', '彩券', '免費抽一次');
    const face = new THREE.MeshStandardMaterial({ map: tex, color: 0x9a9a9a, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3, roughness: 0.85, envMapIntensity: 0.2 });
    const edge = new THREE.MeshStandardMaterial({ color: 0xf4c95d, metalness: 0.6, roughness: 0.4 });
    propMats[key] = [edge, edge, face, face, edge, edge];
  } else {
    // 像玩具一樣亮亮的塑膠感；正反兩面畫圖案，側邊是純色
    const tex = itemFaceTexture(kind);
    const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.4 });
    const side = new THREE.MeshPhysicalMaterial({ color: ITEMS[kind].dark, roughness: 0.4, clearcoat: 0.4 });
    propMats[key] = [face, side];
  }
  return propMats[key];
}
const ticketGeo = new THREE.BoxGeometry(1.1, 0.07, 0.62);

// 道具做成有厚度的立體圖示：風是一朵雲、黏黏球是一滴膠水、地震是一個爆炸星形
function outlineShape(pts) {
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  sh.closePath();
  return sh;
}
function cloudPoints() {
  // 幾個圓疊在一起的外框（從中心往外看，取最遠的那個圓），底部壓平
  const circles = [[-0.24, -0.04, 0.2], [0, 0.08, 0.27], [0.25, -0.03, 0.21]];
  const pts = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = 0;
    for (const [cx, cy, r] of circles) {
      const b = dx * cx + dy * cy;
      const c = cx * cx + cy * cy - r * r;
      const disc = b * b - c;
      if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc));
    }
    pts.push([dx * best, Math.max(-0.2, dy * best)]);
  }
  return pts;
}
function dropPoints() {
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    pts.push([0.36 * Math.sin(t) * Math.sin(t / 2), 0.42 * Math.cos(t) - 0.04]);
  }
  return pts;
}
function burstPoints() {
  const pts = [];
  const n = 8;
  const jag = [1, 0.86, 1.05, 0.9, 1, 0.84, 1.08, 0.92];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + 0.2;
    const r = i % 2 === 0 ? 0.44 * jag[i / 2] : 0.24;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}
// 道具正反面的圖案。貼圖座標跟形狀座標一樣（-0.5 到 0.5），所以照形狀的位置畫
function itemFaceTexture(kind) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d');
  const it = ITEMS[kind];
  ctx.fillStyle = it.color;
  ctx.fillRect(0, 0, S, S);
  const P = (x, y) => [(x + 0.5) * S, (0.5 - y) * S]; // 形狀座標 → 畫布座標
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'wind') {
    // 三道捲起來的強風
    ctx.strokeStyle = it.dark;
    ctx.lineWidth = 14;
    for (const [y, len, curl] of [[0.12, 0.5, 0.08], [-0.02, 0.62, 0.1], [-0.15, 0.42, 0.07]]) {
      const [x0, y0] = P(-0.34, y);
      const [x1, y1] = P(-0.34 + len, y);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.arc(x1, y1 - curl * S, curl * S, Math.PI / 2, -Math.PI * 0.9, true);
      ctx.stroke();
    }
  } else if (kind === 'glue') {
    // 頂端往下滴的深綠色膠，加兩點亮光
    ctx.fillStyle = it.dark;
    ctx.beginPath();
    const [sx, sy] = P(-0.3, 0.12);
    ctx.moveTo(sx, sy);
    const drips = [[-0.2, -0.05], [-0.08, 0.04], [0.04, -0.12], [0.16, 0.02], [0.28, -0.02]];
    for (const [x, y] of drips) {
      const [px, py] = P(x, y);
      ctx.quadraticCurveTo(px - 10, py, px, py);
      ctx.arc(px, py, 9, Math.PI, 0, true);
    }
    ctx.lineTo(...P(0.32, 0.12));
    ctx.lineTo(...P(0.32, 0.5));
    ctx.lineTo(...P(-0.32, 0.5));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(...P(-0.08, -0.2), 16, 24, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(...P(0.08, -0.3), 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 中間一道裂開的閃電，加驚嘆號
    ctx.fillStyle = it.dark;
    ctx.beginPath();
    const bolt = [[0.06, 0.34], [-0.14, 0.02], [0.0, 0.02], [-0.08, -0.34], [0.16, 0.06], [0.02, 0.06], [0.12, 0.34]];
    bolt.forEach(([x, y], i) => (i ? ctx.lineTo(...P(x, y)) : ctx.moveTo(...P(x, y))));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.offset.set(0.5, 0.5); // 形狀座標 -0.5～0.5 對到貼圖 0～1
  return t;
}

const itemGeos = {};
function itemGeo(kind) {
  if (itemGeos[kind]) return itemGeos[kind];
  const pts = kind === 'wind' ? cloudPoints() : kind === 'glue' ? dropPoints() : burstPoints();
  const g = new THREE.ExtrudeGeometry(outlineShape(pts), {
    depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 12,
  });
  g.center();
  itemGeos[kind] = g;
  return g;
}

function spawnProp(type, kind, pos, rot) {

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation(rot || { x: 0, y: 0, z: 0, w: 1 })
      .setLinearDamping(0.1)
      .setAngularDamping(0.4)
      .setCcdEnabled(true),
  );
  const shape = type === 'ticket'
    ? RAPIER.ColliderDesc.cuboid(0.55, 0.035, 0.31)
    : RAPIER.ColliderDesc.convexHull(itemGeo(kind).attributes.position.array);
  world.createCollider(
    shape
      .setDensity(type === 'ticket' ? 0.8 : 0.4)
      .setFriction(0.4)
      .setContactSkin(0.01),
    body,
  );
  const mesh = new THREE.Mesh(type === 'ticket' ? ticketGeo : itemGeo(kind), propMaterial(type, kind));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  const pr = { type, kind, body, mesh };
  props.push(pr);
  return pr;
}

function removeProp(i) {
  world.removeRigidBody(props[i].body);
  scene.remove(props[i].mesh);
  props.splice(i, 1);
}

// 機台放一個道具或一張彩券到推板上方
function dropProp(type) {
  const kinds = Object.keys(ITEMS);
  const kind = type === 'ticket' ? 'ticket' : kinds[Math.floor(Math.random() * kinds.length)];
  const yaw = (Math.random() - 0.5) * 0.8;
  spawnProp(type, kind, { x: (Math.random() - 0.5) * 4, y: 3.2, z: DROP_Z }, { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
  beep(820, 0.1, 0.04, 'triangle', type === 'ticket' ? 'wheel' : 'item');
}

// 道具推下前緣：馬上發動
// 道具發動後 4 秒內推下多少，結束時告訴玩家
let itemReport = null;
function triggerItem(kind) {
  stats.itemsUsed++;
  itemReport = { kind, start: won, time: 4 };
  if (kind === 'wind') {
    windTime = 1.2;
    toast('一陣風！');
  } else if (kind === 'quake') {
    quakeTime = 1.5;
    toast('地震！');
  } else if (kind === 'glue') {
    glueCoins();
  }
  beep(520, 0.2, 0.06, 'triangle', 'item');
  setTimeout(() => beep(780, 0.2, 0.05, 'triangle', 'item'), 120);
}

// 在檯面中間一帶挑一枚幣，把它附近的幾枚黏成一塊（推起來會整塊一起動）
function glueCoins() {
  // 挑最靠近前緣的一坨幣黏成一大塊，再往前推一把，讓整坨一起掉下去
  const onTable = coins.filter((c) => {
    const t = c.body.translation();
    return t.y > 0 && t.y < 1.2 && t.z > FRONT_Z - 3 && t.z < FRONT_Z && Math.abs(t.x) < halfW - 0.3;
  });
  if (!onTable.length) { toast('檯面上沒有幣可以黏'); return; }
  onTable.sort((a, b) => b.body.translation().z - a.body.translation().z);
  const center = onTable[Math.min(onTable.length - 1, Math.floor(Math.random() * 4))];
  const p0 = center.body.translation();
  const near = onTable
    .map((c) => ({ c, d: Math.hypot(c.body.translation().x - p0.x, c.body.translation().z - p0.z) }))
    .filter((o) => o.c !== center && o.d < 1.8)
    .sort((a, b) => a.d - b.d)
    .slice(0, 11)
    .map((o) => o.c);
  const q1 = new THREE.Quaternion().copy(center.body.rotation());
  const q1inv = q1.clone().invert();
  for (const c of near) {
    const p = c.body.translation();
    const local = new THREE.Vector3(p.x - p0.x, p.y - p0.y, p.z - p0.z).applyQuaternion(q1inv);
    const q2 = new THREE.Quaternion().copy(c.body.rotation());
    const frame2 = q2.clone().invert().multiply(q1);
    const data = RAPIER.JointData.fixed(
      { x: local.x, y: local.y, z: local.z }, { x: 0, y: 0, z: 0, w: 1 },
      { x: 0, y: 0, z: 0 }, { x: frame2.x, y: frame2.y, z: frame2.z, w: frame2.w },
    );
    world.createImpulseJoint(data, center.body, c.body, true);
  }
  for (const c of [center, ...near]) {
    c.glued = true;
    c.mesh.material = quality === 'low' ? glueMatPlain : glueMats;
  }
  // 整坨往前推一把
  for (const c of [center, ...near]) c.body.applyImpulse({ x: 0, y: c.body.mass() * 1.5, z: c.body.mass() * 6 }, true);
  toast(`黏黏球！黏住了 ${near.length + 1} 枚幣`);
}

// 每一步：一陣風往前推、地震亂抖
function applyEffects() {
  if (itemReport) {
    itemReport.time -= STEP;
    if (itemReport.time <= 0) {
      const n = won - itemReport.start;
      const verb = { wind: '吹下', glue: '黏下', quake: '震下' }[itemReport.kind];
      toast(`${ITEMS[itemReport.kind].name}${verb}了 ${n} 枚！`);
      itemReport = null;
    }
  }
  if (windTime > 0) {
    windTime -= STEP;
    for (const c of coins) {
      const t = c.body.translation();
      if (t.y < -0.5 || t.z < -4) continue;
      // 風力要比幣跟檯面的摩擦力大，平躺的幣才吹得動
      c.body.applyImpulse({ x: 0, y: 0, z: c.body.mass() * 7.5 * STEP }, true);
    }
    for (const d of dolls) d.body.applyImpulse({ x: 0, y: 0, z: d.body.mass() * 7 * STEP }, true);
    for (const pr of props) pr.body.applyImpulse({ x: 0, y: 0, z: pr.body.mass() * 7 * STEP }, true);
  }
  if (quakeTime > 0) {
    quakeTime -= STEP;
    quakeTick += STEP;
    if (quakeTick >= 0.12) {
      quakeTick = 0;
      for (const c of coins) {
        if (c.body.translation().y < -0.5) continue;
        const m = c.body.mass();
        // 往上彈、稍微往前，讓卡住的幣鬆開、往前緣滑
        c.body.applyImpulse({ x: (Math.random() - 0.5) * m * 1.0, y: m * (1.2 + Math.random() * 1.0), z: m * (0.2 + Math.random() * 0.6) }, true);
      }
    }
  }
}

// ===== 彩券轉盤 =====
const wheelEl = document.getElementById('wheel');
const wheelCanvas = document.getElementById('wheelCanvas');
const jackpotChance = new PseudoRandom(JACKPOT_CHANCE);
const itemChance = new PseudoRandom(ITEM_CHANCE);
const ticketChance = new PseudoRandom(TICKET_CHANCE);
let wheelAngle = 0;
let wheelSpinning = false;

function drawWheel() {
  const ctx = wheelCanvas.getContext('2d');
  const W = wheelCanvas.width;
  const R = W / 2 - 6;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.translate(W / 2, W / 2);
  ctx.rotate(wheelAngle);
  const n = WHEEL.length;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = WHEEL[i].color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(244,201,93,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.rotate((a0 + a1) / 2);
    ctx.fillStyle = WHEEL[i].jackpot ? '#f4c95d' : '#f3eee2';
    ctx.font = `bold ${Math.round(W * 0.045)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(WHEEL[i].label, R - 12, 0);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = '#f4c95d';
  ctx.fill();
  ctx.restore();
  // 上方的指針
  ctx.beginPath();
  ctx.moveTo(W / 2 - 12, 2);
  ctx.lineTo(W / 2 + 12, 2);
  ctx.lineTo(W / 2, 28);
  ctx.closePath();
  ctx.fillStyle = '#f4c95d';
  ctx.fill();
}

function renderWheelInfo() {
  const freeBtn = document.getElementById('freeSpinBtn');
  freeBtn.textContent = `免費抽一次（還有 ${freeSpins} 次）`;
  freeBtn.disabled = freeSpins <= 0 || wheelSpinning;
  freeBtn.style.display = freeSpins > 0 ? '' : 'none';
  const payBtn = document.getElementById('paySpinBtn');
  payBtn.textContent = `花 ${WHEEL_PRICE} 枚轉一次`;
  payBtn.disabled = wallet < WHEEL_PRICE || wheelSpinning;
}

function openWheel() {
  document.getElementById('wheelResult').textContent = '';
  renderWheelInfo();
  drawWheel();
  wheelEl.classList.add('show');
}

// 先決定結果，再讓轉盤轉到那一格
function pickWheel() {
  if (jackpotChance.roll()) return WHEEL.findIndex((w) => w.jackpot);
  const total = WHEEL.reduce((n, w) => n + w.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WHEEL.length; i++) {
    r -= WHEEL[i].weight;
    if (r < 0) return i;
  }
  return 0;
}

function spinWheel(free) {
  if (wheelSpinning) return;
  if (free) {
    if (freeSpins <= 0) return;
    freeSpins--;
  } else {
    if (wallet < WHEEL_PRICE) return;
    wallet -= WHEEL_PRICE;
    bump(walletEl);
  }
  stats.spins++;
  wheelSpinning = true;
  renderWheelInfo();
  const idx = pickWheel();
  const n = WHEEL.length;
  // 指針在上方：讓第 idx 格的中間轉到上方，多轉幾圈
  const slice = (Math.PI * 2) / n;
  const target = -(idx + 0.5) * slice + (Math.random() - 0.5) * slice * 0.6;
  const start = wheelAngle;
  const base = start - (start % (Math.PI * 2));
  const end = base + Math.PI * 2 * 5 + target;
  const t0 = performance.now();
  const dur = 3200;
  let lastTickSlice = -1;
  const anim = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    wheelAngle = start + (end - start) * e;
    const cur = Math.floor(wheelAngle / slice);
    if (cur !== lastTickSlice) { lastTickSlice = cur; beep(1400, 0.03, 0.03, 'square', 'wheel'); }
    drawWheel();
    if (k < 1) requestAnimationFrame(anim);
    else finishSpin(idx);
  };
  requestAnimationFrame(anim);
}

function finishSpin(idx) {
  wheelSpinning = false;
  const w = WHEEL[idx];
  wallet += w.coins;
  bump(walletEl);
  document.getElementById('wheelResult').textContent = `轉到：${w.label}`;
  const notes = w.jackpot ? [880, 1100, 1320, 1760, 2200, 2640] : [990, 1320];
  notes.forEach((f, k) => setTimeout(() => beep(f, 0.18, 0.06, 'triangle', 'wheel'), k * 90));
  renderWheelInfo();
  saveGame();
}

document.getElementById('freeSpinBtn').addEventListener('click', () => spinWheel(true));
document.getElementById('paySpinBtn').addEventListener('click', () => spinWheel(false));
document.getElementById('wheelClose').addEventListener('click', () => wheelEl.classList.remove('show'));
document.getElementById('lotteryBtn').addEventListener('click', openWheel);

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
  stats.upgradesBought++;
  checkAchievements();
  if (key === 'guard') buildGuards();
  beep(660, 0.08, 0.06, 'triangle', 'shop');
  setTimeout(() => beep(990, 0.12, 0.06, 'triangle', 'shop'), 80);
  bump(walletEl);
  renderShop();
  saveGame();
}

shopBtn.addEventListener('click', () => {
  achEl.classList.remove('show');
  bookEl.classList.remove('show');
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
    dollCount: dollChance.count,
    jackpotCount: jackpotChance.count,
    freeSpins,
    itemCount: itemChance.count,
    ticketCount: ticketChance.count,
    props: props.map((pr) => {
      const t = pr.body.translation();
      const r = pr.body.rotation();
      return { type: pr.type, kind: pr.kind, p: [t.x, t.y, t.z], r: [r.x, r.y, r.z, r.w] };
    }),
    rareCount: rareChance.count,
    legendCount: legendChance.count,
    collection: { ...collection },
    activeSets,
    stats: { ...stats },
    achieved: { ...achieved },
    achPoints,
    ownedDecor: { ...ownedDecor },
    equipped: { ...equipped },
    dolls: dolls.map((d) => {
      const t = d.body.translation();
      const r = d.body.rotation();
      return { id: d.id, s: Math.round(d.scale * 1000) / 1000, p: [t.x, t.y, t.z], r: [r.x, r.y, r.z, r.w] };
    }),
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
  dollChance.count = Math.max(0, Math.floor(Number(d.dollCount) || 0));
  jackpotChance.count = Math.max(0, Math.floor(Number(d.jackpotCount) || 0));
  // 舊版的轉盤券換成免費抽獎次數
  freeSpins = Math.max(0, Math.floor(Number(d.freeSpins ?? d.tickets) || 0));
  itemChance.count = Math.max(0, Math.floor(Number(d.itemCount) || 0));
  ticketChance.count = Math.max(0, Math.floor(Number(d.ticketCount) || 0));
  for (const pr of (d.props || []).slice(0, MAX_PROPS)) {
    if (!Array.isArray(pr.p) || !Array.isArray(pr.r)) continue;
    if (pr.type === 'ticket' || ITEMS[pr.kind]) {
      spawnProp(pr.type === 'ticket' ? 'ticket' : 'item', pr.kind, { x: pr.p[0], y: pr.p[1], z: pr.p[2] }, { x: pr.r[0], y: pr.r[1], z: pr.r[2], w: pr.r[3] });
    }
  }
  rareChance.count = Math.max(0, Math.floor(Number(d.rareCount) || 0));
  legendChance.count = Math.max(0, Math.floor(Number(d.legendCount) || 0));
  // 舊版（0.0.18）的娃娃名字對不上新的套，就不載入
  for (const [k, n] of Object.entries(d.collection || {})) {
    if (slimeInfo(k)) collection[k] = Math.max(0, Math.floor(Number(n) || 0));
  }
  const sets = (Array.isArray(d.activeSets) ? d.activeSets : [d.activeSet]).filter((id) => SET_BY_ID[id] && setUnlocked(SET_BY_ID[id]));
  if (sets.length) activeSets = [...new Set(sets)];
  for (const k of Object.keys(stats)) stats[k] = Math.max(0, Number(d.stats?.[k]) || 0);
  for (const a of ACHIEVEMENTS) if (d.achieved?.[a.id]) achieved[a.id] = true;
  achPoints = Math.max(0, Math.floor(Number(d.achPoints) || 0));
  for (const x of DECORATIONS) if (d.ownedDecor?.[x.id]) ownedDecor[x.id] = true;
  for (const [slot, id] of Object.entries(d.equipped || {})) {
    if (DECORATION_SLOTS[slot] && ownedDecor[id]) equipDecor(id);
  }
  for (const dd of (d.dolls || []).slice(0, MAX_DOLLS)) {
    if (!Array.isArray(dd.p) || !Array.isArray(dd.r)) continue;
    spawnDoll(dd.id, Number(dd.s) || 1, { x: dd.p[0], y: dd.p[1], z: dd.p[2] }, { x: dd.r[0], y: dd.r[1], z: dd.r[2], w: dd.r[3] });
  }
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

// 娃娃和道具比側溝寬，掉進去會卡在檯面邊緣和玻璃中間，這種就當作掉進側溝了
function stuckInGutter(t) {
  return Math.abs(t.x) > halfW + 0.05 && t.y < 0.5;
}

// 物理走一步，並處理掉下去的幣
function stepSim() {
  simTime += STEP;
  movePusher();
  applyEffects();
  world.step();
  for (let i = coins.length - 1; i >= 0; i--) {
    const b = coins[i].body.translation();
    const value = coins[i].value;
    if (b.y < -1.2) {
      if (b.z > FRONT_Z - 0.5 && Math.abs(b.x) < halfW + 0.1) {
        won += value;
        wallet += value;
        stats.coinsWon += value;
        if (value > 1) stats.bigWon++;
        floatText(`+${value}`, new THREE.Vector3(b.x, 0, FRONT_Z), value > 1 ? 'big' : '');
        bump(walletEl);
        addCombo(value);
        if (value > 1) {
          bigCoinFanfare();
        } else {
          // 連續掉下來時音越來越高，像一串叮叮叮
          beep(1100 * (1 + Math.min(comboCount, 24) * 0.025), 0.14, 0.07, 'sine', 'win');
        }
      } else {
        lost += value;
      }
      removeCoin(i);
    }
  }
  for (let i = props.length - 1; i >= 0; i--) {
    const t = props[i].body.translation();
    if (t.y >= -1.2 && !stuckInGutter(t)) continue;
    const pr = props[i];
    const front = t.z > FRONT_Z - 0.6 && Math.abs(t.x) < halfW + 0.2;
    removeProp(i);
    if (pr.type === 'ticket') {
      if (front) {
        freeSpins++;
        toast('推下彩券！免費抽一次');
        if (!wheelEl.classList.contains('show')) openWheel(); else renderWheelInfo();
      } else {
        toast('彩券掉進側溝了……');
      }
    } else if (front) {
      triggerItem(pr.kind);
    } else {
      toast(`${ITEMS[pr.kind].name}掉進側溝了……`);
    }
  }
  for (let i = dolls.length - 1; i >= 0; i--) {
    const t = dolls[i].body.translation();
    if (t.y >= -1.2 && !stuckInGutter(t)) continue;
    const d = dolls[i];
    const info = slimeInfo(d.id);
    if (t.z > FRONT_Z - 0.6 && Math.abs(t.x) < halfW + 0.2) {
      const r = RARITY[info.rarity];
      const isNew = !collection[d.id];
      const lockedBefore = SLIME_SETS.filter((st) => !setUnlocked(st)).map((st) => st.id);
      collection[d.id] = (collection[d.id] || 0) + 1;
      stats.dollsCollected++;
      wallet += info.value;
      won += info.value;
      bump(walletEl);
      floatText(`+${info.value}`, new THREE.Vector3(t.x, 0, FRONT_Z));
      let msg = `<span style="color:${r.color}">${r.name}</span>　${info.skin.name}${isNew ? '　<span class="newTag">新！</span>' : ''}　+${info.value} 枚`;
      const opened = lockedBefore.filter((sid) => setUnlocked(SET_BY_ID[sid]));
      if (opened.length) msg += `<br>解鎖新的一套：「${SET_BY_ID[opened[0]].name}」，可以在圖鑑換`;
      celebrate(d.id, isNew, opened.length ? SET_BY_ID[opened[0]].name : null);
      if (bookEl.classList.contains('show')) renderBook();
      saveGame();
    } else {
      toast(`${info.skin.name}掉進側溝了……`);
    }
    removeDoll(i);
  }
}

// 跟時間有關的事：連投、放娃娃、金幣雨、媽媽十元（每一幀呼叫一次）
function updateTimers(frame) {
  // 按住連投，或自動投幣
  if (pointerDown || autoDrop) tryDrop();

  // 每一秒檢查一次成就
  achTimer += frame;
  if (achTimer >= 1) {
    achTimer -= 1;
    checkAchievements();
  }

  // 每一秒擲一次要不要放新娃娃（保底式假隨機）
  dollTimer += frame;
  if (dollTimer >= 1) {
    dollTimer -= 1;
    if (dolls.length < MAX_DOLLS && dollChance.roll()) dropNewDoll();
  }

  // 每一秒擲一次要不要放道具、彩券（保底式假隨機）
  propTimer += frame;
  if (propTimer >= 1) {
    propTimer -= 1;
    if (props.length < MAX_PROPS && itemChance.roll()) dropProp('item');
    if (props.length < MAX_PROPS && !props.some((p) => p.type === 'ticket') && ticketChance.roll()) dropProp('ticket');
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

  updateTimers(frame);
  updateCombo(frame);

  // 同步畫面
  for (const c of coins) {
    c.mesh.position.copy(c.body.translation());
    c.mesh.quaternion.copy(c.body.rotation());
  }
  pusher.mesh.position.copy(pusher.body.translation());
  for (const pr of props) {
    pr.mesh.position.copy(pr.body.translation());
    pr.mesh.quaternion.copy(pr.body.rotation());
  }
  for (const d of dolls) {
    d.mesh.position.copy(d.body.translation());
    d.mesh.quaternion.copy(d.body.rotation());
    updateSlimeEffects(d.mesh, now / 1000);
  }
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
window.__game = { coins, world, camera, get moving() { return movingCount; }, applyQuality, get quality() { return quality; }, get wallet() { return wallet; }, get won() { return won; }, get lost() { return lost; }, dropAt(x) { aimX = x; dropCoin(); }, upgrades, buy, setWallet(n) { wallet = n; }, startRain, UPGRADES, get rain() { return rainQueue; }, dolls, collection, dropNewDoll, spawnDoll, get activeSets() { return activeSets; }, openViewer, props, dropProp, spawnProp, triggerItem, get freeSpins() { return freeSpins; }, spinWheel, spawnCoin, clearTable() { while (coins.length) removeCoin(coins.length - 1); while (dolls.length) removeDoll(dolls.length - 1); while (props.length) removeProp(props.length - 1); }, stats, achieved, get achPoints() { return achPoints; }, checkAchievements, PseudoRandom, get auto() { return autoDrop; }, soundOn, bigChance, setAuto, saveGame, saveData, simulate(sec) { for (let i = 0; i < sec * 60; i++) stepSim(); },
  // 測試用：照真實時間跑物理和計時（自動投幣、娃娃、金幣雨、媽媽都會動），每一步呼叫 onStep
  play(sec, onStep) { for (let i = 0; i < sec * 60; i++) { stepSim(); updateTimers(STEP); if (onStep) onStep(i * STEP); } },
  setAim(x) { aimX = x; }, upValue, canBuy(key) { const lv = upgrades[key]; const i = UPGRADE_KEYS.indexOf(key); return shopVisible(i) && lv < UPGRADES[key].prices.length && wallet >= UPGRADES[key].prices[lv]; }, UPGRADE_KEYS };
requestAnimationFrame((t) => { lastT = t; tick(t); });
