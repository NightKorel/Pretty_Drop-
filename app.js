// 推幣機：檯面、推板、投幣、幣掉下去加錢，用贏來的幣在商店買升級。
import * as THREE from './lib/three.module.js';
import RAPIER from './lib/rapier.mjs';
import { RoomEnvironment } from './lib/RoomEnvironment.js';
import { makeCoinMaterials, makeFaceMaps } from './coin.js?v=0.0.104';
import { drawDigits } from './digits.js?v=0.0.104';
import { TREASURES, TREASURE_ORDER, PEARL_R, treasureGeo, treasureMaterial } from './treasure.js?v=0.0.104';
import { START_LAYOUT, START_PHASE } from './start-layout.js?v=0.0.104';
import {
  RARITY, SLOTS, SLIME_SETS, SET_BY_ID, slimeInfo, makeSlimeMesh, slimeHullPoints,
  updateSlimeEffects, drawSlimeIcon, slimePartBoxes, SPARE_SKINS, SLIME_R,
} from './slime.js?v=0.0.104';
import { ACHIEVEMENTS, ACH_CATS, achIconSvg, DECORATIONS, DECORATION_SLOTS, STAT_NAMES, REMOVED_DECOR } from './achievements.js?v=0.0.104';

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
try {
  await initPhysics();
} catch (e) {
  window.__fail?.('E05', e && e.message);
  throw e;
}
document.getElementById('loading').textContent = '機台準備中……（擺硬幣）';

// ===== 數值（之後調手感主要改這裡） =====
const GUTTER = 0.85;         // 兩側溝的寬度，幣掉進去就被機台吃掉（越寬吃越多）
const TABLE_W = 9.4 - GUTTER * 2; // 檯面寬（推板也是這麼寬）；外框固定，側溝變寬檯面就變窄
const FRONT_Z = 3;           // 檯面前緣（幣掉過這裡就算贏）
const BACK_Z = -10;          // 檯面最後面
const WALL_Z = -6.3;         // 推板上方擋牆的位置
// 推板前緣來回的中點在 -3.5（前後 ±1.2）。推板做得很長、尾巴藏在擋牆後面：
// 長推板多伸 3 格的時候，尾巴也還在擋牆後面，後面不會空出一段地面讓幣掉進去卡住
const PUSHER_DEPTH = 7.5;    // 推板前後長度
const PUSHER_H = 0.6;        // 推板高度
const PUSHER_MID = -3.5 - PUSHER_DEPTH / 2; // 推板中心來回的中點
const PUSHER_AMP = 1.2;      // 推板來回的幅度
const COIN_R = 0.5;          // 硬幣做大顆、厚一點，每一枚看起來比較值錢
const COIN_H = 0.14;
const DROP_Y = 3.2;          // 投幣高度
const DROP_Z = -4.6;         // 投幣的前後位置（推板上方）
const STEP = 1 / 60;           // 物理一步的秒數
const START_WALLET = 30;
const MAX_COINS = 300;       // 檯面上幣的上限（保護效能）
const GUARD_H = 0.1;          // 側溝擋板的高度（一枚幣厚 0.14，擋板大約七成高）
const MOM_GIVE = 10;         // 媽媽每次給幾枚
const MOM_CAP = 100;         // 手上滿這麼多，媽媽就先不給（免得掛機刷）

// ===== 商店升級 =====
// 增量遊戲的節奏：一開始只有一項、很便宜；買過一次才會出現下一項。
// 順序照常識：越無感的越前面、越便宜；越有感的越後面、越貴（2026-10-05 納可定）。
// 例外：媽媽十元永遠排第一個（納可：比較好笑）；一次多投永遠排最後一個（2026-10-05 納可：天價，本來就該最後）。
// 每升一級價錢乘上 growth。levels 第 0 格是還沒升級時的數值。
const UPGRADES = {
  refill: {
    name: '媽媽十元',
    desc: '冒著被打的風險……再投一點錢……升級以增加課金的勇氣。',
    levels: [30, 26, 22, 19, 16, 14, 12, 10],          // 媽媽幾秒給一次
    base: 10, growth: 1.45,
  },
  guard: {
    name: '側溝擋板',
    desc: '從前緣往後裝矮矮的擋板，幣比較不會掉進兩側溝',
    levels: [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2],   // 擋板長度
    base: 10, growth: 1.45,
  },
  speed: {
    name: '推板加速',
    desc: '推板來回得更快，幣推得更勤',
    levels: [4.4, 4.25, 4.1, 3.95, 3.8, 3.65, 3.5, 3.4], // 推板來回一次幾秒（一開始慢；滿級和每級幅度都收小，2026-10-05 納可：最快太快，滿級再從 3.0 放慢到 3.4）
    base: 20, growth: 1.5,
  },
  dropRate: {
    name: '投幣速度',
    desc: '手變快，一秒能投更多枚（一開始一秒一枚）',
    levels: [1.0, 0.9, 0.82, 0.75, 0.69, 0.64, 0.6],  // 兩次投幣之間至少隔幾秒（2026-10-05 納可：滿級太快，整體調慢，一開始的 1 秒不動；原本滿級 0.35）
    base: 30, growth: 1.5,
  },
  lucky: {
    name: '大金幣',
    desc: '投幣時有機會掉出大金幣（推下去值 10 枚），升級讓機會變大',
    levels: [0, 0.015, 0.025, 0.035, 0.045, 0.055, 0.065, 0.08], // 每投一枚變成大金幣的機率（沒買就沒有）
    base: 60, growth: 1.55,
  },
  rain: {
    name: '金幣雨',
    desc: '解鎖技能「金幣雨」：按一下，天上掉下一場金幣雨。升級讓冷卻變短',
    levels: [0, 240, 210, 180, 160, 140, 120, 105, 90], // 冷卻幾秒（沒買就不能用）。2026-10-05 納可：改成主動技能，不再隨機
    base: 120, growth: 1.5,
  },
  rainSize: {
    name: '金幣雨變大',
    desc: '每場金幣雨撒下來的幣變多',
    levels: [30, 40, 50, 60, 70, 80, 100, 150],        // 一場金幣雨幾枚
    base: 200, growth: 1.5,
  },
  shake: {
    name: '甩一甩',
    desc: '解鎖技能「甩一甩」：抓著機台左右甩，把卡住的東西甩下去。升級讓冷卻變短',
    levels: [0, 300, 270, 240, 210, 180, 150],         // 冷卻幾秒（沒買就不能用）
    base: 300, growth: 1.6,
  },
  summon: {
    name: '召喚史萊姆',
    desc: '解鎖技能「召喚」：按一下，馬上放一隻史萊姆娃娃到推板上。升級讓冷卻變短',
    levels: [0, 240, 210, 180, 150, 120, 100],         // 冷卻幾秒（沒買就不能用）。2026-10-05 納可要的
    base: 800, growth: 1.6,
  },
  multi: {
    name: '一次多投',
    desc: '每投一次，一起丟出好幾枚（每枚一樣要花 1 枚）',
    levels: [1, 2, 3],                                  // 一次丟幾枚（2026-10-05 納可：最多一次 3 枚，升到 3 枚是天價）
    base: 1000, growth: 10,
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

// ===== 輪迴 =====
// 玩家自己選什麼時候輪迴：清空錢、商店升級、檯面；保留圖鑑、成就、裝飾品和輪迴點買的東西。
// 輪迴點照「這一輪累計賺的錢」換，像經驗值表：第 n 點要累計賺到 REBIRTH_BASE × n^1.5 枚（越後面越難）。
// 數值是 Claude 先隨意設定的（2026-10-05），之後看手感調。
const REBIRTH_BASE = 1000;  // 第 1 點 1000 枚（2026-10-05 納可：不要放太高）
function rebirthNeed(n) {
  const x = REBIRTH_BASE * Math.pow(n, 1.5);
  return x < 10000 ? Math.round(x / 100) * 100 : Math.round(x / 1000) * 1000;
}
// 輪迴點商店：costs 是每一級要幾點。每一級都一樣 1 點，不會越來越貴（納可：輪迴點每一點都很珍貴）
// 以後要卡進度，用「這一層全部升到多少級才開第二層」來卡（納可定）
// 每一級的效果不一定一樣，所以畫面上只寫「升級後」那一級的效果（納可定）。eff(lv) 是第 lv 級的效果
const PERK_MULT = 0.1;       // 收入加成每級 +10%，用加的（3 級就是多拿 30%）（2026-10-05 納可定）
const PERK_MONEY = [0, 100, 300, 600, 1000, 1500]; // 初始資金每一級總共多幾枚（納可定）
const PERK_OFF = 0.1;        // 商店打折每級 -10%
const PERKS = {
  mult: { name: '收入加成', costs: [1, 1, 1, 1, 1], eff: (lv) => `推下來的幣、娃娃、轉盤都多拿 ${Math.round(lv * PERK_MULT * 100)}%` },
  startMoney: { name: '初始資金', costs: [1, 1, 1, 1, 1], eff: (lv) => `輪迴後一開始手上多 ${PERK_MONEY[lv]} 枚` },
  headStart: { name: '起跑', costs: [1, 1, 1], eff: (lv) => `輪迴後「媽媽十元」「投幣速度」「推板加速」直接從 Lv ${lv} 開始` },
  discount: { name: '商店打折', costs: [1, 1, 1, 1], eff: (lv) => `商店升級便宜 ${Math.round(lv * PERK_OFF * 100)}%` },
  dollCap: { name: '娃娃上限', costs: [1, 1], eff: (lv) => `檯面上同時最多 ${MAX_DOLLS + lv} 隻娃娃` },
  // 小寶物（2026-10-05 納可定：可以解鎖和增加上限）：照價值順序一級開一種
  gems: { name: '小寶物', costs: [1, 1, 1], eff: (lv) => `機台會放${TREASURE_ORDER.slice(0, lv).map((k) => `${TREASURES[k].name}（${TREASURES[k].value} 枚）`).join('、')}` },
  gemCap: { name: '寶物上限', costs: [1, 1, 1], eff: (lv) => `檯面上同時最多 ${MAX_TREASURES + lv} 個小寶物` },
};
const PERK_KEYS = Object.keys(PERKS);
// shopping：按了兩次輪迴、正在輪迴點商店裡（點數已經拿到，還沒按「重生」）；gained 是這次拿到幾點
const rebirth = { points: 0, count: 0, shopping: false, gained: 0, perks: Object.fromEntries(PERK_KEYS.map((k) => [k, 0])) };
const perkLv = (k) => rebirth.perks[k];
// 商店升級的價錢（打折後一樣取乾脆的數字）
function upPrice(key, lv = upgrades[key]) {
  const p = UPGRADES[key].prices[lv];
  const off = 1 - perkLv('discount') * PERK_OFF;
  return off < 1 ? niceMoney(p * off) : p;
}
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
let gameReady = false;        // 讀完存檔才開始存（免得讀檔途中存到一半的東西）
let lastDrop = -1;
let refillTimer = 0;
let simTime = 0;
let pusherPhase = 0;         // 推板走到來回的哪裡（0 到 1）
const upgrades = Object.fromEntries(UPGRADE_KEYS.map((k) => [k, 0]));
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
const dollQueue = [];        // 等著放上推板的史萊姆（推板縮在後面放不下時）
const collection = {};       // 圖鑑：每種娃娃收集了幾隻
const DOLL_CHANCE = 0.03;    // 每秒放一隻娃娃的機率（保底式，平均大約 35 秒一隻）
let activeSets = ['jelly'];  // 現在用哪幾套娃娃（可以同時選好幾套，機率不變）
const DOLL_MIN = 2;           // 少於這麼多隻就很快補上
const DOLL_LOW_WAIT = 3;      // 少於 DOLL_MIN 隻後幾秒補一隻（Claude 定）
let dollLowT = 0;
const MAX_DOLLS = 3;         // 檯面上最多同時幾隻；一開始 3 隻，輪迴點「娃娃上限」才加（2026-10-05 納可定）
const maxDolls = () => MAX_DOLLS + perkLv('dollCap');
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
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  window.__fail?.('E03', e && e.message);
  throw e;
}
// 手機記憶體不夠時，系統會把 3D 畫面關掉，跳提示告訴玩家
canvas.addEventListener('webglcontextlost', () => {
  // 3D 畫面被系統關掉（多半是記憶體不夠）：下次打開直接用低畫質
  try { localStorage.setItem('pretty_drop_quality', 'low'); } catch (e) { /* 沒關係 */ }
  window.__warn?.('E09');
});
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
const HEMI_COLOR = hemi.color.clone();
const SUN_COLOR = sun.color.clone();
const FEVER_HEMI = new THREE.Color(0xffb8d6); // 狂熱時的燈光顏色
const FEVER_SUN = new THREE.Color(0xffd9a0);
let feverBlend = 0;
sun.position.set(4, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 10, bottom: -10, near: 1, far: 40 });
scene.add(sun);
const warm = new THREE.PointLight(0xffb85c, 14, 20);
warm.position.set(0, 5, 2);
scene.add(warm);

// 燈光（成就商店的裝飾品）：換掉環境光、主燈、上方小燈的顏色和亮度；霓虹多兩盞彩色燈。null 換回原本的
const LIGHT_BASE = { hemi: [hemi.color.getHex(), hemi.intensity], sun: [sun.color.getHex(), sun.intensity], warm: [warm.color.getHex(), warm.intensity], exp: renderer.toneMappingExposure, env: scene.environmentIntensity };
let neonLights = null;
function setLight(m) {
  const L = m || LIGHT_BASE;
  HEMI_COLOR.set(L.hemi[0]);
  hemi.intensity = L.hemi[1];
  SUN_COLOR.set(L.sun[0]);
  sun.intensity = L.sun[1];
  warm.color.set(L.warm[0]);
  warm.intensity = L.warm[1];
  renderer.toneMappingExposure = L.exp;
  scene.environmentIntensity = L.env; // 倒影收小一點，燈光的顏色才看得出來（金幣大多是反射倒影）
  hemi.color.copy(HEMI_COLOR);
  sun.color.copy(SUN_COLOR);
  if (L.neon && !neonLights) {
    neonLights = [new THREE.PointLight(0xff5fb8, 30, 16), new THREE.PointLight(0x4fe3ff, 30, 16)];
    neonLights[0].position.set(-4.5, 3, -2);
    neonLights[1].position.set(4.5, 3, -2);
    for (const n of neonLights) scene.add(n);
  }
  if (neonLights) for (const n of neonLights) n.visible = !!L.neon;
}

// ===== 物理 =====
// 切換「難推」：檯面上所有摩擦力是 0.3 的（硬幣、檯面）一起換掉，之後投的幣也照新的
function setHardPush(on, quiet = false) {
  const from = hardPush ? HARD_FRICTION : COIN_FRICTION;
  hardPush = on;
  const to = coinFriction();
  world.colliders.forEach((col) => {
    if (Math.abs(col.friction() - from) < 1e-6) col.setFriction(to);
    if (Math.abs(col.restitution() - (on ? 0.05 : 0)) < 1e-6 && col.parent()?.isDynamic()) col.setRestitution(on ? 0 : 0.05);
  });
  try { localStorage.setItem(HARD_KEY, on ? '1' : '0'); } catch (e) { /* 存不了就算了 */ }
  const b = document.querySelector('[data-cheat="hard"]');
  if (b) b.textContent = `測試：難推（${on ? '開' : '關'}）`;
  if (!quiet) toast(on ? '難推：開（摩擦力 0.5）' : '難推：關（摩擦力 0.3）');
}
const world = new RAPIER.World({ x: 0, y: -19.6, z: 0 });
world.timestep = 1 / 60;
const TABLE_FRICTION = 0.3;
const COIN_FRICTION = 0.3;
// 測試版參數「難推」（2026-10-05 納可：推幣要難推一點才有刺激感；先放在設定「其他」的作弊裡試，不改主遊戲）：
// 硬幣、檯面的摩擦力 0.3 → 0.5，硬幣彈跳 0.05 → 0。開關記在這台瀏覽器，不進存檔
const HARD_FRICTION = 0.5;
const HARD_KEY = 'pretty_drop_hard';
let hardPush = false;
try { hardPush = localStorage.getItem(HARD_KEY) === '1'; } catch (e) { /* 存不了就不開 */ }
const coinFriction = () => (hardPush ? HARD_FRICTION : COIN_FRICTION);

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
// 碰撞分組：兩側的牆只擋一般硬幣，其他東西（大金幣、史萊姆、彩券、道具）會直接穿過去，
// 自然地掉進側溝，不會卡在檯面邊緣和牆中間（納可定）
const GROUP_WALL = 0x0002;
const GROUP_COIN = 0x0004;
const GROUP_OTHER = 0x0008;
const groups = (member, filter) => (member << 16) | filter;
const WALL_GROUPS = groups(GROUP_WALL, GROUP_COIN);
const COIN_GROUPS = groups(GROUP_COIN, 0xffff);
const OTHER_GROUPS = groups(GROUP_OTHER, 0xffff & ~GROUP_WALL);
// 左右的牆拿掉了（2026-10-05 納可：偶爾有金幣卡在兩邊很奇怪），推到側邊的東西直接掉進側溝
// 推板上方的擋牆（推板往回縮時，把推板上的幣刮下來）
const backWall = addBox(outerW, 3, 0.2, 0, PUSHER_H + 0.05 + 3, WALL_Z, 0x3b2f4f, { rough: 0.6 }).mesh;
// 推板
const pusher = addBox(halfW - 0.02, PUSHER_H / 2, PUSHER_DEPTH / 2, 0, PUSHER_H / 2, PUSHER_MID, 0x8d92a3, { kinematic: true, metal: 0.7, rough: 0.3 });
// 推板表面比較澀，推板變快時上面的幣才會跟著走，不會一直滑來滑去
pusher.body.collider(0).setFriction(0.9);
// 推板花紋（成就商店的裝飾品）：薄薄一層貼在推板上面和正面，只有樣子
const DECO_TILE = 1.1;       // 花紋一小塊的大小（格）
const decoCanvas = document.createElement('canvas');
decoCanvas.width = decoCanvas.height = 128;
const decoTex = new THREE.CanvasTexture(decoCanvas);
decoTex.colorSpace = THREE.SRGBColorSpace;
decoTex.wrapS = decoTex.wrapT = THREE.RepeatWrapping;
decoTex.anisotropy = 4;
const decoMeshes = [];
{
  const w = (halfW - 0.02) * 2;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w, PUSHER_DEPTH), new THREE.MeshStandardMaterial({ map: decoTex.clone(), transparent: true, roughness: 0.5, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 }));
  top.material.map.repeat.set(w / DECO_TILE, PUSHER_DEPTH / DECO_TILE);
  top.rotation.x = -Math.PI / 2;
  top.position.y = PUSHER_H / 2 + 0.003;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, PUSHER_H), new THREE.MeshStandardMaterial({ map: decoTex.clone(), transparent: true, roughness: 0.5, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 }));
  front.material.map.repeat.set(w / DECO_TILE, PUSHER_H / DECO_TILE);
  front.position.z = PUSHER_DEPTH / 2 + 0.003;
  for (const m of [top, front]) {
    m.receiveShadow = true;
    m.visible = false;
    pusher.mesh.add(m);
    decoMeshes.push(m);
  }
}
function setPusherDeco(draw) {
  const ctx = decoCanvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  if (draw) draw(ctx);
  for (const m of decoMeshes) {
    m.visible = !!draw;
    m.material.map.needsUpdate = true;
  }
}
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
// 前緣下面沒有出幣口了：畫面只看到檯面，下面那塊沒用的拿掉

// ===== 娃娃展示架 =====
// 自己挑幾隻收集到的史萊姆，擺在機台旁邊的小台座上（2026-10-04 納可：收集到的娃娃擺在機台旁邊，自己挑要擺哪幾隻）。
// 在圖鑑點開收集過的史萊姆，就可以擺上去或拿下來。只是裝飾，不會動。
// 畫面是直的（手機）擺在機台前面下方一排；橫的（電腦）左右兩邊各三個
const SHELF_MAX = 6;
const shelf = [];            // 擺了哪幾隻（id），照位置
const shelfItems = [];       // 每個位置的台座＋史萊姆
const pedGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.16, 28);
const pedMat = new THREE.MeshStandardMaterial({ color: 0x4a3326, roughness: 0.6 });
const pedRimGeo = new THREE.TorusGeometry(0.43, 0.025, 8, 32);
const pedRimMat = new THREE.MeshStandardMaterial({ color: 0xf4c95d, metalness: 0.8, roughness: 0.3 });
let shelfPortrait = false;
function shelfSpot(k) {
  if (shelfPortrait) return [(k - (SHELF_MAX - 1) / 2) * 1.3, -0.9, FRONT_Z + 1.35];
  const side = k < 3 ? -1 : 1;
  const row = k % 3;
  return [side * 5.6, -0.2, -3.0 + row * 1.8];
}
function buildShelf() {
  for (const it of shelfItems) scene.remove(it);
  shelfItems.length = 0;
  shelf.forEach((id, k) => {
    if (!id || !slimeInfo(id)) return;
    const g = new THREE.Group();
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.08;
    ped.receiveShadow = true;
    const rim = new THREE.Mesh(pedRimGeo, pedRimMat);
    rim.rotation.x = Math.PI / 2;
    const m = makeSlimeMesh(id, 0.5, quality !== 'low');
    g.add(ped, rim, m);
    g.userData.slime = m;
    const [x, y, z] = shelfSpot(k);
    g.position.set(x, y, z);
    // 手機的鏡頭是從上面往下看，整個往前傾，才看得到臉；電腦的兩邊朝中間轉一點
    if (shelfPortrait) { g.rotation.x = -0.75; g.scale.setScalar(1.12); } else { g.rotation.set(-0.25, -Math.sign(x) * 0.25, 0, 'YXZ'); g.scale.setScalar(1.15); }
    scene.add(g);
    shelfItems.push(g);
  });
}
function layoutShelf(portrait) {
  if (portrait === shelfPortrait && shelfItems.length) return;
  shelfPortrait = portrait;
  buildShelf();
}
function toggleShelf(id) {
  const k = shelf.indexOf(id);
  if (k >= 0) shelf[k] = null;
  else {
    const free = [...Array(SHELF_MAX).keys()].find((i) => !shelf[i]);
    if (free === undefined) return false;
    shelf[free] = id;
  }
  buildShelf();
  saveGame();
  return true;
}

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
      .setCollisionGroups(big ? OTHER_GROUPS : COIN_GROUPS)
      .setFriction(coinFriction())
      .setRestitution(hardPush ? 0 : 0.05),
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
      .setContactSkin(0.01)
      .setCollisionGroups(OTHER_GROUPS),
    body,
  );
  const mesh = makeSlimeMesh(id, scale, quality !== 'low');
  // 耳朵、翅膀加上小小的碰撞盒，才不會穿進硬幣和別的史萊姆（很輕，不太影響整隻的重量）
  for (const p of slimePartBoxes(mesh)) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(...p.half)
        .setTranslation(...p.pos)
        .setRotation(p.rot)
        .setDensity(0.05)
        .setFriction(0.5)
        .setContactSkin(0.01)
        .setCollisionGroups(OTHER_GROUPS),
      body,
    );
  }
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

// 娃娃保底（納可定）：把「選擇的全部史萊姆」每一種放 DOLL_ROUNDS 份進袋子，洗亂之後一隻一隻拿，
// 拿完再補一袋。這樣最多抽完一袋就一定看得到每一種，不會一直抽不到某一種。
// 選好幾組時：全部放進同一個袋子；換組（多選或少選一組）就整袋重裝，新選的組馬上會出現。
// 拿的時候不會連續兩隻同一組（納可定）：從「上一隻以外的組」裡挑，袋子裡剩越多的組越容易被挑到，
// 這樣每一組會一起慢慢變少，不會最後剩一大串同一組。只選一組的時候就照順序拿。
const DOLL_ROUNDS = 3;
let dollBag = [];
let lastDollSet = null;
function newDollBag() {
  const ids = activeSets.flatMap((set) => SLOTS.map((_, i) => `${set}.${i}`));
  const bag = [];
  for (let r = 0; r < DOLL_ROUNDS; r++) bag.push(...ids);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
function refillDollBag() {
  dollBag = newDollBag();
}

// 機台放一隻新的娃娃到推板上方
function dropNewDoll(forceRarity) {
  // 檯面上不會同時有兩隻一樣造型的史萊姆
  const onTable = new Set([...dolls.map((d) => d.id), ...dollQueue.map((q) => q.id)]);
  let id = null;
  if (forceRarity) {
    // 作弊用：指定稀有度，不從袋子拿
    const choices = activeSets.flatMap((set) => SLOTS.map((sl, i) => (sl.rarity === forceRarity ? `${set}.${i}` : null)))
      .filter((x) => x && !onTable.has(x));
    if (!choices.length) return;
    id = choices[Math.floor(Math.random() * choices.length)];
  } else {
    // 袋子裡有已經沒在用的套，先丟掉
    dollBag = dollBag.filter((x) => activeSets.includes(x.split('.')[0]));
    if (!dollBag.length) refillDollBag();
    // 選好幾組、袋子快抽完只剩上一隻那一組時，先把下一袋接在後面，才不會連續同一組
    if (activeSets.length > 1 && dollBag.every((x) => x.startsWith(lastDollSet + '.'))) dollBag.push(...newDollBag());
    const ok = dollBag.filter((x) => !onTable.has(x));
    if (!ok.length) return; // 袋子裡剩下的都正好在檯面上，等下一次
    // 照袋子裡每組剩幾隻來抽組（上一隻的組先排除；排除完沒得選才放行）
    const count = {};
    for (const x of ok) { const st = x.split('.')[0]; count[st] = (count[st] || 0) + 1; }
    let sets = Object.keys(count).filter((st) => st !== lastDollSet);
    if (!sets.length) sets = Object.keys(count);
    let r = Math.random() * sets.reduce((a, st) => a + count[st], 0);
    const pick = sets.find((st) => (r -= count[st]) < 0) || sets[sets.length - 1];
    // 袋子已經洗亂過，拿這一組最前面的那隻
    const k = dollBag.findIndex((x) => !onTable.has(x) && x.startsWith(pick + '.'));
    id = dollBag.splice(k, 1)[0];
    lastDollSet = pick;
  }
  const scale = 0.85 + Math.random() * 0.35; // 大小略有不同
  const yaw = (Math.random() - 0.5) * 0.8;   // 大致面向玩家
  dollQueue.push({ id, scale, rot: { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) } });
  placeQueuedDolls();
}

// 史萊姆直接放在推板上（2026-10-05 納可：從高處掉下來很容易一路滾下去）。
// 推板縮在後面、上面放不下的時候先排隊，等推板推出來再放；擋到的幣、寶物、道具往旁邊頂開
function placeQueuedDolls() {
  while (dollQueue.length) {
    const q = dollQueue[0];
    const r = SLIME_R * q.scale;
    const front = pusher.body.translation().z + PUSHER_DEPTH / 2;
    const zMin = WALL_Z + 0.2 + r;
    const zMax = front - 0.2 - r;
    if (zMax < zMin) return;
    const z = zMin + Math.random() * Math.min(0.4, zMax - zMin);
    // 挑擋到最少東西的位置
    const others = [
      ...coins.map((c) => ({ body: c.body, r: c.value > 1 ? BIG_R : COIN_R })),
      ...treasures.map((t) => ({ body: t.body, r: 0.45 })),
      ...props.map((p) => ({ body: p.body, r: 0.6 })),
      ...dolls.map((d) => ({ body: d.body, r: SLIME_R * (d.scale || 1) })),
    ].filter((o) => o.body.translation().y > PUSHER_H - 0.3);
    const lim = Math.min(2.4, halfW - r - 0.1);
    let best = 0;
    let bestN = Infinity;
    for (let k = 0; k < 9; k++) {
      const x = (k / 8 * 2 - 1) * lim + (Math.random() - 0.5) * 0.2;
      const n = others.filter((o) => { const t = o.body.translation(); return Math.hypot(t.x - x, t.z - z) < r + o.r; }).length;
      if (n < bestN || (n === bestN && Math.random() < 0.4)) { bestN = n; best = x; }
    }
    for (const o of others) {
      const t = o.body.translation();
      let dx = t.x - best;
      let dz = t.z - z;
      const d = Math.hypot(dx, dz);
      if (d >= r + o.r) continue;
      if (d < 0.01) { dx = Math.random() - 0.5; dz = 0.3; }
      const k = (r + o.r + 0.05) / Math.hypot(dx, dz);
      o.body.setTranslation({ x: best + dx * k, y: t.y + 0.05, z: z + dz * k }, true);
      o.body.setLinvel({ x: dx * k * 0.5, y: 0, z: dz * k * 0.5 }, true);
    }
    spawnDoll(q.id, q.scale, { x: best, y: PUSHER_H + 0.2, z }, q.rot);
    dollQueue.shift();
    beep(700, 0.12, 0.05, 'triangle', 'doll');
    setTimeout(() => beep(1050, 0.16, 0.05, 'triangle', 'doll'), 110);
  }
}

// ===== 推板移動 =====
// 用「走到哪裡」記推板位置，這樣升級加速時推板不會突然跳位置
// 長推板（納可定）：速度跟平常一樣，只是那一下推得特別長。等推板退到最後面（那時候推板是停住的），
// 下一趟往前多伸 reachExtra；推得遠要走比較久，所以那一趟的時間跟著拉長，速度就不變。推完一趟再恢復
function movePusher() {
  const prev = pusherPhase;
  pusherPhase = (pusherPhase + STEP / pusherPeriod()) % 1;
  if (prev < 0.75 && pusherPhase >= 0.75) {
    reachExtra = reachQueued ? REACH_EXTRA : 0;
    reachQueued = false;
  }
  const z = PUSHER_MID + reachExtra / 2 + (PUSHER_AMP + reachExtra / 2) * Math.sin(pusherPhase * Math.PI * 2);
  pusher.body.setNextKinematicTranslation({ x: 0, y: PUSHER_H / 2, z });
}
function pusherPeriod() {
  return upValue('speed') * (PUSHER_AMP + reachExtra / 2) / PUSHER_AMP / (feverTime > 0 ? FEVER_SPEED : 1);
}
function pusherSpeedZ() {
  const w = (Math.PI * 2) / pusherPeriod();
  return (PUSHER_AMP + reachExtra / 2) * w * Math.cos(pusherPhase * Math.PI * 2);
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

// 賺錢都走這裡：算上輪迴的收入加成（小數存起來，湊滿 1 枚再給）
let earnCarry = 0;
function earn(v) {
  const x = v * (1 + perkLv('mult') * PERK_MULT) + earnCarry;
  const n = Math.floor(x);
  earnCarry = x - n;
  wallet += n;
  won += n;
  return n;
}

// ===== 介面 =====
// 畫面規則（納可定）：東西多的時候分類、可以收合，不要一次排一大串；
// 價錢寫在那一行裡，按鈕只寫「升級」「購買」，每個按鈕一樣大
const GROUP_KEY = 'pretty_drop_groups';
let groupOpen = {};
try { groupOpen = JSON.parse(localStorage.getItem(GROUP_KEY) || '{}'); } catch (e) { /* 用預設 */ }
// 一個可以收合的分類。summary 是收起來時也看得到的小統計
function groupHtml(key, title, summary, inner, defOpen = false) {
  const open = groupOpen[key] ?? defOpen;
  return `<details class="grp" data-grp="${key}"${open ? ' open' : ''}><summary><span class="grpTitle">${title}</span><span class="grpSum">${summary}</span></summary>${inner}</details>`;
}
// 打開或收起來就記住（重畫畫面也不會跑掉）
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!d.matches || !d.matches('details[data-grp]')) return;
  groupOpen[d.dataset.grp] = d.open;
  try { localStorage.setItem(GROUP_KEY, JSON.stringify(groupOpen)); } catch (err) { /* 存不了也沒關係 */ }
}, true);
// 一行可以買的東西：名字、等級、說明、價錢（買得起是金色），右邊一個一樣大的按鈕
function buyRowHtml({ name, lv = '', desc = '', price = '', canPay = true, btn, info = '' }) {
  const priceHtml = price ? `<div class="price${canPay ? '' : ' short'}">${price}</div>` : '';
  return `<div class="item"><div class="info"${info}><div class="name">${name}${lv ? `<span class="lv">${lv}</span>` : ''}</div>${desc ? `<div class="desc">${desc}</div>` : ''}${priceHtml}</div>${btn}</div>`;
}

const walletEl = document.getElementById('wallet');
const refillEl = document.getElementById('refill');
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
// 主動技能的圓鈕（右下角，一顆一顆往上疊）：解鎖了才出現，冷卻時顯示倒數
const SKILLS = [
  { el: document.getElementById('skillBtn'), key: 'shake', name: '甩一甩', cd: () => shakeCd, use: () => startShake() },
  { el: document.getElementById('rainBtn'), key: 'rain', name: '金幣雨', cd: () => rainCd, use: () => startRainSkill() },
  { el: document.getElementById('summonBtn'), key: 'summon', name: '召喚', cd: () => summonCd, use: () => startSummon() },
];
for (const sk of SKILLS) { sk.el.addEventListener('click', sk.use); sk.shown = null; }
function updateSkillBtn() {
  for (const sk of SKILLS) {
    const unlocked = upValue(sk.key) > 0;
    const left = Math.ceil(sk.cd());
    const text = !unlocked ? '' : left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : sk.name;
    if (text === sk.shown) continue;
    sk.shown = text;
    sk.el.hidden = !unlocked;
    sk.el.textContent = text;
    sk.el.disabled = left > 0;
  }
}
// 狂熱條：平常顯示累積多少；狂熱時顯示剩幾秒（慢慢變短）
const feverFill = document.getElementById('feverFill');
function updateFeverBar() {
  const k = feverTime > 0 ? feverTime / FEVER_TIME : feverGauge / FEVER_MAX;
  feverFill.style.width = `${Math.min(100, k * 100).toFixed(1)}%`;
}
function updateHud() {
  walletEl.textContent = wallet;
  updateSkillBtn();
  updateFeverBar();
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
// 置中的字，開頭和結尾的符號不算（2026-10-05 納可定）：例如「+1」是 1 在正中間、「金幣雨！」是幣在正中間。
// 做法：符號用絕對定位掛在字的外面，不佔置中的寬度
const HANG_L = /^[+＋\-－!！?？…。，、,.「『（(\s]+/;
const HANG_R = /[!！?？…。，、,.」』）)~～\s]+$/;
function hangHtml(text) {
  const t = String(text);
  const l = (t.match(HANG_L) || [''])[0];
  const rest = t.slice(l.length);
  const r = (rest.match(HANG_R) || [''])[0];
  const core = rest.slice(0, rest.length - r.length);
  if (!core) return t;
  return `<span class="hc">${l ? `<span class="hl">${l}</span>` : ''}${core}${r ? `<span class="hr">${r}</span>` : ''}</span>`;
}

function floatText(text, worldPos, cls = '') {
  const p = worldPos.clone().project(camera);
  const el = document.createElement('div');
  el.className = cls ? `float ${cls}` : 'float';
  el.innerHTML = hangHtml(text);
  el.style.left = `${(p.x * 0.5 + 0.5) * window.innerWidth}px`;
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
const dollChance = new PseudoRandom(DOLL_CHANCE);


function setAuto(on) {
  const changed = autoDrop !== on;
  autoDrop = on;
  autoBtn.classList.toggle('on', on);
  autoBtn.textContent = on ? '自動中' : '自動';
  if (changed && gameReady) saveGame(); // 切換就存，重新整理也記得
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
  // 只要看得到檯面和一點點側溝就好（牆沒畫出來）
  const needW = TABLE_W + GUTTER * 1.2;
  const halfFovX = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  const dist = Math.max(10.5, (needW / 2) / Math.tan(halfFovX) * 1.02);
  // 鏡頭看向檯面中間偏後，檯面前緣剛好在畫面下緣附近
  layoutShelf(camera.aspect < 0.8);
  if (camera.aspect < 0.8) {
    // 直的手機畫面：寬度被卡住，改成比較往下俯視，檯面在畫面上會變高、填滿上下
    camera.position.set(0, dist * 0.86, 0.6 + dist * 0.42);
    camera.lookAt(0, -0.9, -2.0);
  } else {
    camera.position.set(0, dist * 0.7, 0.2 + dist * 0.66);
    camera.lookAt(0, -0.9, -2.4);
  }
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ===== 畫質設定 =====
// 高：全部效果；中：關陰影、解析度降一點；低：再關反射和幣面圖案，解析度最低
const QUALITY_KEY = 'pretty_drop_quality';
let quality = 'high';
let qualityChosen = false;   // 這台裝置選過畫質沒（沒選過，第一次打開會先問）
try {
  const q = localStorage.getItem(QUALITY_KEY);
  if (q) { quality = q; qualityChosen = true; }
} catch (e) { /* 存不了就用預設 */ }
// 依裝置猜的畫質：現在只給自動測試用（2026-10-05 納可：畫面上一律標「預設是高」，手機不好才自己選中或低）
function suggestQuality() {
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const small = Math.min(screen.width, screen.height) < 900;
  if (!(touch && small)) return 'high';
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  return mem >= 6 && cores >= 6 ? 'mid' : 'low';
}
// 第一次打開：讓玩家自己選畫質（2026-10-05 納可：朋友手機第一次開不起來）。選好才開始畫 3D
function askQuality() {
  const el = document.getElementById('qualityPick');
  el.classList.add('show');
  window.__picking = true;
  return new Promise((done) => {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      el.classList.remove('show');
      window.__picking = false;
      done(b.dataset.pick);
    });
  });
}

function applyQuality(q) {
  quality = q;
  if (gameReady) setTimeout(prewarmSlimes, 300); // 換畫質，材質也換了，重新熱身
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
    c.mesh.material = c.value > 1 ? bigMeshMat : coinMeshMat;
  }
  for (const t of treasures) t.mesh.material = treasureMaterial(t.kind, q !== 'low');
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
// 解鎖過的組記在存檔裡，之後就算改了解鎖順序也不會被鎖回去
const unlockedSets = new Set(['jelly']);
function setUnlocked(set) {
  if (unlockedSets.has(set.id)) return true;
  const ok = !set.unlock || kindsIn(set.unlock.set) >= set.unlock.kinds;
  if (ok) unlockedSets.add(set.id);
  return ok;
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
    refillDollBag(); // 換組就整袋重裝
    prewarmSlimes();
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
let viewerYaw = 0;
let viewerDrag = null;
let viewerOpen = false;

// 一個小畫面：只放一隻史萊姆（圖鑑放大和慶祝小卡都用這個）
function makeMiniView(canvas, withCoins) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene();
  sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  sc.environmentIntensity = 0.7;
  sc.add(new THREE.HemisphereLight(0xfff4e0, 0x302840, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(2, 4, 3);
  sc.add(key);
  if (withCoins) {
    // 腳下放幾枚硬幣，半透明的娃娃才看得出透光
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(coinGeo, coinMatFancy);
      const a = (i / 7) * Math.PI * 2;
      c.position.set(Math.cos(a) * 0.8, -0.07, Math.sin(a) * 0.8 - 0.1);
      c.rotation.y = a;
      sc.add(c);
    }
  }
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  cam.position.set(0, 1.1, 2.9);
  cam.lookAt(0, 0.42, 0);
  return { r, sc, cam, mesh: null };
}
function miniSetSlime(view, id) {
  if (view.mesh) view.sc.remove(view.mesh);
  view.mesh = makeSlimeMesh(id, 1, quality !== 'low');
  view.sc.add(view.mesh);
  // 頭上有甜筒帽、長耳朵這種高高的東西，鏡頭退後一點，才不會被切掉
  const top = new THREE.Box3().setFromObject(view.mesh).max.y;
  const k = Math.max(1, (top + 0.08) / 1.18);
  view.cam.position.set(0, 0.42 + 0.68 * k, 2.9 * k);
  view.cam.lookAt(0, 0.42 + (k - 1) * 0.5, 0);
}
// 史萊姆熱身：第一次出現某種史萊姆時，顯示卡要現場準備那種材質的畫法，畫面會頓一下；
// 慶祝小卡第一次出現還要開一個新的 3D 畫面。所以趁空檔先把「選的那幾組」都準備好（主畫面和慶祝小卡都要）。
// 同樣的材質只要準備一次，所以每種外觀挑一隻代表就好
let warmKey = '';
async function prewarmSlimes() {
  const key = `${quality}|${activeSets.join(',')}`;
  if (key === warmKey) return;
  warmKey = key;
  const fancy = quality !== 'low';
  const group = new THREE.Group();
  const seen = new Set();
  for (const set of activeSets) {
    SET_BY_ID[set].skins.forEach((sk, i) => {
      const k = `${sk.look}|${sk.animal || ''}|${sk.sparkle ? 1 : 0}`;
      if (seen.has(k)) return;
      seen.add(k);
      group.add(makeSlimeMesh(`${set}.${i}`, 1, fancy));
    });
  }
  for (const k of TREASURE_ORDER) group.add(new THREE.Mesh(treasureGeo(k), treasureMaterial(k, fancy)));
  if (!celebView) celebView = makeMiniView(document.getElementById('celebIcon'), false);
  const warm = (r, cam, sc) => (r.compileAsync ? r.compileAsync(group, cam, sc) : Promise.resolve(r.compile(group, cam, sc)));
  try {
    await warm(renderer, camera, scene);
    await warm(celebView.r, celebView.cam, celebView.sc);
  } catch (e) { /* 熱身失敗也沒關係，只是第一次會頓一下 */ }
  // 慶祝小卡在看不見的狀態下先秀一次：粗體字、排版、小卡的 3D 畫面大小都先準備好
  if (!celebEl.classList.contains('show')) {
    celebEl.classList.add('show', 'warm');
    document.getElementById('celebName').textContent = '史萊姆';
    document.getElementById('celebValue').textContent = '+150 枚';
    miniSetSlime(celebView, `${activeSets[0]}.0`);
    miniRender(celebView, SPIN_START, performance.now());
    requestAnimationFrame(() => requestAnimationFrame(() => celebEl.classList.remove('show', 'warm')));
  }
}
function miniRender(view, yaw, t) {
  const c = view.r.domElement;
  const w = c.clientWidth;
  const h = c.clientHeight;
  const pr = view.r.getPixelRatio();
  if (c.width !== Math.round(w * pr) || c.height !== Math.round(h * pr)) {
    view.r.setSize(w, h, false);
    view.cam.aspect = w / h;
    view.cam.updateProjectionMatrix();
  }
  view.mesh.rotation.y = yaw;
  updateSlimeEffects(view.mesh, t / 1000);
  view.r.render(view.sc, view.cam);
}
// 從臉朝左一點開始轉，轉過正面再往右，不會一下就轉到背面
const SPIN_START = -0.75;

function setupViewer() {
  viewer = makeMiniView(viewerCanvas, true);
}

// 圖鑑放大展示下面的「擺上展示架」（收集過的才有）
let viewerId = null;
const shelfBtn = document.getElementById('shelfBtn');
function renderShelfBtn() {
  shelfBtn.hidden = !collection[viewerId];
  const on = shelf.includes(viewerId);
  shelfBtn.textContent = on ? '從展示架拿下來' : '擺上展示架';
  shelfBtn.classList.toggle('on', on);
}
shelfBtn.addEventListener('click', () => {
  if (!viewerId) return;
  if (!toggleShelf(viewerId)) toast(`展示架滿了（最多 ${SHELF_MAX} 隻），先拿下來一隻`);
  renderShelfBtn();
  if (bookEl.classList.contains('show')) renderBook();
});
function openViewer(id) {
  const info = slimeInfo(id);
  if (!info) return;
  if (!viewer) setupViewer();
  miniSetSlime(viewer, id);
  viewerYaw = SPIN_START;
  const r = RARITY[info.rarity];
  document.getElementById('viewerName').textContent = info.skin.name;
  document.getElementById('viewerInfo').innerHTML = `<span style="color:${r.color}">${r.name}</span>　${info.value} 枚　收集 ×${collection[id] || 0}`;
  viewerId = id;
  renderShelfBtn();
  viewerEl.classList.add('show');
  if (!viewerOpen) {
    viewerOpen = true;
    requestAnimationFrame(viewerLoop);
  }
}

function viewerLoop(t) {
  if (!viewerOpen) return;
  if (!viewerDrag) viewerYaw += 0.006; // 沒在拖的時候慢慢轉
  miniRender(viewer, viewerYaw, t);
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
  comboEl.innerHTML = hangHtml(`+${comboCount}`);
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
  // 小卡裡直接放會轉的 3D 史萊姆
  if (!celebView) celebView = makeMiniView(document.getElementById('celebIcon'), false);
  miniSetSlime(celebView, id);
  celebYaw = SPIN_START;
  if (!celebSpinning) {
    celebSpinning = true;
    requestAnimationFrame(celebLoop);
  }
  document.getElementById('celebRarity').innerHTML = `<span style="color:${r.color}">${r.name}</span>${isNew ? '　<span class="newTag">新！</span>' : ''}`;
  document.getElementById('celebName').textContent = info.skin.name;
  document.getElementById('celebExtra').textContent = unlockedSet ? `解鎖新的一套：「${unlockedSet}」，可以在圖鑑換` : '';
  const valEl = document.getElementById('celebValue');
  const t0 = performance.now();
  const dur = 900 + Math.min(1500, info.value * 4);
  const count = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    valEl.innerHTML = hangHtml(`+${Math.round(info.value * (1 - Math.pow(1 - k, 2)))} 枚`);
    if (k < 1 && celebEl.classList.contains('show')) requestAnimationFrame(count);
  };
  celebEl.classList.add('show');
  celebEl.dataset.rarity = info.rarity;
  requestAnimationFrame(count);
  // 彩紙：全部畫在同一張畫布上（以前每一片都是一個網頁元素，片數多的時候手機會頓）
  startConfetti(info.rarity === 'legend' ? 70 : info.rarity === 'rare' ? 45 : 28);
  flash(info.rarity === 'legend' ? 'rgba(244, 201, 93, 0.35)' : 'rgba(255, 255, 255, 0.18)');
  // 音樂：稀有度越高越長
  const tune = info.rarity === 'legend'
    ? [523, 659, 784, 1046, 784, 1046, 1318, 1568, 2093]
    : info.rarity === 'rare' ? [523, 659, 784, 1046, 1318, 1568] : [659, 784, 1046, 1318];
  tune.forEach((f, k) => setTimeout(() => beep(f, 0.26, 0.07, 'triangle', 'doll'), k * 120));
  clearTimeout(celebTimer);
  celebTimer = setTimeout(closeCelebrate, info.rarity === 'legend' ? 4500 : 3200);
}
const confCanvas = document.getElementById('confetti');
let confPieces = [];
let confRunning = false;
function startConfetti(n) {
  const colors = ['#f4c95d', '#ff8fa8', '#8fd3ff', '#b4ee86', '#dcc8ff', '#ffffff'];
  const W = window.innerWidth;
  const t0 = performance.now();
  confPieces = [];
  for (let i = 0; i < n; i++) {
    confPieces.push({
      x: Math.random() * W, drift: (Math.random() - 0.5) * 160, color: colors[i % colors.length],
      start: t0 + Math.random() * 500, dur: 1600 + Math.random() * 1400, spin: (Math.random() - 0.5) * 4 * Math.PI * 2,
    });
  }
  if (!confRunning) { confRunning = true; requestAnimationFrame(drawConfetti); }
}
function drawConfetti(now) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (confCanvas.width !== Math.round(W * dpr) || confCanvas.height !== Math.round(H * dpr)) {
    confCanvas.width = Math.round(W * dpr);
    confCanvas.height = Math.round(H * dpr);
  }
  const ctx = confCanvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  let alive = 0;
  for (const p of confPieces) {
    const k = (now - p.start) / p.dur;
    if (k < 0) { alive++; continue; }
    if (k >= 1) continue;
    alive++;
    const e = k * k; // 越掉越快
    ctx.save();
    ctx.translate(p.x + p.drift * e, -20 + e * H * 1.05);
    ctx.rotate(p.spin * e);
    ctx.globalAlpha = 1 - 0.2 * k;
    ctx.fillStyle = p.color;
    ctx.fillRect(-4, -7, 8, 14);
    ctx.restore();
  }
  if (alive) { requestAnimationFrame(drawConfetti); return; }
  ctx.clearRect(0, 0, W, H);
  confRunning = false;
}
let celebView = null;
let celebYaw = 0;
let celebSpinning = false;
function celebLoop(t) {
  if (!celebEl.classList.contains('show')) { celebSpinning = false; return; }
  celebYaw += 0.006;
  miniRender(celebView, celebYaw, t);
  requestAnimationFrame(celebLoop);
}
function closeCelebrate() {
  celebEl.classList.remove('show');
  document.getElementById('confetti').innerHTML = '';
}
// 慶祝卡片不擋畫面、不用點，時間到自己淡掉

// 畫面上方的小通知
const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(html) {
  toastEl.innerHTML = /[<]/.test(html) ? html : hangHtml(html); // 純文字才把首尾符號掛出去
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// 硬幣圖案：換一般幣和大金幣正面的貼圖。裝著硬幣顏色（例如銀色）的話，先拿下再裝回去，顏色才會跟著新圖案
const faceMapCache = {};
let faceBase = null;
function setCoinFace(kind) {
  const fronts = [coinMatFancy[1], bigMatFancy[1]];
  if (!faceBase) faceBase = { map: fronts[0].map, normalMap: fronts[0].normalMap, roughnessMap: fronts[0].roughnessMap };
  const maps = kind ? (faceMapCache[kind] ||= makeFaceMaps(kind)) : faceBase;
  const tint = DECORATIONS.find((x) => x.id === equipped.coin);
  if (tint) tint.remove(decorView);
  for (const m of fronts) {
    m.map = maps.map;
    m.normalMap = maps.normalMap;
    m.roughnessMap = maps.roughnessMap;
    m.userData.baseMap = undefined;
    m.needsUpdate = true;
  }
  if (tint) tint.apply(decorView);
}

// ===== 成就與成就商店 =====
const achEl = document.getElementById('ach');
const achListEl = document.getElementById('achList');
let achTab = 'list';
// 裝飾品換外觀時可以動到的東西
const decorView = { THREE, scene, table: table.mesh, pusher: pusher.mesh, setPusherDeco, setLight, setCoinFace, coinMatFancy, bigMatFancy, coinMatPlain, bigMatPlain };

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
    for (const [cat, title] of Object.entries(ACH_CATS)) {
      const list = ACHIEVEMENTS.filter((a) => a.cat === cat);
      if (!list.length) continue;
      const n = list.filter((a) => achieved[a.id]).length;
      const inner = list.map((a) => {
        const ok = achieved[a.id];
        // 沒達成：名字和說明都是「？？？」，圖標照樣看得到，當作提示
        return `<div class="item achItem${ok ? ' done' : ''}">${achIconSvg(a.icon)}<div class="info"><div class="name">${ok ? a.name : '？？？'}</div><div class="desc">${ok ? a.desc : '？？？'}</div></div><div class="achPts">${a.points} 點</div></div>`;
      }).join('');
      html += groupHtml(`ach.${cat}`, title, `${n} / ${list.length}`, inner);
    }
  } else {
    html += '<div class="bookTip">用成就點數買裝飾品，只改外觀，不影響遊戲。點名字可以先預覽。</div>';
    if (!DECORATIONS.length) {
      html += '<div class="bookLock">裝飾品準備中，之後會上架。</div>';
    }
    for (const [slot, slotName] of Object.entries(DECORATION_SLOTS)) {
      const items = DECORATIONS.filter((d) => d.slot === slot);
      if (!items.length) continue;
      let inner = '';
      for (const d of items) {
        const owned = ownedDecor[d.id];
        inner += buyRowHtml({
          info: ` data-preview="${d.id}"`,
          name: `${d.name}<span class="pvTag">預覽</span>`,
          price: owned ? (equipped[slot] === d.id ? '裝著' : '已擁有') : `${d.price} 點`,
          canPay: owned || achPoints >= d.price,
          btn: owned ? `<button type="button" data-decoruse="${d.id}">${equipped[slot] === d.id ? '拿下' : '裝上'}</button>`
            : `<button type="button" data-decorbuy="${d.id}" ${achPoints < d.price ? 'disabled' : ''}>購買</button>`,
        });
      }
      const own = items.filter((d) => ownedDecor[d.id]).length;
      html += groupHtml(`decor.${slot}`, slotName, `已擁有 ${own} / ${items.length}`, inner);
    }
  }
  achListEl.innerHTML = html;
}

// 預覽（納可定：裝飾品要有預覽）：成就面板先收起來，把裝飾品暫時裝上去看，下面一條可以直接買或返回
const previewBar = document.getElementById('previewBar');
let previewing = null;
function previewDecor(id) {
  const d = DECORATIONS.find((x) => x.id === id);
  if (!d) return;
  const cur = DECORATIONS.find((x) => x.id === equipped[d.slot]);
  if (cur) cur.remove(decorView);
  d.apply(decorView);
  previewing = d;
  achEl.classList.remove('show');
  const owned = ownedDecor[d.id];
  document.getElementById('previewName').textContent = d.name;
  document.getElementById('previewPrice').textContent = owned ? (equipped[d.slot] === d.id ? '裝著' : '已擁有') : `${d.price} 點（手上 ${achPoints} 點）`;
  const act = document.getElementById('previewAct');
  act.textContent = owned ? '裝上' : '購買';
  act.disabled = owned ? equipped[d.slot] === d.id : achPoints < d.price;
  previewBar.classList.add('show');
}
function cancelPreview() {
  const d = previewing;
  if (!d) return;
  previewing = null;
  d.remove(decorView);
  const cur = DECORATIONS.find((x) => x.id === equipped[d.slot]);
  if (cur) cur.apply(decorView);
  previewBar.classList.remove('show');
}
function endPreview() {
  if (!previewing) return;
  cancelPreview();
  renderAch();
  achEl.classList.add('show');
}
// 預覽中按了上面其他按鈕：換回原本的樣子
document.addEventListener('click', (e) => {
  if (previewing && e.target.closest('#shopBtn, #bookBtn, #settingsBtn, #achBtn, #lotteryBtn')) cancelPreview();
}, true);
document.getElementById('previewBack').addEventListener('click', endPreview);
document.getElementById('previewAct').addEventListener('click', () => {
  const d = previewing;
  if (!d) return;
  endPreview();
  if (!ownedDecor[d.id]) {
    if (achPoints < d.price) return;
    achPoints -= d.price;
    ownedDecor[d.id] = true;
  }
  if (equipped[d.slot] !== d.id) equipDecor(d.id);
  saveGame();
  renderAch();
});

achListEl.addEventListener('click', (e) => {
  const pv = e.target.closest('[data-preview]');
  if (pv) { previewDecor(pv.dataset.preview); return; }
  const tab = e.target.closest('button[data-achtab]');
  if (tab) { achTab = tab.dataset.achtab; renderAch(); return; }
  const buyB = e.target.closest('button[data-decorbuy]');
  if (buyB) {
    const d = DECORATIONS.find((x) => x.id === buyB.dataset.decorbuy);
    if (d && !ownedDecor[d.id] && achPoints >= d.price) {
      achPoints -= d.price;
      ownedDecor[d.id] = true;
      if (equipped[d.slot] !== d.id) equipDecor(d.id);
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
    else if (c === 'hard') setHardPush(!hardPush);
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
  wind: { name: '陣風', label: '風', color: '#9fd8ff', dark: '#2a6fb0', desc: '往前吹 2 秒，把檯面上的幣往前推' },
  reach: { name: '長推板', label: '推', color: '#ffd166', dark: '#c0661c', desc: '推板下一下推得特別長，速度不變' },
  quake: { name: '地震', label: '震', color: '#ff8a3d', dark: '#b3261e', desc: '檯面抖一抖，把卡住的幣抖鬆' },
};
const ITEM_CHANCE = 0.02;    // 每秒放一個道具的機率（保底式，平均大約 50 秒一個）
const TICKET_CHANCE = 0.006; // 每秒放一張彩券的機率（保底式，平均大約 3 分鐘一張），檯面上同時最多 1 張
const MAX_PROPS = 3;         // 檯面上道具加彩券最多幾個
const MAX_TREASURES = 2;     // 檯面上小寶物一開始最多幾個（輪迴點「寶物上限」再加）
const TREASURE_CHANCE = 0.05; // 每秒放一個小寶物的機率（保底式，平均大約 20 秒一個）
const treasures = [];        // 檯面上的小寶物
let treasureTimer = 0;
// 彩券轉盤：推下檯面上的彩券免費轉一次；也可以花錢轉。
// 一圈的順序照納可給的（2026-10-05）：500 10 100 200 20 50 200 50 20 200 100 10，從正上方順時針排。
// 500 是紅色大獎、三格 200 是金色（格子比較寬，剛好在上下左右），其他都是黑色小格。
// weight 是抽到的機會（跟格子寬度無關）。平均一次大約拿回 95 枚（價錢 100）
const WHEEL = [
  { coins: 500, big: true, jackpot: true, weight: 0 }, // 上：大獎，用保底式機率
  { coins: 10, weight: 9.18 }, { coins: 100, weight: 9.18 },
  { coins: 200, big: true, weight: 7.85 },             // 右
  { coins: 20, weight: 9.18 }, { coins: 50, weight: 9.18 },
  { coins: 200, big: true, weight: 7.85 },             // 下
  { coins: 50, weight: 9.18 }, { coins: 20, weight: 9.18 },
  { coins: 200, big: true, weight: 7.85 },             // 左
  { coins: 100, weight: 9.18 }, { coins: 10, weight: 9.18 },
];
const WHEEL_UNIT = (Math.PI * 2) / WHEEL.reduce((n, w) => n + (w.big ? 2 : 1), 0);
// 每一格的中心角度（從正上方開始順時針算）和半寬
{
  let cum = 0;
  for (const w of WHEEL) {
    const span = (w.big ? 2 : 1) * WHEEL_UNIT;
    w.mid = cum + span / 2 - WHEEL_UNIT; // 第一格（大獎）的中心在正上方
    w.half = span / 2;
    cum += span;
  }
}
const WHEEL_PRICE = 100;     // 花錢轉一次的價錢（納可定）
const JACKPOT_CHANCE = 0.03; // 每轉一次中大獎的機率（保底式）
let freeSpins = 0;           // 推下彩券拿到的免費次數
const props = [];            // 檯面上的道具和彩券
let propTimer = 0;
let windTime = 0;
let quakeTime = 0;
let quakeTick = 0;
let reachQueued = false;     // 長推板：等推板退到最後面，下一趟推長的
// 甩一甩：甩下去的東西照樣算（2026-10-05 納可：冷卻那麼長，讓玩家開心一點；原本甩下去的不算、放回檯面）
const SHAKE_TIME = 1.2;      // 甩幾秒
let shakeTime = 0;
let shakeTick = 0;
let shakeDir = 1;
let shakeCd = 0;             // 冷卻還剩幾秒
let reachExtra = 0;          // 長推板：這一趟推板多伸出去多少
const REACH_EXTRA = 3.0;     // 多伸 3 格。推板尾巴會離開擋牆，掉到推板後面的東西由 rescueBehind() 放回來

// 從畫面上方翻轉著掉下一枚幣（金幣雨、狂熱時間共用）
function dropRainCoin() {
  const x = (Math.random() * 2 - 1) * (halfW - COIN_R - 0.2);
  const c = spawnCoin(x, 9 + Math.random() * 3, -5.5 + Math.random() * 6, Math.PI);
  if (!c) return false;
  c.body.setLinvel({ x: 0, y: -2 - Math.random() * 2, z: 0 }, true);
  c.body.setAngvel({ x: (Math.random() - 0.5) * 16, y: 0, z: (Math.random() - 0.5) * 16 }, true);
  if (Math.random() < 0.3) clink(0.6);
  return true;
}

// 金幣雨（主動技能，2026-10-05 納可定）：冷卻好了按一下就下一場
let rainCd = 0;
function startRainSkill() {
  if (upValue('rain') <= 0 || rainCd > 0 || rainQueue > 0) return;
  rainCd = upValue('rain');
  startRain();
}

// 召喚史萊姆（主動技能，2026-10-05 納可要的）：馬上從袋子抽一隻放到推板上。
// 檯面上的娃娃已經滿了就不放、也不算冷卻（Claude 定）
let summonCd = 0;
function startSummon() {
  if (upValue('summon') <= 0 || summonCd > 0) return;
  if (dolls.length + dollQueue.length >= maxDolls()) {
    toast('檯面上的史萊姆滿了，先推下去一隻吧');
    return;
  }
  const before = dollQueue.length + dolls.length;
  dropNewDoll();
  if (dollQueue.length + dolls.length === before) {
    toast('現在召喚不出來，等一下再試');
    return;
  }
  summonCd = upValue('summon');
  toast('召喚史萊姆！');
  [660, 880, 1320].forEach((f, k) => setTimeout(() => beep(f, 0.14, 0.05, 'sine', 'item'), k * 90));
}

// ===== 狂熱時間（2026-10-05 納可定）=====
// 推下一枚幣 +1，推下娃娃 普通 +10、稀有 +30、傳說 +50；滿 1000 進入狂熱 20 秒：推板變快、一直下金幣雨。
// 狂熱的時候推下的不算（免得一次接一次停不下來）
const FEVER_MAX = 800;          // 2026-10-05 納可：原本 1000 有點長，改短一點
const FEVER_TIME = 20;
const FEVER_SPEED = 1.6;     // 狂熱時推板快幾倍
const FEVER_RAIN = 6;        // 狂熱時每秒掉幾枚金幣
const FEVER_DOLL = { common: 10, rare: 30, legend: 50 };
const FEVER_BIG = 2;         // 大金幣 +2（納可定）
const FEVER_GEM = 5;         // 小寶物都 +5（納可定）
let feverGauge = 0;
let feverTime = 0;
let feverSpawn = 0;
const feverBanner = document.getElementById('feverBanner');
function addFever(n) {
  if (feverTime > 0) return;
  feverGauge += n;
  if (feverGauge >= FEVER_MAX) startFever();
}
function startFever() {
  feverGauge = 0;
  feverTime = FEVER_TIME;
  feverSpawn = 0;
  stats.fevers++;
  feverBanner.classList.remove('show');
  void feverBanner.offsetWidth;
  feverBanner.classList.add('show');
  document.body.classList.add('fever');
  [523, 659, 784, 1047, 1319, 1568].forEach((f, k) => setTimeout(() => beep(f, 0.16, 0.06, 'square', 'rain'), k * 80));
}
function endFever() {
  document.body.classList.remove('fever');
  toast('狂熱時間結束');
}

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

// 補充金幣（Claude 定）：檯面上少於 25 枚，就下一場 30 枚的雨；下完等 3 秒再看，還不夠就再一場。
// 不算玩家的錢、不算「金幣雨」次數，畫面上只跳一個小提示
const REFILL_MIN = 25;          // 一般玩最少會掉到 40 枚左右，設低一點才不會誤觸發
const REFILL_SIZE = 30;
let refillCheck = 0;
let refills = 0;              // 這次開遊戲補了幾次（測試用）
function startRefill() {
  refills++;
  rainQueue = REFILL_SIZE;
  rainRate = REFILL_SIZE / 2.5;
  rainSpawn = 0;
  toast('檯面上的幣不多了，補充一些');
  [660, 880].forEach((f, k) => setTimeout(() => beep(f, 0.14, 0.05, 'triangle', 'rain'), k * 90));
}

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
// 彩券：純圖案、沒有字（檯面上的東西都不放中文字）。紅底、金邊、兩側半圓缺口、虛線撕線、中間一顆星
function ticketTexture() {
  const W = 256;
  const H = 144;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c8323c';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#f4c95d';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.fillStyle = '#7a1820';
  for (const x of [0, W]) {
    ctx.beginPath();
    ctx.arc(x, H / 2, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255, 236, 190, 0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(W * 0.7, 18);
  ctx.lineTo(W * 0.7, H - 18);
  ctx.stroke();
  ctx.setLineDash([]);
  // 星星
  ctx.fillStyle = '#f4c95d';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 ? 16 : 38;
    const x = W * 0.36 + Math.cos(a) * r;
    const y = H / 2 + Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  // 右邊小格子的三個點
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(W * 0.85, H / 2 + (i - 1) * 26, 7, 0, Math.PI * 2);
    ctx.fill();
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
    const tex = ticketTexture();
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

// 道具做成有厚度的立體圖示：風是一朵雲、長推板是一個粗箭頭、地震是一個爆炸星形
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
function arrowPoints() {
  return [[0, 0.44], [0.4, 0.02], [0.2, 0.02], [0.2, -0.4], [-0.2, -0.4], [-0.2, 0.02], [-0.4, 0.02]];
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
  } else if (kind === 'reach') {
    // 兩個往前的箭頭
    ctx.strokeStyle = it.dark;
    ctx.lineWidth = 22;
    for (const y of [0.12, -0.1]) {
      ctx.beginPath();
      ctx.moveTo(...P(-0.17, y - 0.12));
      ctx.lineTo(...P(0, y + 0.05));
      ctx.lineTo(...P(0.17, y - 0.12));
      ctx.stroke();
    }
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
  const pts = kind === 'wind' ? cloudPoints() : kind === 'reach' ? arrowPoints() : burstPoints();
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
      .setContactSkin(0.01)
      .setCollisionGroups(OTHER_GROUPS),
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

// ===== 小寶物（實體） =====
// 珍珠是真的圓球、摩擦很小，很會滾；寶石用切面的外形算碰撞
function spawnTreasure(kind, pos, rot) {
  if (!TREASURES[kind]) return null;
  const pearl = kind === 'pearl';
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation(rot || { x: 0, y: 0, z: 0, w: 1 })
      .setLinearDamping(pearl ? 0.02 : 0.05)
      .setAngularDamping(pearl ? 0.02 : 0.3)
      .setCcdEnabled(true),
  );
  const shape = pearl ? RAPIER.ColliderDesc.ball(PEARL_R) : RAPIER.ColliderDesc.convexHull(treasureGeo(kind).attributes.position.array);
  world.createCollider(
    shape.setDensity(pearl ? 1.5 : 1.2).setFriction(pearl ? 0.15 : 0.4).setRestitution(pearl ? 0.25 : 0.05)
      .setContactSkin(0.005).setCollisionGroups(OTHER_GROUPS),
    body,
  );
  const mesh = new THREE.Mesh(treasureGeo(kind), treasureMaterial(kind, quality !== 'low'));
  mesh.castShadow = true;
  scene.add(mesh);
  const t = { kind, body, mesh };
  treasures.push(t);
  return t;
}
function removeTreasure(i) {
  world.removeRigidBody(treasures[i].body);
  scene.remove(treasures[i].mesh);
  treasures.splice(i, 1);
}
const maxTreasures = () => MAX_TREASURES + perkLv('gemCap');
// 機台放一個小寶物（照解鎖了哪幾種隨機挑）
function dropTreasure(kind) {
  const open = TREASURE_ORDER.slice(0, perkLv('gems'));
  if (!kind) kind = open[Math.floor(Math.random() * open.length)];
  if (!kind) return;
  const yaw = Math.random() * Math.PI * 2;
  spawnTreasure(kind, { x: (Math.random() - 0.5) * 4, y: 3.2, z: DROP_Z }, { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
  beep(1320, 0.08, 0.04, 'sine', 'item');
  setTimeout(() => beep(1760, 0.1, 0.035, 'sine', 'item'), 70);
}

function removeProp(i) {
  world.removeRigidBody(props[i].body);
  scene.remove(props[i].mesh);
  props.splice(i, 1);
}

// 機台放一個道具或一張彩券到推板上方
function dropProp(type) {
  // 檯面上不會同時有兩個一樣的東西：彩券最多一張、每種道具最多一個
  const kinds = Object.keys(ITEMS).filter((k) => !props.some((p) => p.kind === k));
  if (type === 'ticket' && props.some((p) => p.type === 'ticket')) return;
  if (type !== 'ticket' && !kinds.length) return;
  const kind = type === 'ticket' ? 'ticket' : kinds[Math.floor(Math.random() * kinds.length)];
  const yaw = (Math.random() - 0.5) * 0.8;
  spawnProp(type, kind, { x: (Math.random() - 0.5) * 4, y: 3.2, z: DROP_Z }, { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
  beep(820, 0.1, 0.04, 'triangle', type === 'ticket' ? 'wheel' : 'item');
}

// 道具推下前緣：馬上發動
function triggerItem(kind) {
  stats.itemsUsed++;

  if (kind === 'wind') {
    windTime = 1.2;
    toast('陣風！');
  } else if (kind === 'quake') {
    quakeTime = 1.5;
    toast('地震！');
  } else if (kind === 'reach') {
    reachQueued = true;
    toast('長推板！下一下推得特別長');
  }
  beep(520, 0.2, 0.06, 'triangle', 'item');
  setTimeout(() => beep(780, 0.2, 0.05, 'triangle', 'item'), 120);
}

// 甩一甩（主動技能）
function startShake() {
  if (upValue('shake') <= 0 || shakeCd > 0) return;
  shakeTime = SHAKE_TIME;
  shakeCd = upValue('shake');
  stats.shakes++;
  toast('甩一甩！');
  for (let k = 0; k < 6; k++) setTimeout(() => beep(k % 2 ? 180 : 140, 0.09, 0.07, 'square', 'item'), k * 100);
}
// 每一步：陣風往前推、地震亂抖、長推板倒數、甩一甩
function applyEffects() {
  if (shakeTime > 0) {
    shakeTime -= STEP;
    shakeTick += STEP;
    if (shakeTick >= 0.1) {
      shakeTick = 0;
      shakeDir = -shakeDir;
      // 整台甩：每樣東西往上彈、往前送一點
      const kick = (b, side, up) => {
        if (b.translation().y < -0.5) return;
        const m = b.mass();
        // 兩側沒有牆了，左右只輕輕晃（不然都甩進側溝），主要往上彈、往前送
        b.applyImpulse({ x: shakeDir * m * side * 0.2 * (0.7 + Math.random() * 0.6), y: m * up * (0.6 + Math.random() * 0.8), z: m * side * (0.05 + Math.random() * 0.07) }, true);
      };
      for (const c of coins) kick(c.body, 3, 1.8);
      for (const d of dolls) kick(d.body, 2.5, 1.5);
      for (const pr of props) kick(pr.body, 2.5, 1.5);
      for (const t of treasures) kick(t.body, 3, 1.8);
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
    for (const t of treasures) t.body.applyImpulse({ x: 0, y: 0, z: t.body.mass() * 7 * STEP }, true);
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
const treasureChance = new PseudoRandom(TREASURE_CHANCE);
let wheelAngle = 0;
let wheelSpinning = false;

// 配色收斂（納可：不要那麼花，高級一點）：黑底、金色、一點深紅；數字用金幣上的花體數字
// 2026-10-05 納可：轉起來很假很卡。改法：
// 1. 盤面、外圈只畫一次存起來，轉的時候只把存好的圖轉個角度貼上去（原本每一格、每個數字、每顆燈每一幀重畫，很吃力）。
// 2. 轉法照真的輪盤：先往回拉一下再甩出去，一開始最快每秒大約 2 圈半（太快會像在跳格），然後被摩擦慢慢磨停。
// 3. 指針會被格子邊的釘子撥動、彈回來；轉得快的時候盤面有一點殘影。
const WHEEL_W = 600;
const WHEEL_CX = WHEEL_W / 2;
const WHEEL_CY = WHEEL_W / 2 + 10;
const WHEEL_R = WHEEL_W / 2 - 36; // 格子的半徑
const WHEEL_RIM = 20;             // 外圈的厚度
const WHEEL_EDGES = WHEEL.map((w) => w.mid - w.half); // 每一格的邊（釘子的位置）
let wheelDisk = null;             // 存好的盤面
const wheelRims = {};             // 存好的外圈（燈全亮、單數亮、雙數亮）
let wheelSpeed = 0;               // 現在每秒轉幾弧度（殘影用）
let pointerKick = 0;              // 指針被撥開的角度
function wheelGold(ctx, cx, cy, r1) {
  const g = ctx.createLinearGradient(cx - r1, cy - r1, cx + r1, cy + r1);
  g.addColorStop(0, '#f7e3a1');
  g.addColorStop(0.45, '#d9a842');
  g.addColorStop(1, '#a87522');
  return g;
}
function makeWheelDisk() {
  const R = WHEEL_R;
  const S = Math.ceil(R * 2 + 6);
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const cx = S / 2;
  const cy = S / 2;
  let k = 0;
  for (const w of WHEEL) {
    const a0 = w.mid - w.half - Math.PI / 2;
    const a1 = w.mid + w.half - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    if (w.jackpot) {
      const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
      g.addColorStop(0, '#c9374f');
      g.addColorStop(1, '#7a1426');
      ctx.fillStyle = g;
    } else if (w.big) {
      ctx.fillStyle = wheelGold(ctx, cx, cy, R);
    } else {
      ctx.fillStyle = k++ % 2 ? '#1d1a22' : '#26222c'; // 黑色兩種深淺交錯，看得出分格
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 168, 66, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 數字黏在盤子上跟著轉（納可定），字的上方朝外
    const am = w.mid - Math.PI / 2;
    const tr = w.big ? R * 0.64 : R * 0.73;
    const x = cx + Math.cos(am) * tr;
    const y = cy + Math.sin(am) * tr;
    const rot = am + Math.PI / 2;
    if (w.jackpot) drawDigits(ctx, String(w.coins), x, y, WHEEL_W * 0.085, '#f7e3a1', rot);
    else if (w.big) drawDigits(ctx, String(w.coins), x, y, WHEEL_W * 0.08, '#3a2608', rot);
    else drawDigits(ctx, String(w.coins), x, y, WHEEL_W * 0.05, '#d9a842', rot);
  }
  // 格子邊上的小金釘（撥指針的就是它）
  for (const e of WHEEL_EDGES) {
    const a = e - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (R - 7), cy + Math.sin(a) * (R - 7), 4, 0, Math.PI * 2);
    ctx.fillStyle = wheelGold(ctx, cx, cy, R);
    ctx.fill();
  }
  return c;
}
// 外圈：黑色加金邊，一圈小燈（暖白，轉的時候一閃一閃）
function makeWheelRim(blink) {
  const c = document.createElement('canvas');
  c.width = c.height = WHEEL_W;
  const ctx = c.getContext('2d');
  const cx = WHEEL_CX;
  const cy = WHEEL_CY;
  const R = WHEEL_R;
  const rim = WHEEL_RIM;
  ctx.beginPath();
  ctx.arc(cx, cy, R + rim, 0, Math.PI * 2);
  ctx.fillStyle = '#141218';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = wheelGold(ctx, cx, cy, R + rim);
  ctx.stroke();
  const bulbs = 24;
  for (let i = 0; i < bulbs; i++) {
    const a = (i / bulbs) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (R + rim / 2), cy + Math.sin(a) * (R + rim / 2), 4, 0, Math.PI * 2);
    const on = blink < 0 || i % 2 === blink;
    ctx.fillStyle = on ? '#f6dc9a' : '#5a4a2a';
    ctx.shadowColor = on ? 'rgba(246, 220, 154, 0.8)' : 'transparent';
    ctx.shadowBlur = on ? 8 : 0;
    ctx.fill();
  }
  return c;
}
function drawWheel(now = performance.now()) {
  const ctx = wheelCanvas.getContext('2d');
  const W = WHEEL_W;
  const cx = WHEEL_CX;
  const cy = WHEEL_CY;
  const R = WHEEL_R;
  const rim = WHEEL_RIM;
  if (!wheelDisk) wheelDisk = makeWheelDisk();
  const blink = wheelSpinning ? Math.floor(now / 120) % 2 : -1;
  ctx.clearRect(0, 0, W, W);
  ctx.drawImage(wheelRims[blink] ||= makeWheelRim(blink), 0, 0);
  // 盤面：轉個角度貼上去；轉得快的時候往後疊兩層淡淡的殘影
  const half = wheelDisk.width / 2;
  const drawDisk = (a, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.drawImage(wheelDisk, -half, -half);
    ctx.restore();
  };
  drawDisk(wheelAngle, 1);
  const smear = Math.min(0.2, wheelSpeed / 60);
  if (smear > 0.02) {
    drawDisk(wheelAngle - smear, 0.35);
    drawDisk(wheelAngle - smear * 2, 0.18);
  }
  // 中間的圓心：金色細圈加黑底
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#141218';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = wheelGold(ctx, cx, cy, R * 0.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = wheelGold(ctx, cx, cy, R * 0.06);
  ctx.fill();
  // 上方的指針：金色，尖端指進格子裡；被釘子撥到會往旁邊歪一下再彈回來
  const top = cy - R - rim - 6;
  ctx.save();
  ctx.translate(cx, top);
  ctx.rotate(pointerKick);
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.lineTo(0, rim + 30);
  ctx.closePath();
  ctx.fillStyle = wheelGold(ctx, 0, rim, rim + 30);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#141218';
  ctx.stroke();
  ctx.restore();
}

function renderWheelInfo() {
  const freeBtn = document.getElementById('freeSpinBtn');
  freeBtn.textContent = '免費抽一次';
  freeBtn.disabled = freeSpins <= 0 || wheelSpinning;
  freeBtn.hidden = freeSpins <= 0;
  const payBtn = document.getElementById('paySpinBtn');
  payBtn.textContent = '花錢抽一次';
  payBtn.disabled = wallet < WHEEL_PRICE || wheelSpinning;
  document.getElementById('wheelCost').textContent = `${freeSpins > 0 ? `免費還有 ${freeSpins} 次　・　` : ''}花錢抽一次 ${WHEEL_PRICE} 枚`;
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
  updateLotteryBadge();
  wheelSpinning = true;
  renderWheelInfo();
  const idx = pickWheel();
  // 指針在上方：讓第 idx 格轉到上方（停在格子裡隨機一點，不貼邊），多轉幾圈
  const w = WHEEL[idx];
  const target = -(w.mid + (Math.random() - 0.5) * 2 * w.half * 0.6);
  const start = wheelAngle;
  const base = start - (start % (Math.PI * 2));
  // 每次轉的圈數、力道、減速方式都不太一樣，才有隨機的感覺（納可定）
  // 甩出去的速度 12 到 16（每秒弧度，大約 2 到 2 圈半），power 越大越早慢下來、尾巴磨得越久
  const turns = 3 + Math.floor(Math.random() * 3);
  const end = base + Math.PI * 2 * turns + target;
  const dist = end - start;
  const power = 2.2 + Math.random() * 1.2;
  const v0 = 12 + Math.random() * 4;
  const dur = Math.min(5500, Math.max(3200, (power * dist) / v0 * 1000)); // 起始速度 = power × 距離 ÷ 時間；整趟 3.2 到 5.5 秒
  const pull = 0.12 + Math.random() * 0.08; // 先往回拉一下
  const pullT = 220;
  const t0 = performance.now();
  let lastT = t0;
  let prev = start;
  const anim = (now) => {
    const t = now - t0;
    let done = false;
    if (t < pullT) {
      const k = t / pullT;
      wheelAngle = start - pull * Math.sin(k * Math.PI / 2);
    } else {
      // 從拉回的位置甩出去：一開始最快，摩擦讓它越來越慢
      const k = Math.min(1, (t - pullT) / dur);
      const e = 1 - Math.pow(1 - k, power);
      wheelAngle = start - pull + (end - start + pull) * e;
      done = k >= 1;
    }
    const dt = Math.max(1, now - lastT) / 1000;
    lastT = now;
    wheelSpeed = Math.abs(wheelAngle - prev) / dt;
    // 經過一根釘子：指針被撥一下、喀一聲
    let hits = 0;
    for (const b of WHEEL_EDGES) hits += Math.floor((wheelAngle + b) / (Math.PI * 2)) - Math.floor((prev + b) / (Math.PI * 2));
    if (hits > 0) {
      pointerKick = -Math.min(0.32, 0.1 + wheelSpeed * 0.015);
      beep(1400, 0.03, 0.03, 'square', 'wheel');
    }
    prev = wheelAngle;
    pointerKick *= Math.pow(0.0008, dt); // 很快彈回來
    if (done) { wheelSpeed = 0; pointerKick = 0; }
    drawWheel(now);
    if (!done) requestAnimationFrame(anim);
    else finishSpin(idx);
  };
  requestAnimationFrame(anim);
}

function finishSpin(idx) {
  wheelSpinning = false;
  const w = WHEEL[idx];
  earn(w.coins);
  bump(walletEl);
  document.getElementById('wheelResult').innerHTML = hangHtml(w.jackpot ? `大獎！+${w.coins} 枚` : w.big ? `中了！+${w.coins} 枚` : `+${w.coins} 枚`);
  const notes = w.jackpot ? [880, 1100, 1320, 1760, 2200, 2640] : w.big ? [990, 1320, 1760] : [990, 1320];
  drawWheel();
  notes.forEach((f, k) => setTimeout(() => beep(f, 0.18, 0.06, 'triangle', 'wheel'), k * 90));
  renderWheelInfo();
  saveGame();
}

document.getElementById('freeSpinBtn').addEventListener('click', () => spinWheel(true));
document.getElementById('paySpinBtn').addEventListener('click', () => spinWheel(false));
document.getElementById('wheelClose').addEventListener('click', () => wheelEl.classList.remove('show'));
document.getElementById('lotteryBtn').addEventListener('click', openWheel);
// 「彩券」按鈕上顯示還有幾次免費抽獎
function updateLotteryBadge() {
  const b = document.getElementById('lotteryBtn');
  b.innerHTML = freeSpins > 0 ? `彩券<span class="badge">${freeSpins}</span>` : '彩券';
}

// ===== 商店 =====
const shopEl = document.getElementById('shop');
const shopListEl = document.getElementById('shopList');
const shopWalletEl = document.getElementById('shopWallet');

// 上一項買過一次，下一項才會出現
// 買過上一項才會出現；自己已經有等級的也照樣顯示（換過順序的舊存檔不會被藏起來）
function shopVisible(i) {
  return i === 0 || upgrades[UPGRADE_KEYS[i - 1]] >= 1 || upgrades[UPGRADE_KEYS[i]] >= 1;
}

function canAffordSomething() {
  return UPGRADE_KEYS.some((key, i) => {
    const lv = upgrades[key];
    return shopVisible(i) && lv < UPGRADES[key].prices.length && wallet >= upPrice(key);
  });
}

let shopTab = 'up';
const shopTitleEl = document.querySelector('#shop .shopTitle');
let rebirthArmed = 0;        // 輪迴按鈕按第一次只是確認，3 秒內再按一次才真的輪迴
function renderShop() {
  shopWalletEl.textContent = wallet;
  shopTitleEl.textContent = rebirth.shopping ? '輪迴' : '商店';
  if (rebirth.shopping) { shopListEl.innerHTML = rebirthShopHtml(); return; }
  let html = '<div class="bookTabs">'
    + `<button type="button" class="bookTab${shopTab === 'up' ? ' on' : ''}" data-shoptab="up">升級</button>`
    + `<button type="button" class="bookTab${shopTab === 'rebirth' ? ' on' : ''}" data-shoptab="rebirth">輪迴${rebirthPending() ? `（+${rebirthPending()}）` : ''}</button></div>`;
  if (shopTab === 'rebirth') {
    shopListEl.innerHTML = html + rebirthHtml();
    return;
  }
  // 不分類（納可定）；滿級的收進最下面的「已滿級」，預設收起來。
  // 「一鍵買到最高」打勾時，按升級會一次買到手上的錢買得起的最高級
  html += `<label class="buyMax"><input type="checkbox" id="buyMaxChk"${buyMaxOn ? ' checked' : ''}> 一鍵買到能買的最高</label>`;
  let maxed = '';
  let maxedN = 0;
  UPGRADE_KEYS.forEach((key, i) => {
    if (!shopVisible(i)) return;
    const u = UPGRADES[key];
    const lv = upgrades[key];
    const max = u.prices.length;
    if (lv >= max) {
      maxedN++;
      maxed += buyRowHtml({ name: u.name, lv: `Lv ${lv}（滿級）`, desc: u.desc, btn: '<button type="button" disabled>滿級</button>' });
      return;
    }
    const price = upPrice(key);
    const plan = buyMaxOn ? maxBuyPlan(key) : null;
    const priceText = plan && plan.levels > 1 ? `${price} 枚（買到 Lv ${lv + plan.levels}，共 ${plan.cost} 枚）` : `${price} 枚`;
    html += buyRowHtml({
      name: u.name, lv: `Lv ${lv} / ${max}`, desc: u.desc,
      price: priceText, canPay: wallet >= price,
      btn: `<button type="button" data-buy="${key}" ${wallet < price ? 'disabled' : ''}>升級</button>`,
    });
  });
  if (maxedN) html += groupHtml('shop.maxed', '已滿級', `${maxedN} 項`, maxed);
  const next = UPGRADE_KEYS.findIndex((_, i) => !shopVisible(i));
  if (next > 0) html += '<div class="item locked"><div class="info"><div class="desc">買下上面最後一項，就會出現新的升級</div></div></div>';
  shopListEl.innerHTML = html;
}

// 現在輪迴可以拿到幾點
function rebirthPending() {
  let n = 0;
  while (rebirthNeed(n + 1) <= won) n++;
  return n;
}
function rebirthHtml() {
  if (rebirth.shopping) return rebirthShopHtml();
  const n = rebirthPending();
  const need = rebirthNeed(n + 1);
  let html = `<div class="rebirthBox">
    <div>這一輪累計賺了 <b>${Math.floor(won)}</b> 枚</div>
    <div>現在輪迴可以拿到 <b>${n}</b> 點輪迴點（再賺 ${need - Math.floor(won)} 枚多 1 點）</div>
    <div class="bookNote">輪迴會清空：手上的錢、商店升級、檯面上的東西。<br>會保留：圖鑑、成就、裝飾品、輪迴點和輪迴點買的東西。<br>輪迴點要在輪迴的時候才能用。</div>
    <button type="button" id="rebirthGo" ${n ? '' : 'disabled'}>${rebirthArmed ? `確定？再按一次就輪迴（+${n} 點）` : n ? `輪迴（+${n} 點）` : `累計賺到 ${rebirthNeed(1)} 枚才能輪迴`}</button>
  </div>
  <div class="rebirthHead">輪迴點：<b>${rebirth.points}</b> 點${rebirth.count ? `　已經輪迴 ${rebirth.count} 次` : ''}</div>`;
  // 平常只看得到現在的等級和效果，不能買
  let inner = '';
  for (const k of PERK_KEYS) {
    const p = PERKS[k];
    const lv = perkLv(k);
    const max = p.costs.length;
    inner += buyRowHtml({
      name: p.name, lv: lv >= max ? `Lv ${lv}（滿級）` : `Lv ${lv} / ${max}`,
      desc: lv ? `現在：${p.eff(lv)}` : `還沒買。Lv 1：${p.eff(1)}`,
      btn: '',
    });
  }
  html += groupHtml('rebirth.perks', '輪迴點商店（輪迴時才能買）', `${PERK_KEYS.length} 項`, inner);
  return html;
}
// 輪迴中的商店：只剩這個面板，買完按「重生」
const REBIRTH_LINES = ['改機被老闆發現了，快溜！', '玩太多被媽媽發現了，塊陶啊！'];
let rebirthLine = REBIRTH_LINES[0];
function rebirthShopHtml() {
  let html = `<div class="rebirthBox">
    <div class="rebirthLine">${rebirthLine}</div>
    <div>這次拿到 <b>${rebirth.gained}</b> 點輪迴點，手上共 <b>${rebirth.points}</b> 點</div>
    <div class="bookNote">想買什麼就買，不買也可以。按「重生」就重新開始。</div>
  </div>`;
  let inner = '';
  for (const k of PERK_KEYS) {
    const p = PERKS[k];
    const lv = perkLv(k);
    const max = p.costs.length;
    const cost = p.costs[lv];
    inner += buyRowHtml({
      name: p.name, lv: lv >= max ? `Lv ${lv}（滿級）` : `Lv ${lv} / ${max}`,
      desc: lv >= max ? `已滿級：${p.eff(lv)}` : `升級後：${p.eff(lv + 1)}`,
      price: lv < max ? `${cost} 點` : '', canPay: rebirth.points >= cost,
      btn: lv >= max ? '<button type="button" disabled>滿級</button>'
        : `<button type="button" data-perk="${k}" ${rebirth.points < cost ? 'disabled' : ''}>升級</button>`,
    });
  }
  html += `<div class="perkList">${inner}</div>`;
  html += '<button type="button" id="rebornGo">重生</button>';
  return html;
}
// 按兩次輪迴：拿到點數，機台收起來，只剩輪迴點商店
function enterRebirthShop() {
  const n = rebirthPending();
  if (!n || rebirth.shopping) return;
  rebirth.points += n;
  rebirth.count++;
  rebirth.gained = n;
  rebirth.shopping = true;
  won = 0; // 點數已經拿了，避免重新整理後又算一次
  rebirthLine = REBIRTH_LINES[Math.floor(Math.random() * REBIRTH_LINES.length)];
  setAuto(false);
  pointerDown = false;
  showRebirthShop();
  saveGame();
}
function showRebirthShop() {
  for (const id of ['ach', 'book', 'settings', 'wheel', 'viewer']) document.getElementById(id).classList.remove('show');
  document.body.classList.add('rebirthing');
  shopTab = 'rebirth';
  rebirthArmed = 0;
  renderShop();
  shopEl.classList.add('show');
  shopListEl.scrollTop = 0;
  shopEl.scrollTop = 0;
}
function buyPerk(k) {
  if (!rebirth.shopping) return;
  const lv = perkLv(k);
  const cost = PERKS[k].costs[lv];
  if (cost === undefined || rebirth.points < cost) return;
  rebirth.points -= cost;
  rebirth.perks[k]++;
  beep(660, 0.08, 0.06, 'triangle', 'shop');
  setTimeout(() => beep(1320, 0.12, 0.06, 'triangle', 'shop'), 80);
  renderShop();
  saveGame();
}
// 重新開始：清空檯面、錢、升級。還沒進輪迴點商店就先拿點數（測試會直接叫這個）
function doRebirth() {
  if (!rebirth.shopping) {
    const n = rebirthPending();
    if (!n) return;
    rebirth.points += n;
    rebirth.count++;
    rebirth.gained = n;
  }
  const n = rebirth.gained;
  rebirth.shopping = false;
  // 清空檯面、錢、升級，照開新遊戲的樣子重新鋪幣
  while (coins.length) removeCoin(coins.length - 1);
  while (dolls.length) removeDoll(dolls.length - 1);
  dollQueue.length = 0;
  while (props.length) removeProp(props.length - 1);
  while (treasures.length) removeTreasure(treasures.length - 1);
  for (const k of UPGRADE_KEYS) upgrades[k] = 0;
  for (const k of ['refill', 'dropRate', 'speed']) upgrades[k] = Math.min(perkLv('headStart'), UPGRADES[k].prices.length);
  wallet = START_WALLET + PERK_MONEY[perkLv('startMoney')];
  won = 0;
  lost = 0;
  earnCarry = 0;
  rainQueue = 0;
  refillTimer = 0;
  windTime = quakeTime = reachExtra = 0;
  reachQueued = false;
  shakeTime = shakeCd = 0;
  rainCd = 0;
  summonCd = 0;
  feverGauge = 0;
  if (feverTime > 0) { feverTime = 0; endFever(); }
  prefill();
  buildGuards();
  setAuto(false);
  rebirthArmed = 0;
  shopTab = 'up';
  document.body.classList.remove('rebirthing');
  shopEl.classList.remove('show');
  renderShop();
  saveGame();
  return n;
}

// 轉生動畫（納可定）：蓋上一層「轉生中……」，天使史萊姆跳幾下、轉一圈；
// 蓋滿的時候偷偷換好新檯面，動畫結束再淡出，看到的就是輪迴後的新檯面
const rebornEl = document.getElementById('reborn');
let rebornView = null;
let rebornBusy = false;
const REBORN_TIME = 4.2;     // 整段動畫幾秒
function rebirthWithAnim() {
  if (rebornBusy || (!rebirth.shopping && !rebirthPending())) return;
  rebornBusy = true;
  shopEl.classList.remove('show');
  setAuto(false);
  pointerDown = false;
  if (!rebornView) {
    rebornView = makeMiniView(document.getElementById('rebornCanvas'), false);
    rebornView.cam.position.set(0, 1.3, 3.9);
    rebornView.cam.lookAt(0, 0.62, 0);
  }
  if (rebornView.mesh) rebornView.sc.remove(rebornView.mesh);
  rebornView.mesh = makeSlimeMesh(SPARE_SKINS.angel, 1, quality !== 'low');
  rebornView.sc.add(rebornView.mesh);
  rebornEl.classList.remove('out');
  rebornEl.classList.add('show');
  [523, 659, 784, 1047, 1319].forEach((f, k) => setTimeout(() => beep(f, 0.22, 0.06, 'triangle', 'shop'), 300 + k * 140));
  let got = 0;
  let swapped = false;
  const t0 = performance.now();
  const loop = (now) => {
    const t = window.__rebornT ?? (now - t0) / 1000; // __rebornT：測試用，讓動畫停在某一秒拍照
    // 蓋滿了（淡入 0.5 秒）才換檯面
    if (!swapped && t > 0.6) { swapped = true; got = doRebirth(); }
    animateAngel(rebornView.mesh, t);
    miniRender(rebornView, rebornView.mesh.rotation.y, now);
    if (t < REBORN_TIME) { requestAnimationFrame(loop); return; }
    rebornEl.classList.add('out');
    setTimeout(() => { rebornEl.classList.remove('show', 'out'); rebornBusy = false; }, 600);
    bump(walletEl);
    toast(`轉生完成！拿到 ${got} 點輪迴點`);
    [784, 1047, 1319].forEach((f, k) => setTimeout(() => beep(f, 0.18, 0.06, 'triangle', 'shop'), k * 90));
  };
  requestAnimationFrame(loop);
}
// 天使：前 2.4 秒跳三下（落地時壓扁一點），之後往上飄、轉一整圈，再落回來
function animateAngel(m, t) {
  let y = 0;
  let sq = 1;
  let yaw = 0;
  if (t < 2.4) {
    const k = (t % 0.8) / 0.8;               // 每一下 0.8 秒
    y = Math.sin(k * Math.PI) * 0.38;
    const land = Math.max(0, 1 - Math.min(k, 1 - k) / 0.12); // 剛落地、剛起跳的那一下壓扁
    sq = 1 - land * 0.18;
    yaw = Math.sin(t * 2.4) * 0.35;          // 跳的時候左右晃一點
  } else {
    const k = Math.min(1, (t - 2.4) / 1.5);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    y = Math.sin(k * Math.PI) * 0.3;
    yaw = e * Math.PI * 2;
  }
  m.position.y = y;
  m.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
  m.rotation.y = yaw;
}

// 一鍵買到最高：手上的錢從現在這一級一路買上去，最多買到幾級、共要多少
let buyMaxOn = false;
function maxBuyPlan(key) {
  const u = UPGRADES[key];
  let lv = upgrades[key];
  let cost = 0;
  let levels = 0;
  while (lv < u.prices.length && cost + upPrice(key, lv) <= wallet) {
    cost += upPrice(key, lv);
    lv++;
    levels++;
  }
  return { levels, cost };
}
function buyUpgrade(key) {
  if (!buyMaxOn) { buy(key); return; }
  const n = maxBuyPlan(key).levels;
  for (let k = 0; k < n; k++) buy(key, k < n - 1);
}

function buy(key, quiet = false) {
  const i = UPGRADE_KEYS.indexOf(key);
  if (i < 0 || !shopVisible(i)) return;
  const u = UPGRADES[key];
  const lv = upgrades[key];
  if (lv >= u.prices.length || wallet < upPrice(key)) return;
  wallet -= upPrice(key);
  upgrades[key]++;
  stats.upgradesBought++;
  checkAchievements();
  if (key === 'guard') buildGuards();
  if (quiet) return; // 一次買好幾級：最後一級才響、才重畫、才存
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
shopListEl.addEventListener('change', (e) => {
  if (e.target.id !== 'buyMaxChk') return;
  buyMaxOn = e.target.checked;
  renderShop();
  saveGame();
});
shopListEl.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-buy]');
  if (b) buyUpgrade(b.dataset.buy);
  const t = e.target.closest('button[data-shoptab]');
  if (t) { shopTab = t.dataset.shoptab; rebirthArmed = 0; renderShop(); }
  const pk = e.target.closest('button[data-perk]');
  if (pk) buyPerk(pk.dataset.perk);
  if (e.target.closest('#rebornGo')) { rebirthWithAnim(); return; }
  if (e.target.closest('#rebirthGo')) {
    if (rebirthArmed) { clearTimeout(rebirthArmed); rebirthArmed = 0; enterRebirthShop(); return; }
    rebirthArmed = setTimeout(() => { rebirthArmed = 0; if (shopTab === 'rebirth') renderShop(); }, 3000);
    renderShop();
  }
});

// ===== 存檔 =====
// 存在這台裝置的瀏覽器裡；可以匯出成檔案備份、再匯入
const SAVE_KEY = 'pretty_drop_save';
let resetting = false;       // 按了重新開始就不要再存

function saveData() {
  return {
    version: 1,
    gemSet: true,
    // 設定也跟著存（納可：重新載入、讀檔都要回來）：自動投幣、瞄準位置、畫質、音效
    settings: { auto: autoDrop, aimX, quality, sound: { ...soundOn }, buyMax: buyMaxOn },
    wallet,
    upgrades: { ...upgrades },
    pusherPhase,
    shakeCd: Math.ceil(shakeCd),
    rainCd: Math.ceil(rainCd),
    summonCd: Math.ceil(summonCd),
    feverGauge,
    bigCount: bigChance.count,
    dollCount: dollChance.count,
    jackpotCount: jackpotChance.count,
    freeSpins,
    itemCount: itemChance.count,
    ticketCount: ticketChance.count,
    treasureCount: treasureChance.count,
    treasures: treasures.map((t) => {
      const p = t.body.translation();
      const r = t.body.rotation();
      return { k: t.kind, p: [p.x, p.y, p.z], r: [r.x, r.y, r.z, r.w] };
    }),
    props: props.map((pr) => {
      const t = pr.body.translation();
      const r = pr.body.rotation();
      return { type: pr.type, kind: pr.kind, p: [t.x, t.y, t.z], r: [r.x, r.y, r.z, r.w] };
    }),
    dollBag: [...dollBag],
    lastDollSet,
    collection: { ...collection },
    activeSets,
    unlockedSets: [...unlockedSets],
    stats: { ...stats },
    tutor: [...tutorSeen],
    achieved: { ...achieved },
    achPoints,
    rebirth: { points: rebirth.points, count: rebirth.count, shopping: rebirth.shopping, gained: rebirth.gained, perks: { ...rebirth.perks } },
    ownedDecor: { ...ownedDecor },
    equipped: { ...equipped },
    shelf: [...shelf],
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
  if (d.settings) {
    if (d.settings.auto) setAuto(true);
    buyMaxOn = !!d.settings.buyMax;
    if (Number.isFinite(d.settings.aimX)) aimX = Math.max(-3, Math.min(3, d.settings.aimX));
  }
  rebirth.points = Math.max(0, Math.floor(Number(d.rebirth?.points) || 0));
  rebirth.count = Math.max(0, Math.floor(Number(d.rebirth?.count) || 0));
  rebirth.shopping = !!d.rebirth?.shopping;
  rebirth.gained = Math.max(0, Math.floor(Number(d.rebirth?.gained) || 0));
  for (const k of PERK_KEYS) rebirth.perks[k] = Math.min(PERKS[k].costs.length, Math.max(0, Math.floor(Number(d.rebirth?.perks?.[k]) || 0)));
  wallet = Math.max(0, Math.floor(Number(d.wallet) || 0));
  for (const key of Object.keys(upgrades)) {
    const lv = Math.floor(Number(d.upgrades?.[key]) || 0);
    upgrades[key] = Math.min(UPGRADES[key].prices.length, Math.max(0, lv));
  }
  pusherPhase = Number(d.pusherPhase) || 0;
  shakeCd = Math.min(UPGRADES.shake.levels[1], Math.max(0, Number(d.shakeCd) || 0));
  rainCd = Math.min(UPGRADES.rain.levels[1], Math.max(0, Number(d.rainCd) || 0));
  summonCd = Math.min(UPGRADES.summon.levels[1], Math.max(0, Number(d.summonCd) || 0));
  feverGauge = Math.min(FEVER_MAX - 1, Math.max(0, Math.floor(Number(d.feverGauge) || 0)));
  bigChance.count = Math.max(0, Math.floor(Number(d.bigCount) || 0));
  dollChance.count = Math.max(0, Math.floor(Number(d.dollCount) || 0));
  jackpotChance.count = Math.max(0, Math.floor(Number(d.jackpotCount) || 0));
  // 舊版的轉盤券換成免費抽獎次數
  freeSpins = Math.max(0, Math.floor(Number(d.freeSpins ?? d.tickets) || 0));
  itemChance.count = Math.max(0, Math.floor(Number(d.itemCount) || 0));
  ticketChance.count = Math.max(0, Math.floor(Number(d.ticketCount) || 0));
  treasureChance.count = Math.max(0, Math.floor(Number(d.treasureCount) || 0));
  for (const t of (d.treasures || []).slice(0, 6)) {
    if (!Array.isArray(t.p) || !Array.isArray(t.r)) continue;
    spawnTreasure(t.k, { x: t.p[0], y: t.p[1], z: t.p[2] }, { x: t.r[0], y: t.r[1], z: t.r[2], w: t.r[3] });
  }
  for (const pr of (d.props || []).slice(0, MAX_PROPS)) {
    if (!Array.isArray(pr.p) || !Array.isArray(pr.r)) continue;
    if (pr.type === 'ticket' || ITEMS[pr.kind]) {
      spawnProp(pr.type === 'ticket' ? 'ticket' : 'item', pr.kind, { x: pr.p[0], y: pr.p[1], z: pr.p[2] }, { x: pr.r[0], y: pr.r[1], z: pr.r[2], w: pr.r[3] });
    }
  }
  if (Array.isArray(d.dollBag)) dollBag = d.dollBag.filter((x) => slimeInfo(x));
  if (SET_BY_ID[d.lastDollSet]) lastDollSet = d.lastDollSet;
  // 舊版（0.0.18）的娃娃名字對不上新的套，就不載入
  // v0.0.70 鑽石從果凍搬到寶石組：舊存檔的 jelly.9 是鑽石，搬到 gem.9（果凍第 10 隻換成彩虹果凍）
  const oldCol = { ...(d.collection || {}) };
  if (!d.gemSet && oldCol['jelly.9']) {
    oldCol['gem.9'] = (Number(oldCol['gem.9']) || 0) + (Number(oldCol['jelly.9']) || 0);
    delete oldCol['jelly.9'];
  }
  for (const [k, n] of Object.entries(oldCol)) {
    if (slimeInfo(k)) collection[k] = Math.max(0, Math.floor(Number(n) || 0));
  }
  if (Array.isArray(d.unlockedSets)) {
    for (const id of d.unlockedSets) if (SET_BY_ID[id]) unlockedSets.add(id);
  } else {
    // v0.0.70 以前的存檔：照當時的解鎖順序（果凍 → 甜點 → 金屬 → 動物 → 寶石）算出已經解鎖的組
    const old = [['sweets', 'jelly'], ['metal', 'sweets'], ['animal', 'metal'], ['gem', 'animal']];
    for (const [id, need] of old) if (unlockedSets.has(need) && kindsIn(need) >= 6) unlockedSets.add(id);
  }
  const sets = (Array.isArray(d.activeSets) ? d.activeSets : [d.activeSet]).filter((id) => SET_BY_ID[id] && setUnlocked(SET_BY_ID[id]));
  if (sets.length) activeSets = [...new Set(sets)];
  for (const k of Object.keys(stats)) stats[k] = Math.max(0, Number(d.stats?.[k]) || 0);
  // 新手提示看過哪些；更新前就在玩的存檔（沒有這一項、已經投過幣）當作全部看過
  if (Array.isArray(d.tutor)) for (const id of d.tutor) tutorSeen.add(id);
  else if (stats.coinsDropped > 0) for (const t of TUTOR) tutorSeen.add(t.id);
  for (const a of ACHIEVEMENTS) if (d.achieved?.[a.id]) achieved[a.id] = true;
  achPoints = Math.max(0, Math.floor(Number(d.achPoints) || 0));
  for (const x of DECORATIONS) if (d.ownedDecor?.[x.id]) ownedDecor[x.id] = true;
  // 拿掉的裝飾品（2026-10-05 機台主題）：買過的把點數退回來（只退一次，因為存檔不會再記著它）
  for (const [id, pts] of Object.entries(REMOVED_DECOR)) if (d.ownedDecor?.[id]) achPoints += pts;
  for (const [slot, id] of Object.entries(d.equipped || {})) {
    if (DECORATION_SLOTS[slot] && ownedDecor[id]) equipDecor(id);
  }
  shelf.length = 0;
  if (Array.isArray(d.shelf)) d.shelf.slice(0, SHELF_MAX).forEach((id, k) => { shelf[k] = slimeInfo(id) && collection[id] ? id : null; });
  buildShelf();
  for (const dd of (d.dolls || []).slice(0, maxDolls())) {
    if (!Array.isArray(dd.p) || !Array.isArray(dd.r)) continue;
    spawnDoll(!d.gemSet && dd.id === 'jelly.9' ? 'gem.9' : dd.id, Number(dd.s) || 1, { x: dd.p[0], y: dd.p[1], z: dd.p[2] }, { x: dd.r[0], y: dd.r[1], z: dd.r[2], w: dd.r[3] });
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
  a.download = 'PrettyDrop存檔.json';
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
    resetting = true; // 重新整理前不要再存，不然會把剛匯入的存檔蓋掉
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    // 存檔裡的畫質、音效也一起帶過來（自動投幣、瞄準位置讀檔時會從存檔拿）
    if (d.settings?.quality) localStorage.setItem(QUALITY_KEY, d.settings.quality);
    if (d.settings?.sound) localStorage.setItem(SOUND_KEY, JSON.stringify(d.settings.sound));
    location.reload();
  } catch (e) {
    alert('這個檔案讀不出來，可能不是 Pretty Drop! 的存檔。');
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
// 長推板推很長的時候，推板尾巴會離開擋牆，東西可能掉到推板後面的地上，被推回牆後卡死。
// 掉到牆後面地上的東西，放回推板前面（推板上面的東西比較高，不會被誤抓）
function rescueBehind(body) {
  const t = body.translation();
  if (t.z > WALL_Z - 0.2 || t.y > 0.45 || t.y < -0.5) return;
  const front = pusher.body.translation().z + PUSHER_DEPTH / 2;
  body.setTranslation({ x: t.x, y: 1.2, z: front + 0.6 }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

function stepSim() {
  simTime += STEP;
  movePusher();
  if (dollQueue.length) placeQueuedDolls();
  applyEffects();
  world.step();
  if (reachExtra > 0 || simTime % 1 < STEP) {
    for (const c of coins) rescueBehind(c.body);
    for (const d of dolls) rescueBehind(d.body);
    for (const pr of props) rescueBehind(pr.body);
    for (const t of treasures) rescueBehind(t.body);
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    const b = coins[i].body.translation();
    const value = coins[i].value;
    if (b.y < -1.2) {
      if (b.z > FRONT_Z - 0.5 && Math.abs(b.x) < halfW + 0.1) {
        const got = earn(value);
        stats.coinsWon += got;
        addFever(value > 1 ? FEVER_BIG : 1);
        if (value > 1) stats.bigWon++;
        floatText(`+${got}`, new THREE.Vector3(b.x, 0, FRONT_Z), value > 1 ? 'big' : '');
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
  for (let i = treasures.length - 1; i >= 0; i--) {
    const t = treasures[i].body.translation();
    if (t.y >= -1.2) continue;
    const tr = treasures[i];
    const info = TREASURES[tr.kind];
    removeTreasure(i);
    if (t.z > FRONT_Z - 0.6 && Math.abs(t.x) < halfW + 0.2) {
      const got = earn(info.value);
      stats.treasures++;
      addFever(FEVER_GEM);
      bump(walletEl);
      floatText(`+${got}`, new THREE.Vector3(t.x, 0, FRONT_Z), `gem gem-${tr.kind}`);
      [1568, 2093].forEach((f, k) => setTimeout(() => beep(f, 0.14, 0.05, 'sine', 'win'), k * 70));
    } else {
      toast(`${info.name}掉進側溝了……`);
    }
  }
  for (let i = props.length - 1; i >= 0; i--) {
    const t = props[i].body.translation();
    if (t.y >= -1.2) continue;
    const pr = props[i];
    const front = t.z > FRONT_Z - 0.6 && Math.abs(t.x) < halfW + 0.2;
    removeProp(i);
    if (pr.type === 'ticket') {
      if (front) {
        freeSpins++;
        // 不跳出來打斷遊戲：累積在「彩券」按鈕上，想抽再按
        toast('推下彩券！免費抽獎 +1');
        updateLotteryBadge();
        if (wheelEl.classList.contains('show')) renderWheelInfo();
      } else {
        toast('彩券掉進側溝了……');
      }
    } else if (front) {
      triggerItem(pr.kind);
    } else {
      toast(`「${ITEMS[pr.kind].name}」掉進側溝了……`); // 道具名字加引號（2026-10-05 納可定）
    }
  }
  for (let i = dolls.length - 1; i >= 0; i--) {
    const t = dolls[i].body.translation();
    if (t.y >= -1.2) continue;
    const d = dolls[i];
    const info = slimeInfo(d.id);
    if (t.z > FRONT_Z - 0.6 && Math.abs(t.x) < halfW + 0.2) {
      const r = RARITY[info.rarity];
      addFever(FEVER_DOLL[info.rarity] || 10);
      const isNew = !collection[d.id];
      const lockedBefore = SLIME_SETS.filter((st) => !setUnlocked(st)).map((st) => st.id);
      collection[d.id] = (collection[d.id] || 0) + 1;
      stats.dollsCollected++;
      const got = earn(info.value);
      bump(walletEl);
      floatText(`+${got}`, new THREE.Vector3(t.x, 0, FRONT_Z));
      let msg = `<span style="color:${r.color}">${r.name}</span>　${info.skin.name}${isNew ? '　<span class="newTag">新！</span>' : ''}　+${info.value} 枚`;
      const opened = lockedBefore.filter((sid) => setUnlocked(SET_BY_ID[sid]));
      if (opened.length) msg += `<br>解鎖新的一套：「${SET_BY_ID[opened[0]].name}」，可以在圖鑑換`;
      celebrate(d.id, isNew, opened.length ? SET_BY_ID[opened[0]].name : null);
      if (bookEl.classList.contains('show')) renderBook();
      saveGame();
    } else {
      // 圖鑑裡還沒收集過的，不說出名字（納可定）
      toast(collection[d.id] ? `${info.skin.name}掉進側溝了……` : '某個史萊姆掉進側溝了……');
    }
    removeDoll(i);
  }
}

// 跟時間有關的事：連投、放娃娃、金幣雨、媽媽十元（每一幀呼叫一次）
function updateTimers(frame) {
  // 按住連投，或自動投幣
  if (pointerDown || autoDrop) tryDrop();

  tutorTick(frame);

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
    if (dolls.length + dollQueue.length < maxDolls() && dollChance.roll()) dropNewDoll();
  }
  // 檯面上不能沒有史萊姆（2026-10-05 納可）：少於 2 隻的時候，等 3 秒就直接補一隻，不用等機率
  if (dolls.length + dollQueue.length < DOLL_MIN && !rebornBusy && !rebirth.shopping) {
    dollLowT += frame;
    if (dollLowT >= DOLL_LOW_WAIT) { dollLowT = 0; dropNewDoll(); }
  } else {
    dollLowT = 0;
  }

  // 每一秒擲一次要不要放道具、彩券（保底式假隨機）
  propTimer += frame;
  if (propTimer >= 1) {
    propTimer -= 1;
    if (props.length < MAX_PROPS && itemChance.roll()) dropProp('item');
    if (props.length < MAX_PROPS && !props.some((p) => p.type === 'ticket') && ticketChance.roll()) dropProp('ticket');
  }

  // 每一秒擲一次要不要放小寶物（解鎖了才有）
  treasureTimer += frame;
  if (treasureTimer >= 1) {
    treasureTimer -= 1;
    if (perkLv('gems') > 0 && treasures.length < maxTreasures() && treasureChance.roll()) dropTreasure();
  }

  // 檯面上的幣太少：下一場補充用的金幣雨，不夠就再一場（2026-10-05 納可：正常情況不會觸發）
  refillCheck += frame;
  if (refillCheck >= 3) {
    refillCheck = 0;
    if (rainQueue === 0 && feverTime <= 0 && !rebornBusy && !rebirth.shopping && coins.length < REFILL_MIN) startRefill();
  }

  // 金幣雨：大約 2.5 秒內，一枚一枚從畫面上方翻轉著掉下來
  if (rainQueue > 0) {
    rainSpawn += frame * rainRate;
    while (rainSpawn >= 1 && rainQueue > 0) {
      rainSpawn -= 1;
      if (!dropRainCoin()) { rainQueue = 0; break; }
      rainQueue--;
    }
  }

  // 狂熱時間：一直下金幣雨（每秒 FEVER_RAIN 枚）
  if (feverTime > 0) {
    feverTime = Math.max(0, feverTime - frame);
    feverSpawn += frame * FEVER_RAIN;
    while (feverSpawn >= 1) { feverSpawn -= 1; dropRainCoin(); }
    if (feverTime <= 0) endFever();
  }

  if (shakeCd > 0) shakeCd = Math.max(0, shakeCd - frame);
  if (rainCd > 0) rainCd = Math.max(0, rainCd - frame);
  if (summonCd > 0) summonCd = Math.max(0, summonCd - frame);

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

let renderSkip = false;
function tick(now) {
  const frame = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  acc += frame;
  let steps = 0;
  if (rebirth.shopping) acc = 0; // 輪迴點商店開著的時候機台停著
  while (acc >= STEP && steps < 4) {
    stepSim();
    acc -= STEP;
    steps++;
  }
  if (steps === 4) acc = 0;

  if (!rebirth.shopping) updateTimers(frame);
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
  for (const t of treasures) {
    t.mesh.position.copy(t.body.translation());
    t.mesh.quaternion.copy(t.body.rotation());
  }
  for (const d of dolls) {
    d.mesh.position.copy(d.body.translation());
    d.mesh.quaternion.copy(d.body.rotation());
    updateSlimeEffects(d.mesh, now / 1000);
  }
  for (const it of shelfItems) updateSlimeEffects(it.userData.slime, now / 1000);
  aimGhost.position.x = aimX;
  aimGhost.rotation.y += frame * 2;

  updateCoinSound();
  updateHud();
  // 狂熱時間：燈光慢慢變成暖粉金色，結束再慢慢變回來
  feverBlend += ((feverTime > 0 ? 1 : 0) - feverBlend) * Math.min(1, frame * 3);
  hemi.color.copy(HEMI_COLOR).lerp(FEVER_HEMI, feverBlend);
  sun.color.copy(SUN_COLOR).lerp(FEVER_SUN, feverBlend);
  // 甩的時候畫面跟著晃
  const sway = shakeTime > 0 ? Math.sin(simTime * 60) * 0.08 * (shakeTime / SHAKE_TIME) : 0;
  camera.position.x += sway;
  // 轉盤在轉的時候，後面的 3D 隔一幀才畫一次，把力氣讓給轉盤（後面被蓋住，看不出差別）
  renderSkip = wheelSpinning ? !renderSkip : false;
  if (!renderSkip) renderer.render(scene, camera);
  camera.position.x -= sway;
  requestAnimationFrame(tick);
}

// ===== 新手提示 =====
// 2026-10-05 納可：缺新手教學。做法（Claude 定）：不打斷遊戲，下面中間一次跳一個小提示，
// 玩到那一步才出現；做了該做的事或時間到就收起來，看過的不再出現（存在存檔裡）。設定「其他」可以重看
const TUTOR = [
  { id: 'drop', when: () => true, text: '點檯面投幣，按住可以一直投', done: () => stats.coinsDropped >= 3 },
  { id: 'push', when: () => stats.coinsDropped >= 3, text: '推板會把幣往前推，從前緣掉下去的就是你的', dur: 8 },
  { id: 'doll', when: () => stats.coinsDropped >= 8 && dolls.length > 0, text: '史萊姆娃娃推下前緣，會收進「圖鑑」還會噴幣', dur: 9 },
  { id: 'auto', when: () => stats.coinsDropped >= 20 && !autoDrop, text: '懶得一直點？右鍵或按「自動」會自己連續投', done: () => autoDrop, dur: 12 },
  { id: 'mom', when: () => wallet < 5, text: '沒錢不用怕，每隔一段時間會補 10 枚，看右上角的倒數', dur: 9 },
  { id: 'shop', when: () => stats.coinsDropped >= 10 && upgrades[UPGRADE_KEYS[0]] === 0 && wallet >= upPrice(UPGRADE_KEYS[0]), text: '錢夠了！打開「商店」買升級', done: () => shopEl.classList.contains('show') || upgrades[UPGRADE_KEYS[0]] > 0, dur: 20 },
  { id: 'ticket', when: () => freeSpins > 0, text: '拿到免費彩券了，按「彩券」轉一次', done: () => freeSpins === 0, dur: 12 },
  { id: 'item', when: () => props.some((p) => p.type !== 'ticket'), text: '道具推下前緣會馬上發動', dur: 8 },
  { id: 'fever', when: () => feverGauge >= 300, text: '推下東西會累積狂熱值（錢下面那一條），滿了就是狂熱時間', dur: 9 },
  { id: 'rebirth', when: () => rebirthPending() >= 1, text: '可以輪迴了！看看「商店」的「輪迴」分頁', dur: 12 },
];
const tutorSeen = new Set();
const tutorEl = document.getElementById('tutor');
let tutorNow = null;
let tutorT = 0;
let tutorGap = 1.5;          // 一個收起來之後，隔一下下才跳下一個
let tutorCheck = 0;
function tutorShow(t) {
  tutorNow = t;
  tutorT = 0;
  document.getElementById('tutorText').textContent = t.text; // 句子會換行，不用 hangHtml（它不換行）
  tutorEl.classList.add('show');
}
function tutorHide() {
  if (tutorNow) tutorSeen.add(tutorNow.id);
  tutorNow = null;
  tutorGap = 1.5;
  tutorEl.classList.remove('show');
}
function tutorTick(frame) {
  if (rebornBusy || rebirth.shopping) return;
  if (tutorNow) {
    tutorT += frame;
    if ((tutorNow.done && tutorNow.done()) || (tutorNow.dur && tutorT >= tutorNow.dur)) tutorHide();
    return;
  }
  if (tutorGap > 0) { tutorGap -= frame; return; }
  tutorCheck += frame;
  if (tutorCheck < 0.5) return;
  tutorCheck = 0;
  // 條件已經達成的直接跳過（例如早就開過自動），不用再講
  const t = TUTOR.find((x) => !tutorSeen.has(x.id) && x.when());
  if (!t) return;
  if (t.done && t.done() && t.id !== 'drop') { tutorSeen.add(t.id); return; }
  tutorShow(t);
}
document.getElementById('tutorClose').addEventListener('click', tutorHide);
document.getElementById('tutorReset').addEventListener('click', () => {
  tutorSeen.clear();
  tutorEl.classList.remove('show');
  tutorNow = null;
  tutorGap = 0.5;
  saveGame();
  toast('新手提示會從頭再出現一次');
});

// 沒選過畫質就先問（自動測試時跳過，用建議的；網址加 ?pick=1 可以強制問）
if (!qualityChosen) {
  const testing = navigator.webdriver && !/[?&]pick=1/.test(location.search);
  quality = testing ? quality : await askQuality();
}
applyQuality(quality);
const saved = loadSave();
if (saved) applySave(saved);
else prefill();
if (rebirth.shopping) showRebirthShop(); // 上次在輪迴點商店裡關掉的，回到那裡
// 上次開著「難推」：檯面也換成難推的摩擦力（幣在投的時候就照新的了）
if (hardPush) { hardPush = false; setHardPush(true, true); }
else setHardPush(false, true);
buildGuards();
updateLotteryBadge();
updateHud();
gameReady = true;
document.getElementById('loading').classList.add('hide');
setTimeout(prewarmSlimes, 1200); // 開好之後趁空檔熱身，不拖慢開啟
// 給測試用
window.__game = { coins, world, camera, get moving() { return movingCount; }, applyQuality, get quality() { return quality; }, get wallet() { return wallet; }, get won() { return won; }, get lost() { return lost; }, dropAt(x) { aimX = x; dropCoin(); }, upgrades, buy, setWallet(n) { wallet = n; }, startRain, UPGRADES, get rain() { return rainQueue; }, setHardPush, get hardPush() { return hardPush; }, startRefill, get refills() { return refills; }, dolls, collection, dropNewDoll, spawnDoll, get activeSets() { return activeSets; }, setSets(a) { activeSets = a; refillDollBag(); return prewarmSlimes(); }, prewarmSlimes, openViewer, props, dropProp, spawnProp, triggerItem, treasures, spawnTreasure, dropTreasure, startShake, startRainSkill, get rainCd() { return rainCd; }, get summonCd() { return summonCd; }, startSummon, addFever, get fever() { return { gauge: feverGauge, time: feverTime }; }, rebirth, rebirthNeed, rebirthPending, doRebirth, rebirthWithAnim, enterRebirthShop, get rebornBusy() { return rebornBusy; }, buyPerk, upPrice, toggleShelf, shelf, get earned() { return won; }, set earned(v) { won = v; }, get shakeCd() { return shakeCd; }, get freeSpins() { return freeSpins; }, giveSpins(n) { freeSpins += n; updateLotteryBadge(); }, get wheelTop() { const t = ((-wheelAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return WHEEL.findIndex((w) => { const d = Math.abs(((t - w.mid + Math.PI * 3) % (Math.PI * 2)) - Math.PI); return d < w.half; }); }, WHEEL, spinWheel, spawnCoin, clearTable() { while (coins.length) removeCoin(coins.length - 1); while (dolls.length) removeDoll(dolls.length - 1); while (props.length) removeProp(props.length - 1); while (treasures.length) removeTreasure(treasures.length - 1); }, stats, achieved, get achPoints() { return achPoints; }, checkAchievements, PseudoRandom, get auto() { return autoDrop; }, soundOn, bigChance, setAuto, saveGame, saveData, RAPIER, renderer, simulate(sec) { for (let i = 0; i < sec * 60; i++) stepSim(); },
  // 測試用：照真實時間跑物理和計時（自動投幣、娃娃、金幣雨、媽媽都會動），每一步呼叫 onStep
  play(sec, onStep) { for (let i = 0; i < sec * 60; i++) { stepSim(); updateTimers(STEP); if (onStep) onStep(i * STEP); } },
  setAim(x) { aimX = x; }, upValue, tutorSeen, get tutorNow() { return tutorNow && tutorNow.id; }, canBuy(key) { const lv = upgrades[key]; const i = UPGRADE_KEYS.indexOf(key); return shopVisible(i) && lv < UPGRADES[key].prices.length && wallet >= upPrice(key); }, UPGRADE_KEYS };
requestAnimationFrame((t) => { lastT = t; tick(t); });
