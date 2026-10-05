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

// look：jelly 半透明果凍、night 夜空（半透明裡有小星星）、diamond 鑽石、
//       cream 甜點（霧面奶油感）、twotone 上下雙色甜點、flake 金箔巧克力、metal 金屬、pearl 珍珠
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
      { name: '鑽石史萊姆', look: 'diamond', color: '#ffffff', sparkle: true },
    ],
  },
  {
    id: 'sweets',
    name: '甜點',
    unlock: { set: 'jelly', kinds: 6 },
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
    id: 'metal',
    name: '金屬',
    unlock: { set: 'sweets', kinds: 6 },
    skins: [
      { name: '銅史萊姆', look: 'metal', color: '#c97d4c' },
      { name: '鐵史萊姆', look: 'metal', color: '#8d9299' },
      { name: '青銅史萊姆', look: 'metal', color: '#7f9a5c' },
      { name: '銀史萊姆', look: 'metal', color: '#dfe3e8' },
      { name: '鈦藍史萊姆', look: 'metal', color: '#82a0cf' },
      { name: '玫瑰金史萊姆', look: 'metal', color: '#eaa898' },
      { name: '黑鐵史萊姆', look: 'metal', color: '#3c3e43' },
      { name: '紫鈦史萊姆', look: 'metal', color: '#8a6fd1' },
      { name: '黑珍珠史萊姆', look: 'pearl', color: '#2e2a3a' },
      { name: '黃金史萊姆', look: 'metal', color: '#f4c95d', sparkle: true },
    ],
  },
];

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
function radiusAt(y) {
  for (let i = 1; i < PROFILE.length; i++) {
    const [r0, y0] = PROFILE[i - 1];
    const [r1, y1] = PROFILE[i];
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
  const pts = [];
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [r0, y0] = PROFILE[i];
    const [r1, y1] = PROFILE[i + 1];
    for (let k = 0; k < 3; k++) {
      const t = k / 3;
      pts.push(new THREE.Vector2((r0 + (r1 - r0) * t) * SLIME_R, (y0 + (y1 - y0) * t) * SLIME_H));
    }
  }
  pts.push(new THREE.Vector2(0, PROFILE[PROFILE.length - 1][1] * SLIME_H));
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

// 假的半透明（低畫質用）：一般的半透明（後面的金幣會透出來），再加「邊緣濃、中間透」，
// 看起來像有厚度的果凍。比真正的透光計算省很多效能。
function fakeJelly(color, { center = 0.38, edge = 0.93, glow = 0.12, rough = 0.42, back = false } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: 0, transparent: true, depthWrite: false,
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
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.35, clearcoat: 0.2, clearcoatRoughness: 0.5,
    transmission: 0.92, thickness: 0.7, ior: 1.33,
    attenuationColor: color, attenuationDistance: skin.look === 'night' ? 0.35 : 0.9,
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
  const night = skin.look === 'night';
  return [
    fakeJelly(color.clone().multiplyScalar(0.7), { center: night ? 0.6 : 0.35, edge: 0.6, glow: 0.05, back: true }),
    fakeJelly(color, { center: night ? 0.6 : 0.44, edge: 0.95, glow: night ? 0.05 : 0.14 }),
  ];
}

const isJelly = (skin) => skin.look === 'jelly' || skin.look === 'night' || skin.look === 'diamond';

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
    case 'metal':
    default:
      return new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.5 });
  }
}

const eyeGeo = new THREE.SphereGeometry(1, 16, 12);
// 眼睛設成「半透明但其實不透明」，才能排在半透明的身體後面畫
const eyeBlack = new THREE.MeshStandardMaterial({ color: 0x1e1724, roughness: 0.35, transparent: true, opacity: 1 });
const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, transparent: true, opacity: 1 });

function makePoints(n, size, color, at) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set(at(i), i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, depthWrite: false }));
}

// 做一隻史萊姆娃娃（模型的原點在底部中心，臉朝 +z）
export function makeSlimeMesh(id, scale, fancy = true) {
  const { skin } = slimeInfo(id);
  const g = new THREE.Group();
  let body;
  const geo = skin.look === 'diamond' ? getDiamondGeo() : getBodyGeo();
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
  // 豆豆眼：深色史萊姆用白的。眼睛是貼在表面的扁片，不會凸出來
  const eyeMat = isDark(skin.color) ? eyeWhite : eyeBlack;
  const dia = skin.look === 'diamond';
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
    g.add(eye);
  }
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


// 每一幀更新特效（閃光一閃一閃）
export function updateSlimeEffects(g, time) {
  for (const ch of g.children) {
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
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - rw, by);
  ctx.bezierCurveTo(cx - rw * 1.06, by - rh * 0.58, cx - rw * 0.58, by - rh, cx, by - rh);
  ctx.bezierCurveTo(cx + rw * 0.58, by - rh, cx + rw * 1.06, by - rh * 0.58, cx + rw, by);
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
  } else {
    g.addColorStop(0, light);
    g.addColorStop(1, skin.look === 'metal' || skin.look === 'pearl' ? dark : skin.color);
  }
  ctx.fillStyle = g;
  const clear = skin.look === 'jelly' || skin.look === 'night' || skin.look === 'diamond';
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
  ctx.fillStyle = isDark(skin.color) ? '#ffffff' : '#1e1724';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * rw * 0.3, by - rh * 0.45, w * 0.032, h * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
