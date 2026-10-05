// 史萊姆娃娃：分成好幾套，每套 10 隻。同一個位置（第幾隻）的價值、稀有度每套都一樣，只是換皮。
// 全部用程式做，不用畫圖。新增一套只要在 SLIME_SETS 加一筆。
import * as THREE from './lib/three.module.js';

// 稀有度
export const RARITY = {
  common: { name: '普通', color: '#c9c2d6' },
  rare: { name: '稀有', color: '#7ec8ff' },
  legend: { name: '傳說', color: '#f4c95d' },
};

// 每一套第 1 到第 10 隻：推下去值多少枚、稀有度（每套都一樣）
// 娃娃只分三個檔次，同一檔的價值都一樣（納可：金額不要分太細）
export const SLOTS = [
  { value: 50, rarity: 'common' },
  { value: 50, rarity: 'common' },
  { value: 50, rarity: 'common' },
  { value: 50, rarity: 'common' },
  { value: 50, rarity: 'common' },
  { value: 50, rarity: 'common' },
  { value: 150, rarity: 'rare' },
  { value: 150, rarity: 'rare' },
  { value: 150, rarity: 'rare' },
  { value: 500, rarity: 'legend' },
];

// look：jelly 半透明果凍、night 夜空（半透明裡有小星星）、rainbow 彩虹果凍、diamond 鑽石、gem 彩色寶石（跟鑽石一樣的切面）、
//       cream 甜點（霧面奶油感）、twotone 上下雙色甜點、flake 金箔巧克力、metal 金屬、pearl 珍珠、bismuth 鉍（彩虹光澤的金屬）、
//       scoop 冰淇淋球（speck 顆粒顏色）、shaved 剉冰（color2 糖漿、topping 配料、cube 配料是方塊）、popsicle 冰棒、swirl 彩虹霜淇淋、ice 冰晶
//       drink 飲料（裡面有冰塊、頭上插吸管；milky 不透明的奶茶果汁、pearls 珍珠、lemon 檸檬片、grad 上到下漸層、tiger 黑糖虎紋、fizz 氣泡）
// hat：頭上的小東西。cone 甜筒餅乾帽、stick 冰棒棍
// 拿出來存著的史萊姆（放錯組的）寫在 設計文件/史萊姆備用.txt，造型的程式留著，以後做新的一組可以直接用
export const SLIME_SETS = [
  {
    id: 'jelly',
    name: '果凍',
    unlock: null,
    skins: [
      { name: '蘇打果凍', look: 'jelly', color: '#8fd3ff' },
      { name: '檸檬果凍', look: 'jelly', color: '#ffe27a' },
      { name: '青蘋果果凍', look: 'jelly', color: '#b4ee86' },
      { name: '蜜桃果凍', look: 'jelly', color: '#ffb59c' },
      { name: '葡萄果凍', look: 'jelly', color: '#b99cff' },
      { name: '草莓果凍', look: 'jelly', color: '#ff8fa8' },
      { name: '海鹽果凍', look: 'jelly', color: '#8eeedb' },
      { name: '薰衣草果凍', look: 'jelly', color: '#e3a6ff' },
      { name: '夜空果凍', look: 'night', color: '#2c3a8c' },
      { name: '彩虹果凍', look: 'rainbow', color: '#ffe3ef', sparkle: true },
    ],
  },
  // 解鎖順序照好看程度：果凍 → 金屬 → 甜點 → 動物 → 寶石（2026-10-05 納可定）
  {
    id: 'metal',
    name: '金屬',
    unlock: { set: 'jelly', kinds: 6 },
    skins: [
      { name: '銅史萊姆', look: 'metal', color: '#c97d4c' },
      { name: '鐵史萊姆', look: 'metal', color: '#8d9299' },
      { name: '青銅史萊姆', look: 'metal', color: '#7f9a5c' },
      { name: '銀史萊姆', look: 'metal', color: '#dfe3e8' },
      { name: '鈦藍史萊姆', look: 'metal', color: '#82a0cf' },
      { name: '玫瑰金史萊姆', look: 'metal', color: '#eaa898' },
      { name: '黑鐵史萊姆', look: 'metal', color: '#3c3e43' },
      { name: '紫鈦史萊姆', look: 'metal', color: '#8a6fd1' },
      { name: '彩虹鉍史萊姆', look: 'bismuth', color: '#8a7fc0' },
      { name: '黃金史萊姆', look: 'metal', color: '#f4c95d', sparkle: true },
    ],
  },
  {
    id: 'sweets',
    name: '甜點',
    unlock: { set: 'metal', kinds: 6 },
    skins: [
      { name: '牛奶史萊姆', look: 'cream', color: '#fbf5ea' },
      { name: '香蕉史萊姆', look: 'cream', color: '#ffd23a' },
      { name: '抹茶史萊姆', look: 'cream', color: '#6fa83c' },
      { name: '草莓牛奶史萊姆', look: 'cream', color: '#ff8fae' },
      { name: '芋頭史萊姆', look: 'cream', color: '#9466cc' },
      { name: '芒果史萊姆', look: 'cream', color: '#ff9a1f' },
      { name: '焦糖布丁史萊姆', look: 'twotone', color: '#ffe29a', color2: '#a65a1e' },
      { name: '薄荷巧克力史萊姆', look: 'twotone', color: '#7fe0b8', color2: '#5a3a28' },
      { name: '黑芝麻史萊姆', look: 'cream', color: '#3a3532' },
      { name: '金箔巧克力史萊姆', look: 'flake', color: '#4a2b1d', sparkle: true },
    ],
  },
  {
    // 動物：一樣的奶油感身體，用耳朵、翅膀分出是什麼動物。ear 是耳朵（或耳朵裡面）的顏色
    id: 'animal',
    name: '動物',
    unlock: { set: 'sweets', kinds: 6 },
    skins: [
      { name: '白兔史萊姆', look: 'cream', animal: 'rabbit', color: '#f7f0e6', ear: '#ffb3c6' },
      { name: '橘貓史萊姆', look: 'cream', animal: 'cat', color: '#ffb15c', ear: '#ffd9c2' },
      { name: '柴犬史萊姆', look: 'cream', animal: 'dog', color: '#e9a25a', ear: '#b8702f' },
      { name: '小熊史萊姆', look: 'cream', animal: 'bear', color: '#a8754f', ear: '#7d5236' },
      { name: '灰兔史萊姆', look: 'cream', animal: 'rabbit', color: '#a9a4b3', ear: '#ffc2d1' },
      { name: '黑貓史萊姆', look: 'cream', animal: 'cat', color: '#3a3532', ear: '#8a6a7a' },
      { name: '狐狸史萊姆', look: 'cream', animal: 'fox', color: '#ff8a3d', ear: '#fff3e6' },
      { name: '熊貓史萊姆', look: 'cream', animal: 'panda', color: '#f6f3ec', ear: '#2a2628' },
      { name: '小蝙蝠史萊姆', look: 'cream', animal: 'bat', color: '#6b5a9e', ear: '#463a6e' },
      { name: '孔雀史萊姆', look: 'cream', animal: 'peacock', color: '#2f7fd8', ear: '#1fa37f', sparkle: true },
    ],
  },
  {
    // 寶石：全部用鑽石的切面身體，換寶石的顏色（2026-10-05 納可：鑽石很漂亮，獨立出來一套）
    id: 'gem',
    name: '寶石',
    unlock: { set: 'animal', kinds: 6 },
    skins: [
      { name: '紫水晶史萊姆', look: 'gem', color: '#b48cff' },
      { name: '黃水晶史萊姆', look: 'gem', color: '#ffcf5c' },
      { name: '粉晶史萊姆', look: 'gem', color: '#ffb0cc' },
      { name: '橄欖石史萊姆', look: 'gem', color: '#b2e05a' },
      { name: '海藍寶史萊姆', look: 'gem', color: '#86dcff' },
      { name: '托帕石史萊姆', look: 'gem', color: '#ff9f5a' },
      { name: '藍寶石史萊姆', look: 'gem', color: '#2f5bff' },
      { name: '紅寶石史萊姆', look: 'gem', color: '#ff2b4a' },
      { name: '祖母綠史萊姆', look: 'gem', color: '#14b871' },
      { name: '鑽石史萊姆', look: 'diamond', color: '#ffffff', sparkle: true },
    ],
  },
  {
    // 冰品（2026-10-05 納可的點子：剉冰、冰淇淋、甜筒，甜筒的餅乾筒變成迷你帽子）
    id: 'ice',
    name: '冰品',
    unlock: { set: 'gem', kinds: 6 },
    skins: [
      { name: '香草冰淇淋史萊姆', look: 'scoop', color: '#fff2d6', speck: '#4a3420' },
      { name: '草莓冰淇淋史萊姆', look: 'scoop', color: '#ffbccd', speck: '#e8456c' },
      { name: '巧克力豆冰淇淋史萊姆', look: 'scoop', color: '#8c5b3e', speck: '#3a2114' },
      { name: '蘇打冰棒史萊姆', look: 'popsicle', color: '#8fd6ff', hat: 'stick' },
      { name: '芒果剉冰史萊姆', look: 'shaved', color: '#f6fbff', color2: '#ffb12e', topping: '#ffcf4a', cube: true },
      { name: '草莓剉冰史萊姆', look: 'shaved', color: '#f6fbff', color2: '#ff5a80', topping: '#e8234f', cube: true },
      { name: '宇治金時剉冰史萊姆', look: 'shaved', color: '#f6fbff', color2: '#86b04a', topping: '#5c1f22' },
      { name: '香草甜筒史萊姆', look: 'scoop', color: '#fff2d6', speck: '#4a3420', hat: 'cone' },
      { name: '彩虹霜淇淋史萊姆', look: 'swirl', color: '#ffe8f0', hat: 'cone' },
      { name: '冰晶史萊姆', look: 'ice', color: '#e6f6ff', sparkle: true },
    ],
  },
  {
    // 飲料（2026-10-05 納可的點子：都會有冰塊在裡面）：身體是一杯飲料，裡面浮著冰塊，頭上插吸管
    id: 'drink',
    name: '飲料',
    unlock: { set: 'ice', kinds: 6 },
    skins: [
      { name: '紅茶史萊姆', look: 'drink', color: '#c8621c', straw: '#ffffff' },
      { name: '綠茶史萊姆', look: 'drink', color: '#d9cc5c', straw: '#8fd6a0' },
      { name: '烏龍茶史萊姆', look: 'drink', color: '#b97a2e', straw: '#ffffff' },
      { name: '冬瓜茶史萊姆', look: 'drink', color: '#93541f', straw: '#ffe08a' },
      { name: '蜂蜜檸檬史萊姆', look: 'drink', color: '#ffd84a', straw: '#fff4b0', lemon: true },
      { name: '柳橙汁史萊姆', look: 'drink', color: '#ffa12e', straw: '#ff6a3d', milky: true },
      { name: '珍珠奶茶史萊姆', look: 'drink', color: '#d8b08a', straw: '#f2a6c4', milky: true, pearls: true },
      { name: '蝶豆花檸檬史萊姆', look: 'drink', color: '#8a7bff', grad: ['#5f8dff', '#8a6cf0', '#d77ad8'], straw: '#fff4b0', lemon: true },
      { name: '黑糖珍珠鮮奶史萊姆', look: 'drink', color: '#f6efe4', straw: '#c98a45', milky: true, pearls: true, tiger: true },
      { name: '彩虹氣泡飲史萊姆', look: 'drink', color: '#ffd1e6', grad: ['#ff9ec4', '#ffd27a', '#9fe6b8', '#8fd3ff'], straw: '#ffffff', fizz: true, sparkle: true },
    ],
  },
];
// 不在任何一套裡的史萊姆（從組裡拿出來存著的，見 設計文件/史萊姆備用.txt）。天使用在轉生動畫
export const SPARE_SKINS = {
  angel: { name: '天使史萊姆', look: 'cream', animal: 'angel', color: '#fff1c9', ear: '#ffffff', sparkle: true },
  blackPearl: { name: '黑珍珠史萊姆', look: 'pearl', color: '#2e2a3a' },
};
// 切面身體（鑽石、寶石）
const faceted = (skin) => skin.look === 'diamond' || skin.look === 'gem';

export const SET_BY_ID = Object.fromEntries(SLIME_SETS.map((s) => [s.id, s]));

// 娃娃的 id 寫成「套.第幾隻」，例如 jelly.3（第幾隻從 0 開始算）
export function slimeInfo(id) {
  const [setId, slotStr] = String(id).split('.');
  const set = SET_BY_ID[setId];
  const slot = Number(slotStr);
  if (!set || !(slot >= 0 && slot < 10)) return null;
  return { id, set, slot, skin: set.skins[slot], ...SLOTS[slot] };
}

// 深色的史萊姆用白眼睛，其他用黑眼睛
// 亮度 0.33 以上算淺色（白眼睛在上面對比不夠）。果凍、寶石是透明的，透出後面的檯面，看起來比原本的顏色深，門檻放到 0.5
function isLight(hex, look) {
  const c = new THREE.Color(hex);
  const see = look === 'jelly' || look === 'gem' || look === 'ice' || look === 'drink';
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b >= (see ? 0.5 : 0.33);
}
function isDark(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 0.18;
}

// 史萊姆的側面輪廓（半徑 r、高度 y，都以 1 為單位）：底部平、上面圓
// 史萊姆的側面輪廓（半徑 r、高度 y，都以 1 為單位）：底部只有一小塊是平的、肚子圓圓的，
// 像一顆麻糬，比較不會穩穩地坐著不動
const PROFILE = [
  [0, 0], [0.42, 0], [0.66, 0.035], [0.84, 0.11], [0.96, 0.23], [1.0, 0.37],
  [0.97, 0.52], [0.87, 0.67], [0.7, 0.8], [0.48, 0.91], [0.24, 0.975], [0, 1],
];
export const SLIME_R = 0.68;
export const SLIME_H = 0.98;

// 輪廓在某個高度（0 到 1）的半徑
// 畫面用的輪廓：把上面那些點用平滑的曲線連起來（以前是一段一段的直線，金屬、果凍的倒影會出現一圈一圈的條紋）
const SMOOTH = (() => {
  const curve = new THREE.SplineCurve(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)));
  return curve.getPoints(64).map((v, i, a) => [
    i === 0 || i === a.length - 1 ? v.x : Math.max(0, v.x),
    i === 0 ? 0 : i === a.length - 1 ? 1 : Math.min(1, Math.max(0, v.y)),
  ]);
})();
function radiusAt(y) {
  for (let i = 1; i < SMOOTH.length; i++) {
    const [r0, y0] = SMOOTH[i - 1];
    const [r1, y1] = SMOOTH[i];
    if (y1 <= y0) continue;
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

// 物理用的外形點
export function slimeHullPoints(scale) {
  const pts = [];
  const seg = 12;
  for (const [r, y] of PROFILE) {
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(Math.cos(a) * r * SLIME_R * scale, y * SLIME_H * scale, Math.sin(a) * r * SLIME_R * scale);
    }
  }
  return new Float32Array(pts);
}

let bodyGeo = null;
function getBodyGeo() {
  if (bodyGeo) return bodyGeo;
  const pts = SMOOTH.map(([r, y]) => new THREE.Vector2(r * SLIME_R, y * SLIME_H));
  // LatheGeometry 自己會算好接縫處的法線，不要再重算，不然身體中間會出現一條線
  bodyGeo = new THREE.LatheGeometry(pts, 48);
  return bodyGeo;
}

function canvasTexture(draw) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// 金屬和果凍史萊姆自己的「攝影棚倒影」（2026-10-05 納可：果凍和金屬有點醜）：
// 機台的房間倒影有很多一條一條的燈，照在圓圓的史萊姆上變成亂亂的條紋。這張是柔和的漸層加兩團柔光，
// 倒影乾淨、像玩具一樣亮亮的。一張小圖，幾乎不花效能
let studioTex = null;
function getStudioEnv() {
  if (studioTex) return studioTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#fffaf2');
  g.addColorStop(0.35, '#e9e4f2');
  g.addColorStop(0.55, '#8f8aa3');
  g.addColorStop(0.7, '#3d3a4c');
  g.addColorStop(1, '#1d1b26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  // 主燈（左上，暖白）和補光（右邊，淡粉紫），邊緣都是柔的
  const blob = (x, y, r, col) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  blob(90, 30, 34, 'rgba(255,255,255,1)');
  blob(200, 48, 26, 'rgba(255,225,240,0.8)');
  blob(20, 52, 22, 'rgba(220,235,255,0.6)');
  studioTex = new THREE.CanvasTexture(c);
  studioTex.colorSpace = THREE.SRGBColorSpace;
  studioTex.mapping = THREE.EquirectangularReflectionMapping;
  return studioTex;
}

// 動物組的毛茸茸（2026-10-05 納可：毛茸茸或霧面，用貼圖、不要吃資源）：
// 一張 128×128 的小圖，畫滿短短的細毛，當成凹凸貼圖重複貼滿全身；再加一層柔柔的絨光
let furTex = null;
function getFurTex() {
  if (furTex) return furTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.lineCap = 'round';
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * 128;
    const y = rnd() * 128;
    const a = Math.PI / 2 + (rnd() - 0.5) * 0.9; // 大致往下順
    const len = 3 + rnd() * 5;
    const v = Math.floor(rnd() * 255);
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.lineWidth = 0.6 + rnd() * 0.8;
    // 畫三次（左右、上下錯開一張），接縫才不會斷
    for (const [ox, oy] of [[0, 0], [-128, 0], [0, -128], [-128, -128]]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + oy);
      ctx.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  furTex = new THREE.CanvasTexture(c);
  furTex.wrapS = furTex.wrapT = THREE.RepeatWrapping;
  furTex.repeat.set(8, 4);
  return furTex;
}
function furMaterial(color, dark) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.92,
    bumpMap: getFurTex(), bumpScale: 1.1,
    sheen: dark ? 0.35 : 0.7, sheenRoughness: 0.75,
    sheenColor: dark ? color.clone().lerp(new THREE.Color(1, 1, 1), 0.25) : color.clone().lerp(new THREE.Color(1, 1, 1), 0.55),
  });
}

// ===== 冰品 =====
// 冰的顆粒（剉冰、冰淇淋表面一粒一粒的），當凹凸貼圖
let grainTex = null;
function getGrainTex() {
  if (grainTex) return grainTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(rnd() * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    const x = rnd() * 128;
    const y = rnd() * 128;
    const r = 0.8 + rnd() * 1.6;
    for (const [ox, oy] of [[0, 0], [-128, 0], [0, -128], [-128, -128]]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  grainTex = new THREE.CanvasTexture(c);
  grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping;
  grainTex.repeat.set(6, 3);
  return grainTex;
}
// 冰淇淋球：整球一種口味，撒上小顆粒（香草籽、草莓果肉、巧克力豆）；下緣一圈挖球留下的不規則邊
function scoopTexture(skin) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = skin.color;
    ctx.fillRect(0, 0, 256, 128);
    const edge = '#' + new THREE.Color(skin.color).multiplyScalar(0.88).getHexString();
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.moveTo(0, 128);
    for (let x = 0; x <= 256; x += 4) ctx.lineTo(x, 108 + Math.sin(x / 9) * 3 + Math.sin(x / 3.7) * 2);
    ctx.lineTo(256, 128);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin.speck;
    let seed = skin.name.length * 97;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * 256;
      const y = 8 + rnd() * 100;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd() * Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.6 + rnd() * 1.6, 0.9 + rnd() * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}
// 剉冰：白白的冰，頭頂淋一層糖漿（邊緣往下流），上面放配料（芒果丁、草莓、紅豆）
function shavedTexture(skin) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = skin.color;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#e4eef8';
    let seed = skin.name.length * 131;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 160; i++) ctx.fillRect(rnd() * 256, rnd() * 128, 1.5, 1.5);
    // 糖漿：頭頂一片，邊緣有幾條往下流
    ctx.fillStyle = skin.color2;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= 256; x += 2) {
      const drip = Math.max(0, Math.sin(x / 256 * Math.PI * 14 + 1.3)) ** 6 * 22;
      ctx.lineTo(x, 40 + Math.sin(x / 11) * 4 + drip);
    }
    ctx.lineTo(256, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // 配料
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 256;
      const y = 4 + rnd() * 30;
      ctx.fillStyle = skin.topping;
      if (skin.cube) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rnd());
        ctx.fillRect(-3.5, -3.5, 7, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(-3.5, -3.5, 7, 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.ellipse(x, y, 3.2, 2.4, rnd(), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}
// 彩虹霜淇淋：淡淡的彩虹斜紋，像一圈一圈擠出來的
function swirlTexture() {
  return canvasTexture((ctx) => {
    const cols = ['#ffd1dc', '#ffe5c2', '#fff6c2', '#d8f5d0', '#cdeeff', '#e2d6ff'];
    for (let k = -6; k < 26; k++) {
      ctx.fillStyle = cols[((k % cols.length) + cols.length) % cols.length];
      ctx.beginPath();
      ctx.moveTo(k * 16, 0);
      ctx.lineTo(k * 16 + 16, 0);
      ctx.lineTo(k * 16 + 16 + 64, 128);
      ctx.lineTo(k * 16 + 64, 128);
      ctx.closePath();
      ctx.fill();
    }
    // 每一圈中間淡淡的陰影，看起來一條一條是擠出來的
    ctx.strokeStyle = 'rgba(160, 120, 140, 0.18)';
    ctx.lineWidth = 2;
    for (let k = -6; k < 26; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 16, 0);
      ctx.lineTo(k * 16 + 64, 128);
      ctx.stroke();
    }
  });
}
// 飲料的貼圖：上到下的漸層（蝶豆花、彩虹氣泡飲）、黑糖鮮奶的虎紋
function drinkTexture(skin) {
  return canvasTexture((ctx) => {
    if (skin.grad) {
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      skin.grad.forEach((c, i) => g.addColorStop(i / (skin.grad.length - 1), c));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = skin.color;
    }
    ctx.fillRect(0, 0, 256, 128);
    if (skin.tiger) {
      // 黑糖沿著杯壁流下來的紋路，上面淡、下面濃
      for (let k = 0; k < 14; k++) {
        const x = k * 18.3 + 6;
        const g = ctx.createLinearGradient(0, 30, 0, 128);
        g.addColorStop(0, 'rgba(120, 60, 20, 0)');
        g.addColorStop(1, 'rgba(110, 52, 16, 0.85)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, 128);
        for (let y = 128; y >= 30; y -= 4) ctx.lineTo(x + Math.sin(y / 9 + k) * 4, y);
        for (let y = 30; y <= 128; y += 4) ctx.lineTo(x + 7 + (y - 30) * 0.06 + Math.sin(y / 9 + k) * 4, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  });
}

// 甜筒的餅乾格紋
let waffleTex = null;
function getWaffleTex() {
  if (waffleTex) return waffleTex;
  waffleTex = canvasTexture((ctx) => {
    ctx.fillStyle = '#e0a85e';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#a8692c';
    ctx.lineWidth = 3;
    for (let k = -8; k < 24; k++) {
      ctx.beginPath(); ctx.moveTo(k * 21, 0); ctx.lineTo(k * 21 + 128, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k * 21 + 128, 0); ctx.lineTo(k * 21, 128); ctx.stroke();
    }
  });
  return waffleTex;
}

// 貼圖的上方對應史萊姆的頭頂
function twotoneTexture(skin) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = skin.color;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = skin.color2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= 256; x += 4) ctx.lineTo(x, 44 + Math.sin(x / 13) * 6 + Math.sin(x / 5) * 2);
    ctx.lineTo(256, 0);
    ctx.closePath();
    ctx.fill();
  });
}

function flakeTexture(skin) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = skin.color;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#e9c46a';
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 70;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2 + Math.random() * 4, y + Math.random() * 3);
      ctx.lineTo(x + Math.random() * 3, y + 2 + Math.random() * 4);
      ctx.closePath();
      ctx.fill();
    }
  });
}

// 鑽石：像寶石那樣切成幾個大面。頂端是一片平台，中間一圈直直的帶子放眼睛，
// 上下兩段的點錯開半格，切出三角形的星形面。每一面都是平的。
// 每一圈：[半徑, 高度, 錯開半格(0 或 0.5)]
const FACETS = 8;
const DIAMOND = [
  [0, 0, 0], [0.55, 0, 0], [0.9, 0.14, 0.5], [1.0, 0.32, 0],
  [0.97, 0.62, 0], [0.78, 0.82, 0.5], [0.5, 0.95, 0], [0, 0.95, 0],
];
const DIA_EYE = [3, 4]; // 眼睛放在這兩圈中間的帶子上
let diamondGeo = null;
function getDiamondGeo() {
  if (diamondGeo) return diamondGeo;
  const ring = ([r, y, off], j) => {
    const a = ((j + off) * 2 * Math.PI) / FACETS - Math.PI / FACETS; // 讓一個面正對前方
    return new THREE.Vector3(Math.sin(a) * r * SLIME_R, y * SLIME_H, Math.cos(a) * r * SLIME_R);
  };
  const mid = new THREE.Vector3(0, 0.47 * SLIME_H, 0);
  const pos = [];
  const tri = (a, b, c) => {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (n.lengthSq() < 1e-10) return; // 尖端那一圈縮成一點，跳過壓扁的三角形
    const out = a.clone().add(b).add(c).divideScalar(3).sub(mid);
    if (n.dot(out) < 0) [b, c] = [c, b]; // 讓每一面都朝外
    for (const v of [a, b, c]) pos.push(v.x, v.y, v.z);
  };
  for (let i = 0; i < DIAMOND.length - 1; i++) {
    const A = DIAMOND[i];
    const B = DIAMOND[i + 1];
    for (let j = 0; j < FACETS; j++) {
      const a0 = ring(A, j), a1 = ring(A, j + 1), b0 = ring(B, j), b1 = ring(B, j + 1);
      if (B[2] >= A[2]) { tri(a0, a1, b0); tri(b0, a1, b1); } // 同一格，或下一圈往前錯開半格
      else { tri(b0, b1, a0); tri(a0, b1, a1); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); // 每個三角形各自算法線＝每一面都是平的
  diamondGeo = g;
  return diamondGeo;
}

// 彩虹果凍：從頭頂到底部一圈一圈淡淡的彩虹（果凍不要太飽和，納可：高飽和很難吃）
let rainbowTex = null;
function getRainbowTex() {
  if (!rainbowTex) {
    rainbowTex = canvasTexture((ctx) => {
      const cols = ['#ffb3c1', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#d7b8ff'];
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 128);
    });
  }
  return rainbowTex;
}

// 假的半透明（低畫質用）：一般的半透明（後面的金幣會透出來），再加「邊緣濃、中間透」，
// 看起來像有厚度的果凍。比真正的透光計算省很多效能。
function fakeJelly(color, { center = 0.38, edge = 0.93, glow = 0.12, rough = 0.42, back = false, map = null } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color, map, roughness: rough, metalness: 0, transparent: true, depthWrite: false,
    side: back ? THREE.BackSide : THREE.FrontSide,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCenter = { value: center };
    sh.uniforms.uEdge = { value: edge };
    sh.uniforms.uGlow = { value: glow };
    sh.fragmentShader = 'uniform float uCenter;\nuniform float uEdge;\nuniform float uGlow;\n' + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float jellyFres = 1.0 - abs(dot(normal, normalize(vViewPosition)));
        diffuseColor.a = mix(uCenter, uEdge, pow(jellyFres, 1.6));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * uGlow * (1.0 - jellyFres);`);
  };
  m.customProgramCacheKey = () => 'fakeJelly';
  return m;
}

// 高／中畫質：真正會透光的半透明（微微霧面）
function realJelly(skin) {
  const color = new THREE.Color(skin.color);
  if (skin.look === 'diamond') {
    // 鑽石的折射率 2.4，加上色散（光分成彩色），切面才會一閃一閃有彩色
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.02, transmission: 1, thickness: 1.2, ior: 2.4,
      dispersion: 5, specularIntensity: 1, attenuationColor: new THREE.Color('#e6f0ff'), attenuationDistance: 2,
    });
  }
  if (skin.look === 'gem') {
    // 彩色寶石：折射率比鑽石低一點（大約藍寶石），顏色從裡面透出來
    return new THREE.MeshPhysicalMaterial({
      color, roughness: 0.03, transmission: 1, thickness: 0.8, ior: 1.77,
      dispersion: 2, specularIntensity: 1, attenuationColor: color.clone().lerp(new THREE.Color(1, 1, 1), 0.3), attenuationDistance: 2.5,
      emissive: color, emissiveIntensity: 0.12, // 一點點自己的顏色亮出來，深色寶石才不會黑掉
    });
  }
  if (skin.look === 'drink') {
    // 飲料：像裝在透明杯子裡，表面亮亮的；奶茶、果汁不透明一點
    const tex = skin.grad || skin.tiger ? drinkTexture(skin) : null;
    return new THREE.MeshPhysicalMaterial({
      color: tex ? 0xffffff : color, map: tex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05,
      transmission: skin.milky ? 0.5 : 0.85, thickness: 0.7, ior: 1.33,
      attenuationColor: color, attenuationDistance: skin.milky ? 1.0 : 1.4,
      emissive: color, emissiveIntensity: skin.milky ? 0.06 : 0.14,
      envMap: getStudioEnv(), envMapIntensity: 0.9,
    });
  }
  if (skin.look === 'ice') {
    // 冰晶：清清透透的冰，帶一點淡藍，表面有一層薄薄的七彩光
    return new THREE.MeshPhysicalMaterial({
      color, roughness: 0.3, transmission: 0.9, thickness: 1, ior: 1.31,
      attenuationColor: new THREE.Color('#d2eeff'), attenuationDistance: 3,
      iridescence: 0.4, iridescenceIOR: 1.3, emissive: new THREE.Color('#dff4ff'), emissiveIntensity: 0.25,
      clearcoat: 1, clearcoatRoughness: 0.05,
      envMap: getStudioEnv(), envMapIntensity: 1,
    });
  }
  if (skin.look === 'rainbow') {
    return new THREE.MeshPhysicalMaterial({
      map: getRainbowTex(), roughness: 0.35, clearcoat: 0.2, clearcoatRoughness: 0.5,
      transmission: 0.8, thickness: 0.7, ior: 1.33, attenuationColor: new THREE.Color('#fff4fa'), attenuationDistance: 1.5,
    });
  }
  // 果凍：表面一層水亮的塗層、裡面淡一點，顏色是透亮的，不會被後面的檯面染得灰灰的
  const night = skin.look === 'night';
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1,
    transmission: night ? 0.88 : 0.7, thickness: 0.55, ior: 1.33,
    attenuationColor: color, attenuationDistance: night ? 0.35 : 2.2,
    emissive: color, emissiveIntensity: night ? 0.02 : 0.22,
    envMap: getStudioEnv(), envMapIntensity: 0.9,
  });
}

// 低畫質：假的半透明，果凍類要畫兩層：先畫內側（深一點），再畫外側
function jellyLayers(skin) {
  const color = new THREE.Color(skin.color);
  if (skin.look === 'diamond') {
    return [
      fakeJelly(new THREE.Color('#dfe9ff'), { center: 0.2, edge: 0.5, glow: 0.1, rough: 0.3, back: true }),
      fakeJelly(new THREE.Color('#f4f8ff'), { center: 0.18, edge: 0.85, glow: 0.2, rough: 0.25 }),
    ];
  }
  if (skin.look === 'gem') {
    return [
      fakeJelly(color.clone().multiplyScalar(0.75), { center: 0.4, edge: 0.65, glow: 0.1, rough: 0.25, back: true }),
      fakeJelly(color.clone().lerp(new THREE.Color(1, 1, 1), 0.2), { center: 0.35, edge: 0.9, glow: 0.2, rough: 0.2 }),
    ];
  }
  if (skin.look === 'drink') {
    const tex = skin.grad || skin.tiger ? drinkTexture(skin) : null;
    const c = tex ? new THREE.Color(1, 1, 1) : color;
    return [
      fakeJelly(c.clone().multiplyScalar(0.75), { center: skin.milky ? 0.8 : 0.35, edge: 0.7, glow: 0.08, rough: 0.2, back: true, map: tex }),
      fakeJelly(c, { center: skin.milky ? 0.85 : 0.4, edge: 0.95, glow: 0.16, rough: 0.15, map: tex }),
    ];
  }
  if (skin.look === 'ice') {
    return [
      fakeJelly(new THREE.Color('#bfe4fb'), { center: 0.25, edge: 0.55, glow: 0.1, rough: 0.2, back: true }),
      fakeJelly(new THREE.Color('#eef9ff'), { center: 0.2, edge: 0.9, glow: 0.2, rough: 0.15 }),
    ];
  }
  if (skin.look === 'rainbow') {
    const white = new THREE.Color(1, 1, 1);
    return [
      fakeJelly(new THREE.Color(0.75, 0.75, 0.75), { center: 0.35, edge: 0.6, glow: 0.05, back: true, map: getRainbowTex() }),
      fakeJelly(white, { center: 0.45, edge: 0.95, glow: 0.14, map: getRainbowTex() }),
    ];
  }
  const night = skin.look === 'night';
  return [
    fakeJelly(color.clone().multiplyScalar(0.7), { center: night ? 0.6 : 0.35, edge: 0.6, glow: 0.05, back: true }),
    fakeJelly(color, { center: night ? 0.6 : 0.44, edge: 0.95, glow: night ? 0.05 : 0.14 }),
  ];
}

const isJelly = (skin) => ['jelly', 'night', 'rainbow', 'diamond', 'gem', 'ice', 'drink'].includes(skin.look);

// 整體走微微霧面：粗糙度高一點、亮面塗層淡一點，反光不要太刺
function bodyMaterial(skin, fancy) {
  const color = new THREE.Color(skin.color);
  switch (skin.look) {
    case 'cream':
      if (skin.animal) return furMaterial(color, isDark(skin.color));
      // 深色的不加絨光，不然會變灰灰的；淺色的絨光用自己的顏色，不然整隻會被洗白
      if (isDark(skin.color)) return new THREE.MeshPhysicalMaterial({ color, roughness: 0.65 });
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.7, sheen: 0.3, sheenColor: color.clone().lerp(new THREE.Color(1, 1, 1), 0.4) });
    case 'twotone':
      return new THREE.MeshPhysicalMaterial({ map: twotoneTexture(skin), roughness: 0.62, sheen: 0.2 });
    case 'flake':
      return new THREE.MeshPhysicalMaterial({ map: flakeTexture(skin), roughness: 0.6, clearcoat: 0.15 });
    case 'scoop':
      return new THREE.MeshPhysicalMaterial({ map: scoopTexture(skin), roughness: 0.62, bumpMap: getGrainTex(), bumpScale: 0.5, sheen: 0.35, sheenColor: new THREE.Color(1, 1, 1) });
    case 'shaved':
      return new THREE.MeshPhysicalMaterial({ map: shavedTexture(skin), roughness: 0.7, bumpMap: getGrainTex(), bumpScale: 1.3, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#eaf6ff') });
    case 'swirl':
      return new THREE.MeshPhysicalMaterial({ map: swirlTexture(), roughness: 0.55, bumpMap: getGrainTex(), bumpScale: 0.35, sheen: 0.3, sheenColor: new THREE.Color(1, 1, 1) });
    case 'popsicle':
      // 冰棒：亮亮的、有一點透（低畫質就是亮亮的冰色）
      if (!fancy) return new THREE.MeshStandardMaterial({ color, roughness: 0.25, emissive: color, emissiveIntensity: 0.12, envMap: getStudioEnv(), envMapIntensity: 0.8 });
      return new THREE.MeshPhysicalMaterial({
        color, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2,
        transmission: 0.35, thickness: 0.6, ior: 1.31, attenuationColor: color, attenuationDistance: 1.2,
        emissive: color, emissiveIntensity: 0.1, envMap: getStudioEnv(), envMapIntensity: 0.8,
      });
    case 'pearl':
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, metalness: 0.1, clearcoat: 0.25, iridescence: 0.6, iridescenceIOR: 1.4 });
    case 'bismuth':
      // 鉍：金屬表面一層薄薄的氧化膜，看起來是彩虹色（藍、紫、金、綠）
      return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.28, iridescence: 1, iridescenceIOR: 2.0, iridescenceThicknessRange: [250, 900], envMap: getStudioEnv(), envMapIntensity: 1.2 });
    case 'metal':
    default:
      // 金屬：像烤漆的金屬玩具，底下是霧霧的金屬，上面一層亮亮的透明漆（低畫質省掉透明漆）
      if (!fancy) return new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.3, envMap: getStudioEnv(), envMapIntensity: 1.1 });
      return new THREE.MeshPhysicalMaterial({
        color, metalness: 0.85, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.12,
        envMap: getStudioEnv(), envMapIntensity: 1.1,
      });
  }
}

const eyeGeo = new THREE.SphereGeometry(1, 16, 12);
// 眼睛設成「半透明但其實不透明」，才能排在半透明的身體後面畫
// 眼睛不吃光（2026-10-05：以前太陽照到的那一邊，黑眼睛會反光變灰）：永遠是純黑、純白，像畫上去的豆豆眼
const eyeBlack = new THREE.MeshBasicMaterial({ color: 0x1e1724, transparent: true, opacity: 1 });
const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, toneMapped: false });

function makePoints(n, size, color, at) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set(at(i), i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, depthWrite: false }));
}

// ===== 動物的耳朵、翅膀、光環（只有樣子，不影響物理） =====
const ballGeo = new THREE.SphereGeometry(1, 20, 14);
const coneGeo = new THREE.ConeGeometry(1, 1, 20);
const haloGeo = new THREE.TorusGeometry(0.17, 0.024, 10, 32);
const haloMat = new THREE.MeshStandardMaterial({ color: 0xf4c95d, metalness: 0.8, roughness: 0.3, emissive: 0x6a4a10 });
const wingGeos = {};
function wingGeo(kind) {
  if (wingGeos[kind]) return wingGeos[kind];
  // 翅膀的根部在 (0, 0)，往 +x 長出去
  const sh = new THREE.Shape();
  if (kind === 'angel') {
    // 圓圓的羽毛翅膀：上緣一道弧線，下緣三片羽毛
    sh.moveTo(0, 0.05);
    sh.quadraticCurveTo(0.1, 0.34, 0.42, 0.3);
    sh.quadraticCurveTo(0.44, 0.17, 0.33, 0.17);
    sh.quadraticCurveTo(0.35, 0.05, 0.23, 0.07);
    sh.quadraticCurveTo(0.21, -0.05, 0.1, 0.0);
    sh.quadraticCurveTo(0.04, -0.04, 0, 0.05);
  } else {
    // 蝙蝠翅膀：尖尖的骨架，下緣一段一段往內凹
    const pts = [[0.44, 0.3], [0.36, 0.05], [0.2, -0.01], [0, 0.02]];
    sh.moveTo(0, 0.1);
    sh.lineTo(0.14, 0.27);
    sh.lineTo(0.44, 0.3);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      sh.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 0.07, x1, y1);
    }
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -0.01);
  wingGeos[kind] = g;
  return g;
}
const partMat = (color) => furMaterial(new THREE.Color(color), isDark(color));

// 頭上的小東西：甜筒的餅乾筒倒過來變成迷你帽子（納可的點子）、冰棒的木棍
const hatConeGeo = new THREE.ConeGeometry(0.25, 0.44, 24, 1, true);
const hatRimGeo = new THREE.TorusGeometry(0.25, 0.04, 8, 24);
const stickGeo = new THREE.CapsuleGeometry(0.05, 0.22, 4, 10);
let waffleMat = null;
let rimMat = null;
let woodMat = null;
function addHat(g, skin) {
  const H = SLIME_H;
  if (skin.hat === 'cone') {
    if (!waffleMat) {
      waffleMat = new THREE.MeshStandardMaterial({ map: getWaffleTex(), roughness: 0.75, side: THREE.DoubleSide });
      rimMat = new THREE.MeshStandardMaterial({ color: 0xc98a45, roughness: 0.7 });
    }
    const hat = new THREE.Group();
    const cone = new THREE.Mesh(hatConeGeo, waffleMat);
    cone.position.y = 0.22;
    cone.castShadow = true;
    cone.userData.hit = true;
    const rim = new THREE.Mesh(hatRimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    hat.add(cone, rim);
    // 戴歪一點點比較可愛
    hat.position.set(0.12, H - 0.06, -0.02);
    hat.rotation.z = -0.22;
    // 物理那邊只看 g 的直接子物件，所以把錐子放到 g 底下、位置換算好
    hat.updateMatrixWorld(true);
    for (const m of [cone, rim]) {
      m.applyMatrix4(hat.matrix);
      g.add(m);
    }
  } else if (skin.hat === 'stick') {
    if (!woodMat) woodMat = new THREE.MeshStandardMaterial({ color: 0xe3bb80, roughness: 0.8 });
    const st = new THREE.Mesh(stickGeo, woodMat);
    st.scale.set(1, 1, 0.45);
    st.position.set(0, H + 0.1, 0);
    st.castShadow = true;
    st.userData.hit = true;
    g.add(st);
  }
}

// 飲料裡面的東西：冰塊、珍珠、檸檬片、氣泡，還有頭上的吸管。位置每一隻固定（照名字算），不會每次都不一樣
// 冰塊：空心的方框，只有 12 條細細的邊（2026-10-05 納可：實心白白的像豆腐）。
// 12 條邊併成一個形狀、所有飲料共用，顏色不吃光，幾乎不花效能
const cubeGeo = (() => {
  const S = 0.19 / 2;
  const T = 0.011;
  const bars = [];
  for (const a of [-S, S]) for (const b of [-S, S]) {
    bars.push([[S * 2 + T, T, T], [0, a, b]]); // 沿 x
    bars.push([[T, S * 2 + T, T], [a, 0, b]]); // 沿 y
    bars.push([[T, T, S * 2 + T], [a, b, 0]]); // 沿 z
  }
  const pos = [];
  const idx = [];
  for (const [[w, h, d], [x, y, z]] of bars) {
    const bg = new THREE.BoxGeometry(w, h, d);
    const base = pos.length / 3;
    const p = bg.attributes.position;
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i) + x, p.getY(i) + y, p.getZ(i) + z);
    for (const i of bg.index.array) idx.push(base + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
})();
const pearlGeo = new THREE.SphereGeometry(0.05, 12, 8);
const lemonGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.025, 20);
const strawGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.62, 12);
const bobaStrawGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.62, 14);
let cubeMat = null;
let cubeMatLow = null;
// 冰塊的面：低畫質用真的半透明；高、中畫質的飲料本身會透光，裡面的東西要不透明才看得到，
// 所以用「飲料顏色加很多白」的淡色，透過飲料看起來就是被染色的半透明冰塊
const cubeFaceGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
const cubeFaceLow = new THREE.MeshBasicMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0.3, depthWrite: false });
const iceFaceMats = {};
function iceFaceMat(color) {
  return (iceFaceMats[color] ||= new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(1, 1, 1), 0.55) }));
}
const pearlMat = new THREE.MeshStandardMaterial({ color: 0x2c160b, roughness: 0.25 });
const lemonMat = new THREE.MeshStandardMaterial({ color: 0xffe25c, roughness: 0.5, emissive: 0x3a2a00 });
function addDrinkParts(g, skin, fancy) {
  if (!cubeMat) {
    cubeMat = new THREE.MeshBasicMaterial({ color: 0xe8f8ff });
    cubeMatLow = cubeMat;
  }
  let seed = skin.name.length * 7919 + skin.color.charCodeAt(2);
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const H = SLIME_H;
  const inside = (y, pad) => (radiusAt(y / H) * SLIME_R) - pad;
  // 冰塊三顆，浮在上半部
  for (let i = 0; i < 3; i++) {
    const y = H * (0.5 + rnd() * 0.18);
    const a = (i / 3) * Math.PI * 2 + rnd();
    const r = rnd() * Math.max(0, inside(y, 0.2));
    // 一顆冰塊＝半透明的方塊＋亮亮的邊框，兩個一起放在一個小群組裡，慢慢上下浮、輕輕轉
    const c = new THREE.Group();
    c.add(new THREE.Mesh(cubeFaceGeo, fancy ? iceFaceMat(skin.color) : cubeFaceLow), new THREE.Mesh(cubeGeo, cubeMat));
    c.position.set(Math.cos(a) * r, y, Math.sin(a) * r * 0.7 - 0.05);
    c.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    c.userData.bob = { y, phase: rnd() * Math.PI * 2, spin: 0.15 + rnd() * 0.25 };
    g.add(c);
  }
  // 珍珠：立體的珠子浮在飲料裡面，透過飲料看得到；每一顆都離身體表面留一段距離，不會凸出來。
  // 2026-10-05 納可：凸出來很怪；畫成密密麻麻的貼圖更醜；浮在中間最好
  if (skin.pearls) {
    for (let i = 0; i < 18; i++) {
      const y = 0.07 + rnd() * 0.07;       // 沉在最底下，跟外面畫的那一圈疊在一起
      const room = inside(y, 0.1);
      if (room <= 0) continue;
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * room;
      const p = new THREE.Mesh(pearlGeo, pearlMat);
      p.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      g.add(p);
    }
  }
  // 檸檬片：斜斜地泡在裡面
  if (skin.lemon) {
    const l = new THREE.Mesh(lemonGeo, lemonMat);
    l.position.set(-0.2, H * 0.42, 0.05);
    l.rotation.set(1.2, 0.3, 0.5);
    g.add(l);
  }
  // 氣泡：小小的白點
  if (skin.fizz) {
    g.add(makePoints(16, 0.03, 0xffffff, () => {
      const y = H * (0.12 + rnd() * 0.7);
      const a = rnd() * Math.PI * 2;
      const r = rnd() * inside(y, 0.08);
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    }));
  }
  // 吸管：從頭頂斜斜地插進去，珍珠的吸管比較粗
  const st = new THREE.Mesh(skin.pearls ? bobaStrawGeo : strawGeo, new THREE.MeshStandardMaterial({ color: skin.straw, roughness: 0.35 }));
  st.position.set(-0.12, H + 0.14, -0.06);
  st.rotation.set(-0.15, 0, 0.3);
  st.castShadow = true;
  st.userData.hit = true;
  g.add(st);
}

function addAnimalParts(g, skin, bodyMat) {
  const H = SLIME_H;
  const earMat = partMat(skin.ear);
  const part = (geo, mat, [sx, sy, sz], [x, y, z], rz = 0, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    m.rotation.set(0, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  // 大的零件（外耳、翅膀、羽毛）標記起來，物理那邊會幫它們加碰撞盒，才不會穿進硬幣和別的史萊姆
  const hit = (m) => { m.userData.hit = true; return m; };
  for (const side of [-1, 1]) {
    switch (skin.animal) {
      case 'rabbit':
        // 長長的兔耳朵，裡面粉粉的
        hit(part(ballGeo, bodyMat, [0.075, 0.26, 0.05], [side * 0.15, H + 0.12, 0], -side * 0.16));
        part(ballGeo, earMat, [0.042, 0.19, 0.02], [side * 0.157, H + 0.13, 0.035], -side * 0.16);
        break;
      case 'cat':
      case 'bat':
      case 'fox': {
        // 三角形的尖耳朵；狐狸的比較大
        const big = skin.animal === 'fox' ? 1.3 : skin.animal === 'bat' ? 0.85 : 1;
        hit(part(coneGeo, bodyMat, [0.13 * big, 0.24 * big, 0.07 * big], [side * 0.27, H - 0.06 + 0.1 * big, 0], -side * 0.38));
        part(coneGeo, earMat, [0.075 * big, 0.15 * big, 0.03 * big], [side * 0.275, H - 0.07 + 0.09 * big, 0.04 * big], -side * 0.38);
        break;
      }
      case 'dog':
        // 垂下來的狗耳朵
        hit(part(ballGeo, earMat, [0.1, 0.21, 0.05], [side * 0.5, H * 0.74, 0.06], side * 0.32));
        break;
      case 'bear':
      case 'panda':
        // 圓圓的熊耳朵
        hit(part(ballGeo, skin.animal === 'panda' ? earMat : bodyMat, [0.11, 0.11, 0.06], [side * 0.3, H - 0.06, -0.02]));
        if (skin.animal === 'bear') part(ballGeo, earMat, [0.06, 0.06, 0.02], [side * 0.3, H - 0.06, 0.03]);
        break;
    }
    // 翅膀長在背後兩側，往後斜
    if (skin.animal === 'bat' || skin.animal === 'angel') {
      const w = hit(part(wingGeo(skin.animal), skin.animal === 'bat' ? earMat : partMat('#ffffff'), [side * 1.4, 1.4, 1.4], [side * 0.36, H * 0.38, -0.26], 0, side * 0.35));
      w.castShadow = false;
    }
  }
  if (skin.animal === 'peacock') {
    // 孔雀：頭上三根小冠毛，背後一扇羽毛（每根末端一個金色的眼斑）
    const eyeSpot = partMat('#f4c95d');
    const spotCore = partMat('#1d3f9e');
    for (const a of [-0.35, 0, 0.35]) {
      const stalk = part(ballGeo, earMat, [0.012, 0.09, 0.012], [Math.sin(a) * 0.09, H + 0.06, -0.02], -a);
      stalk.castShadow = false;
      part(ballGeo, spotCore, [0.03, 0.03, 0.03], [Math.sin(a) * 0.17, H + 0.15, -0.02]);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.28;                    // 左右張開
      const dir = new THREE.Vector3(Math.sin(a), Math.cos(a), 0);
      const base = new THREE.Vector3(0, H * 0.35, -0.42);
      const f = hit(part(ballGeo, earMat, [0.09, 0.42, 0.025], [0, 0, 0]));
      f.position.copy(base).addScaledVector(dir, 0.4);
      f.rotation.set(-0.35, 0, -a);
      f.castShadow = false;
      const tip = base.clone().addScaledVector(dir, 0.7);
      const spot = part(ballGeo, eyeSpot, [0.07, 0.08, 0.02], [0, 0, 0]);
      spot.position.copy(tip).add(new THREE.Vector3(0, 0, 0.1));
      spot.rotation.set(-0.35, 0, -a);
      const core = part(ballGeo, spotCore, [0.035, 0.04, 0.02], [0, 0, 0]);
      core.position.copy(spot.position).add(new THREE.Vector3(0, 0, 0.012));
      core.rotation.copy(spot.rotation);
    }
  }
  if (skin.animal === 'angel') {
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, H + 0.13, 0);
    g.add(halo);
  }
}

// 耳朵、翅膀的碰撞盒：照模型上標記 hit 的零件，算出每個零件的盒子（大小、位置、方向，都已經乘上整隻的大小）。
// 橢圓、圓錐用盒子包會比較胖，所以縮成八成
export function slimePartBoxes(mesh) {
  const out = [];
  const k = mesh.scale.x;
  for (const ch of mesh.children) {
    if (!ch.userData.hit) continue;
    ch.geometry.computeBoundingBox();
    const bb = ch.geometry.boundingBox;
    const half = bb.getSize(new THREE.Vector3()).multiply(ch.scale).multiplyScalar(0.5 * 0.8 * k);
    half.set(Math.abs(half.x), Math.abs(half.y), Math.abs(half.z));
    const c = bb.getCenter(new THREE.Vector3()).multiply(ch.scale).applyQuaternion(ch.quaternion).add(ch.position).multiplyScalar(k);
    const q = ch.quaternion;
    out.push({ half: [Math.max(half.x, 0.01), Math.max(half.y, 0.01), Math.max(half.z, 0.01)], pos: [c.x, c.y, c.z], rot: { x: q.x, y: q.y, z: q.z, w: q.w } });
  }
  return out;
}

// 做一隻史萊姆娃娃（模型的原點在底部中心，臉朝 +z）
// id 可以是「套.第幾隻」，也可以直接給一個造型（例如轉生動畫的天使）
export function makeSlimeMesh(id, scale, fancy = true) {
  const skin = typeof id === 'string' ? slimeInfo(id).skin : id;
  const g = new THREE.Group();
  let body;
  const geo = faceted(skin) ? getDiamondGeo() : getBodyGeo();
  if (isJelly(skin) && fancy) {
    body = new THREE.Mesh(geo, realJelly(skin));
    body.castShadow = true;
  } else if (isJelly(skin)) {
    const [backMat, frontMat] = jellyLayers(skin);
    const inner = new THREE.Mesh(geo, backMat);
    inner.renderOrder = 1;
    g.add(inner);
    body = new THREE.Mesh(geo, frontMat);
    body.renderOrder = 2;
    body.castShadow = true;
  } else {
    body = new THREE.Mesh(getBodyGeo(), bodyMaterial(skin, fancy));
    body.castShadow = true;
    body.receiveShadow = true;
  }
  g.add(body);
  // 豆豆眼：大多用白的，淺色史萊姆（牛奶、淺色寶石這類）白眼睛看不到才用黑的（2026-10-05 納可定）。
  // 眼睛是貼在表面的扁片，不會凸出來
  const eyeMat = isLight(skin.color, skin.look) ? eyeBlack : eyeWhite;
  const dia = faceted(skin);
  const [lo, hi] = dia ? [DIAMOND[DIA_EYE[0]], DIAMOND[DIA_EYE[1]]] : [];
  const ey = dia ? (lo[1] + hi[1]) / 2 : 0.5;      // 眼睛在身體的哪個高度（0 到 1）
  const er = (dia ? (lo[0] + hi[0]) / 2 : radiusAt(ey)) * SLIME_R;
  const slope = dia
    ? (hi[0] - lo[0]) / (hi[1] - lo[1]) * (SLIME_R / SLIME_H) * Math.cos(Math.PI / FACETS)
    : (radiusAt(ey + 0.02) - radiusAt(ey - 0.02)) / 0.04 * (SLIME_R / SLIME_H);
  for (const side of [-1, 1]) {
    const th = side * 0.27;
    // 鑽石的前面是一片平面，眼睛要往內收到平面上
    const r = dia ? er * Math.cos(Math.PI / FACETS) / Math.cos(th) : er;
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.renderOrder = 3; // 眼睛最後畫，不會被半透明的身體蓋得霧霧的
    eye.scale.set(0.045, 0.07, 0.004);
    const n = dia
      ? new THREE.Vector3(0, -slope, 1).normalize()
      : new THREE.Vector3(Math.sin(th), -slope, Math.cos(th)).normalize();
    eye.position.set(Math.sin(th) * r, ey * SLIME_H, Math.cos(th) * r).addScaledVector(n, 0.002);
    eye.lookAt(eye.position.clone().add(n));
    eye.userData.eyeY = eye.scale.y; // 眨眼時從這個高度壓扁
    g.add(eye);
    // 熊貓：眼睛外面一圈黑眼圈（眼睛改白的）
    if (skin.animal === 'panda') {
      eye.material = eyeWhite;
      eye.scale.set(0.03, 0.045, 0.004);
      eye.userData.eyeY = eye.scale.y;
      const patch = new THREE.Mesh(eyeGeo, eyeBlack);
      patch.renderOrder = 3;
      patch.scale.set(0.085, 0.11, 0.003);
      patch.position.copy(eye.position).addScaledVector(n, -0.001);
      patch.rotation.copy(eye.rotation);
      patch.rotateZ(side * 0.5);
      g.add(patch);
    }
  }
  if (skin.animal) addAnimalParts(g, skin, body.material);
  if (skin.hat) addHat(g, skin);
  if (skin.look === 'drink') addDrinkParts(g, skin, fancy);
  // 夜空：身體裡有幾顆小星星
  if (skin.look === 'night') {
    g.add(makePoints(10, 0.035, 0xfff6d0, () => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.4;
      return [Math.cos(a) * r, 0.1 + Math.random() * 0.4, Math.sin(a) * r];
    }));
  }
  // 傳說：身邊幾點淡淡的閃光
  if (skin.sparkle) {
    const pts = makePoints(8, 0.06, 0xfff2c0, () => {
      const a = Math.random() * Math.PI * 2;
      const r = 0.72 + Math.random() * 0.15;
      return [Math.cos(a) * r, 0.15 + Math.random() * 0.6, Math.sin(a) * r];
    });
    pts.userData.sparkle = true;
    g.add(pts);
  }
  g.scale.setScalar(scale);
  g.userData.skin = skin;
  g.userData.body = body;
  return g;
}



// 眨眼：每隻各自隨機，很偶爾才眨一次（納可：真的很偶爾就好）
const BLINK_MIN = 12;        // 兩次眨眼至少隔幾秒
const BLINK_MAX = 30;        // 最多隔幾秒（檯面上有好幾隻，加起來才不會一直有人在眨）
const BLINK_TIME = 0.15;     // 眨一下幾秒
function blinkAmount(g, time) {
  const u = g.userData;
  if (u.nextBlink === undefined) u.nextBlink = time + BLINK_MIN * Math.random() + 2;
  if (time >= u.nextBlink + BLINK_TIME) {
    // 大約七次裡面一次連眨兩下
    u.nextBlink = Math.random() < 0.15 ? time + 0.12 : time + BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
  }
  const k = (time - u.nextBlink) / BLINK_TIME;
  return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; // 0 張開、1 閉上
}

// 每一幀更新特效（閃光一閃一閃、眨眼）
export function updateSlimeEffects(g, time) {
  const shut = blinkAmount(g, time);
  for (const ch of g.children) {
    if (ch.userData.eyeY) ch.scale.y = ch.userData.eyeY * (1 - shut * 0.88);
    // 飲料裡的冰塊：慢慢上下浮、輕輕轉（只是動畫，不算物理）
    const b = ch.userData.bob;
    if (b) {
      ch.position.y = b.y + Math.sin(time * 1.3 + b.phase) * 0.03;
      ch.rotation.y += b.spin * 0.016;
    }
    if (ch.userData.sparkle) {
      ch.rotation.y = time * 0.6;
      ch.material.opacity = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * 4));
    }
  }
}

// 圖鑑用的小圖（2D）
export function drawSlimeIcon(ctx, id, w, h, owned) {
  const { skin } = slimeInfo(id);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const by = h * 0.88;
  const rw = w * 0.36;
  const rh = h * 0.66;
  if (owned && skin.animal) drawAnimalIcon(ctx, skin, cx, by, rw, rh, w, h); // 耳朵、翅膀先畫，壓在身體後面
  if (owned && skin.look === 'drink') {
    // 吸管：從頭頂斜斜地插出來（畫在身體後面）
    ctx.strokeStyle = skin.straw;
    ctx.lineWidth = w * (skin.pearls ? 0.08 : 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - rw * 0.1, by - rh * 0.8);
    ctx.lineTo(cx - rw * 0.42, by - rh * 1.3);
    ctx.stroke();
  }
  if (owned && skin.hat === 'stick') {
    // 冰棒棍：從頭頂後面冒出來
    ctx.fillStyle = '#e3bb80';
    const sw = w * 0.07;
    ctx.beginPath();
    ctx.roundRect(cx - sw / 2, by - rh * 1.32, sw, rh * 0.5, sw / 2);
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  if (faceted(skin)) {
    // 切面的外框：照鑽石的輪廓畫成多邊形，頂端平平的
    const ring = DIAMOND.slice(1, -1);
    ring.forEach(([r, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, cx - r * rw, by - y * rh));
    for (let i = ring.length - 1; i >= 0; i--) ctx.lineTo(cx + ring[i][0] * rw, by - ring[i][1] * rh);
  } else {
    ctx.moveTo(cx - rw, by);
    ctx.bezierCurveTo(cx - rw * 1.06, by - rh * 0.58, cx - rw * 0.58, by - rh, cx, by - rh);
    ctx.bezierCurveTo(cx + rw * 0.58, by - rh, cx + rw * 1.06, by - rh * 0.58, cx + rw, by);
  }
  ctx.closePath();
  if (!owned) {
    ctx.fillStyle = '#3a3448';
    ctx.fill();
    ctx.fillStyle = '#6d6680';
    ctx.font = `bold ${Math.round(h * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('?', cx, by - rh * 0.3);
    ctx.restore();
    return;
  }
  const base = new THREE.Color(skin.color);
  const light = '#' + base.clone().lerp(new THREE.Color(1, 1, 1), 0.45).getHexString();
  const dark = '#' + base.clone().multiplyScalar(0.7).getHexString();
  const g = ctx.createLinearGradient(0, by - rh, 0, by);
  if (skin.look === 'diamond') {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#cfe9ff');
    g.addColorStop(1, '#f6d6ff');
  } else if (skin.look === 'drink' && skin.grad) {
    skin.grad.forEach((c, i) => g.addColorStop(i / (skin.grad.length - 1), c));
  } else if (skin.look === 'swirl') {
    ['#ffd1dc', '#ffe5c2', '#fff6c2', '#d8f5d0', '#cdeeff', '#e2d6ff'].forEach((c, i) => g.addColorStop(i / 5, c));
  } else if (skin.look === 'ice') {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#bfe6ff');
  } else if (skin.look === 'rainbow') {
    ['#ffb3c1', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#d7b8ff'].forEach((c, i) => g.addColorStop(i / 6, c));
  } else if (skin.look === 'gem') {
    g.addColorStop(0, light);
    g.addColorStop(1, dark);
  } else {
    g.addColorStop(0, light);
    g.addColorStop(1, skin.look === 'metal' || skin.look === 'pearl' ? dark : skin.color);
  }
  if (skin.look === 'bismuth') {
    g.addColorStop(0, '#7fd3ff');
    g.addColorStop(0.35, '#b07cff');
    g.addColorStop(0.7, '#f4c95d');
    g.addColorStop(1, '#5fd39a');
  }
  ctx.fillStyle = g;
  const clear = isJelly(skin);
  ctx.globalAlpha = clear ? 0.82 : 1;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.clip();
  if (skin.look === 'twotone') {
    ctx.fillStyle = skin.color2;
    ctx.fillRect(0, 0, w, by - rh * 0.6);
  } else if (skin.look === 'drink') {
    // 冰塊、珍珠、檸檬片、黑糖紋
    if (skin.tiger) {
      ctx.strokeStyle = 'rgba(110, 52, 16, 0.5)';
      ctx.lineWidth = w * 0.035;
      ctx.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const x0 = cx - rw * 0.9 + k * rw * 0.45;
        ctx.beginPath();
        ctx.moveTo(x0, by - rh * 0.5);
        ctx.quadraticCurveTo(x0 + rw * 0.12, by - rh * 0.25, x0 + rw * 0.05, by);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(240, 250, 255, 0.9)';
    ctx.lineWidth = Math.max(1, w * 0.012);
    [[-0.35, 0.62, 0.3], [0.2, 0.7, -0.4], [0.45, 0.5, 0.2]].forEach(([dx, dy, rot]) => {
      ctx.save();
      ctx.translate(cx + dx * rw, by - dy * rh);
      ctx.rotate(rot);
      ctx.strokeRect(-w * 0.045, -w * 0.045, w * 0.09, w * 0.09);
      ctx.restore();
    });
    if (skin.lemon) {
      ctx.fillStyle = '#ffe25c';
      ctx.beginPath();
      ctx.arc(cx - rw * 0.5, by - rh * 0.3, w * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    if (skin.pearls) {
      ctx.fillStyle = '#2c160b';
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.arc(cx - rw * 0.75 + k * rw * 0.25, by - h * 0.04, w * 0.028, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (skin.look === 'shaved') {
    // 糖漿和配料
    ctx.fillStyle = skin.color2;
    ctx.fillRect(0, 0, w, by - rh * 0.68);
    ctx.fillStyle = skin.topping;
    for (let i = 0; i < 7; i++) ctx.fillRect(cx - rw * 0.6 + Math.random() * rw * 1.2, by - rh * 0.98 + Math.random() * rh * 0.2, 3, 3);
  } else if (skin.look === 'scoop') {
    ctx.fillStyle = skin.speck;
    for (let i = 0; i < 12; i++) ctx.fillRect(cx - rw * 0.8 + Math.random() * rw * 1.6, by - rh * 0.9 + Math.random() * rh * 0.8, 2, 1.5);
  } else if (skin.look === 'flake') {
    ctx.fillStyle = '#e9c46a';
    for (let i = 0; i < 14; i++) ctx.fillRect(cx - rw + Math.random() * rw * 2, by - rh + Math.random() * rh * 0.6, 2, 2);
  } else if (skin.look === 'night') {
    ctx.fillStyle = '#fff6d0';
    for (let i = 0; i < 6; i++) ctx.fillRect(cx - rw * 0.6 + Math.random() * rw * 1.2, by - rh * 0.7 + Math.random() * rh * 0.6, 2, 2);
  }
  // 頭頂一道反光
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx + rw * 0.35, by - rh * 0.78, rw * 0.18, rh * 0.06, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const panda = skin.animal === 'panda';
  for (const s of [-1, 1]) {
    if (panda) {
      ctx.fillStyle = '#2a2628';
      ctx.beginPath();
      ctx.ellipse(cx + s * rw * 0.3, by - rh * 0.45, w * 0.06, h * 0.085, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = panda || !isLight(skin.color, skin.look) ? '#ffffff' : '#1e1724';
    ctx.beginPath();
    ctx.ellipse(cx + s * rw * 0.3, by - rh * 0.45, w * 0.032 * (panda ? 0.7 : 1), h * 0.055 * (panda ? 0.7 : 1), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (skin.hat === 'cone') {
    // 甜筒餅乾帽：歪歪地戴在頭上
    ctx.save();
    ctx.translate(cx + rw * 0.18, by - rh * 0.95);
    ctx.rotate(0.22);
    const hw = rw * 0.32;
    const hh = rh * 0.5;
    ctx.fillStyle = '#e0a85e';
    ctx.beginPath();
    ctx.moveTo(-hw, 0);
    ctx.lineTo(0, -hh);
    ctx.lineTo(hw, 0);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = '#a8692c';
    ctx.lineWidth = 1;
    for (let k = -4; k <= 4; k++) {
      ctx.beginPath(); ctx.moveTo(k * hw * 0.4 - hh, -hh); ctx.lineTo(k * hw * 0.4 + hh, hh * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k * hw * 0.4 + hh, -hh); ctx.lineTo(k * hw * 0.4 - hh, hh * 0.2); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#c98a45';
    ctx.beginPath();
    ctx.ellipse(0, 0, hw * 1.05, hh * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (skin.animal === 'angel') {
    ctx.strokeStyle = '#f4c95d';
    ctx.lineWidth = Math.max(2, h * 0.03);
    ctx.beginPath();
    ctx.ellipse(cx, by - rh * 1.08, rw * 0.42, rh * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// 圖鑑小圖的耳朵、翅膀（畫在身體後面）
function drawAnimalIcon(ctx, skin, cx, by, rw, rh, w, h) {
  const top = by - rh;
  const blob = (color, x, y, ex, ey, rot = 0) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, ex, ey, rot, 0, Math.PI * 2);
    ctx.fill();
  };
  const tri = (color, x, y, bw, th, tilt) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - bw, y);
    ctx.lineTo(x + tilt, y - th);
    ctx.lineTo(x + bw, y);
    ctx.closePath();
    ctx.fill();
  };
  for (const s of [-1, 1]) {
    switch (skin.animal) {
      case 'rabbit':
        blob(skin.color, cx + s * rw * 0.25, top - rh * 0.12, rw * 0.13, rh * 0.32, s * 0.15);
        blob(skin.ear, cx + s * rw * 0.25, top - rh * 0.1, rw * 0.06, rh * 0.22, s * 0.15);
        break;
      case 'cat':
      case 'bat':
      case 'fox': {
        const big = skin.animal === 'fox' ? 1.3 : skin.animal === 'bat' ? 0.85 : 1;
        tri(skin.color, cx + s * rw * 0.45, top + rh * 0.16, rw * 0.2 * big, rh * 0.36 * big, s * rw * 0.12);
        tri(skin.ear, cx + s * rw * 0.45, top + rh * 0.14, rw * 0.1 * big, rh * 0.24 * big, s * rw * 0.08);
        break;
      }
      case 'dog':
        blob(skin.ear, cx + s * rw * 0.72, top + rh * 0.3, rw * 0.16, rh * 0.26, s * 0.5);
        break;
      case 'bear':
      case 'panda':
        blob(skin.animal === 'panda' ? skin.ear : skin.color, cx + s * rw * 0.5, top + rh * 0.1, rw * 0.2, rw * 0.2);
        if (skin.animal === 'bear') blob(skin.ear, cx + s * rw * 0.5, top + rh * 0.1, rw * 0.1, rw * 0.1);
        break;
    }
    if (skin.animal === 'bat' || skin.animal === 'angel') {
      blob(skin.animal === 'bat' ? skin.ear : '#ffffff', cx + s * rw * 1.05, by - rh * 0.55, rw * 0.38, rh * 0.2, -s * 0.5);
    }
  }
  if (skin.animal === 'peacock') {
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.32;
      const tx = cx + Math.sin(a) * rh * 0.95;
      const ty = by - rh * 0.35 - Math.cos(a) * rh * 0.95;
      blob(skin.ear, (cx + tx) / 2, (by - rh * 0.35 + ty) / 2, rw * 0.13, rh * 0.5, a);
      blob('#f4c95d', tx, ty, rw * 0.12, rw * 0.12);
      blob('#1d3f9e', tx, ty, rw * 0.06, rw * 0.06);
    }
  }
}
