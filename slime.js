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
//       cream 甜點（霧面奶油感）、twotone 上下雙色甜點、flake 金箔巧克力、metal 金屬、pearl 珍珠、bismuth 鉍（彩虹光澤的金屬）
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
  const see = look === 'jelly' || look === 'gem';
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

const isJelly = (skin) => ['jelly', 'night', 'rainbow', 'diamond', 'gem'].includes(skin.look);

// 整體走微微霧面：粗糙度高一點、亮面塗層淡一點，反光不要太刺
function bodyMaterial(skin, fancy) {
  const color = new THREE.Color(skin.color);
  switch (skin.look) {
    case 'cream':
      // 深色的不加絨光，不然會變灰灰的；淺色的絨光用自己的顏色，不然整隻會被洗白
      if (isDark(skin.color)) return new THREE.MeshPhysicalMaterial({ color, roughness: 0.65 });
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.7, sheen: 0.3, sheenColor: color.clone().lerp(new THREE.Color(1, 1, 1), 0.4) });
    case 'twotone':
      return new THREE.MeshPhysicalMaterial({ map: twotoneTexture(skin), roughness: 0.62, sheen: 0.2 });
    case 'flake':
      return new THREE.MeshPhysicalMaterial({ map: flakeTexture(skin), roughness: 0.6, clearcoat: 0.15 });
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
const partMat = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.7, sheen: 0.25, sheenColor: new THREE.Color(color) });

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
