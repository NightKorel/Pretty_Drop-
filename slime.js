// 史萊姆娃娃：外型、花色、特效，和圖鑑用的小圖。
// 全部用程式做，不用畫圖。新增一種娃娃只要在 SLIME_VARIANTS 加一筆。
import * as THREE from './lib/three.module.js';

// 稀有度：推下去拿到的幣、圖鑑上的顏色
export const RARITY = {
  common: { name: '普通', reward: 40, color: '#c9c2d6' },
  rare: { name: '稀有', reward: 100, color: '#7ec8ff' },
  legend: { name: '傳說', reward: 300, color: '#f4c95d' },
};

// look：solid 純色、dots 點點、stripes 條紋、twotone 上下雙色、jelly 果凍、gold 金屬金、rainbow 彩虹
export const SLIME_VARIANTS = [
  { id: 'green', name: '草地史萊姆', rarity: 'common', look: 'solid', color: '#7fd67a' },
  { id: 'blue', name: '水滴史萊姆', rarity: 'common', look: 'solid', color: '#6fb7ff' },
  { id: 'pink', name: '櫻花史萊姆', rarity: 'common', look: 'solid', color: '#ff9fc4' },
  { id: 'yellow', name: '檸檬史萊姆', rarity: 'common', look: 'solid', color: '#ffe36e' },
  { id: 'purple', name: '葡萄史萊姆', rarity: 'common', look: 'solid', color: '#b48cff' },
  { id: 'white', name: '麻糬史萊姆', rarity: 'common', look: 'solid', color: '#f4f1ea' },
  { id: 'strawberry', name: '草莓史萊姆', rarity: 'rare', look: 'dots', color: '#ff6f8e', color2: '#fff4f6' },
  { id: 'mint', name: '薄荷巧克力史萊姆', rarity: 'rare', look: 'twotone', color: '#9ff0d0', color2: '#6b4430' },
  { id: 'candy', name: '糖果條紋史萊姆', rarity: 'rare', look: 'stripes', color: '#ffffff', color2: '#ff7aa8' },
  { id: 'jelly', name: '果凍史萊姆', rarity: 'rare', look: 'jelly', color: '#7ff0ff' },
  { id: 'gold', name: '黃金史萊姆', rarity: 'legend', look: 'gold', color: '#f4c95d', sparkle: true },
  { id: 'rainbow', name: '彩虹史萊姆', rarity: 'legend', look: 'rainbow', color: '#ff7a7a', sparkle: true },
];
export const VARIANT_BY_ID = Object.fromEntries(SLIME_VARIANTS.map((v) => [v.id, v]));

// 史萊姆的側面輪廓（半徑 r、高度 y，都以 1 為單位）：底部平、上面圓
const PROFILE = [
  [0, 0], [0.82, 0], [0.95, 0.04], [1.0, 0.14], [0.99, 0.3], [0.93, 0.48],
  [0.82, 0.64], [0.66, 0.78], [0.46, 0.89], [0.24, 0.96], [0, 0.99],
];
export const SLIME_R = 0.62;   // 標準大小的半徑
export const SLIME_H = 0.62;   // 標準大小的高度

// 物理用的外形點（繞一圈），大小用 scale 調
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
  // 輪廓切細一點，表面比較圓滑
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [r0, y0] = PROFILE[i];
    const [r1, y1] = PROFILE[i + 1];
    for (let k = 0; k < 3; k++) {
      const t = k / 3;
      pts.push(new THREE.Vector2((r0 + (r1 - r0) * t) * SLIME_R, (y0 + (y1 - y0) * t) * SLIME_H));
    }
  }
  pts.push(new THREE.Vector2(0, PROFILE[PROFILE.length - 1][1] * SLIME_H));
  bodyGeo = new THREE.LatheGeometry(pts, 40);
  bodyGeo.computeVertexNormals();
  return bodyGeo;
}

function patternTexture(v) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = v.color;
  ctx.fillRect(0, 0, 256, 128);
  if (v.look === 'dots') {
    ctx.fillStyle = v.color2;
    for (let y = 8; y < 128; y += 22) {
      for (let x = (y / 22) % 2 ? 0 : 16; x < 256; x += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (v.look === 'stripes') {
    ctx.fillStyle = v.color2;
    for (let y = 0; y < 128; y += 24) ctx.fillRect(0, y, 256, 11);
  } else if (v.look === 'twotone') {
    // 下面薄荷、上面巧克力（像淋醬），交界有一點波浪（貼圖的上方對應史萊姆的頭頂）
    ctx.fillStyle = v.color2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, 46 + Math.sin(x / 14) * 9);
    ctx.lineTo(256, 0);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function bodyMaterial(v) {
  if (v.look === 'gold') {
    return new THREE.MeshStandardMaterial({ color: v.color, metalness: 1, roughness: 0.22 });
  }
  if (v.look === 'jelly') {
    return new THREE.MeshPhysicalMaterial({
      color: v.color, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.72,
    });
  }
  const opts = { color: '#ffffff', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 };
  if (v.look === 'solid' || v.look === 'rainbow') opts.color = v.color;
  else opts.map = patternTexture(v);
  if (v.look === 'rainbow') opts.emissive = new THREE.Color(v.color).multiplyScalar(0.25);
  return new THREE.MeshPhysicalMaterial(opts);
}

const eyeMat = new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 0.3 });
const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.55 });
const eyeGeo = new THREE.SphereGeometry(1, 16, 12);

// 做一隻史萊姆娃娃（模型的原點在底部中心）
export function makeSlimeMesh(v, scale) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(getBodyGeo(), bodyMaterial(v));
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // 眼睛（臉朝 +z）
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.scale.set(0.055, 0.085, 0.04);
    eye.position.set(side * 0.17, 0.3, 0.55);
    eye.lookAt(side * 0.17 * 3, 0.3, 3);
    g.add(eye);
    const dot = new THREE.Mesh(eyeGeo, shineMat);
    dot.scale.set(0.018, 0.022, 0.01);
    dot.position.set(side * 0.17 + 0.02, 0.33, 0.585);
    g.add(dot);
    const cheek = new THREE.Mesh(eyeGeo, cheekMat);
    cheek.scale.set(0.07, 0.04, 0.02);
    cheek.position.set(side * 0.32, 0.22, 0.5);
    cheek.lookAt(side * 0.32 * 3, 0.22, 3);
    g.add(cheek);
  }
  // 頭頂的反光
  const shine = new THREE.Mesh(eyeGeo, shineMat);
  shine.scale.set(0.11, 0.04, 0.06);
  shine.position.set(0.2, 0.52, 0.28);
  shine.rotation.set(-0.6, 0.5, -0.4);
  g.add(shine);
  // 傳說級：身邊有閃光粒子
  if (v.sparkle) {
    const n = 14;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.25;
      pos.set([Math.cos(a) * r, 0.1 + Math.random() * 0.8, Math.sin(a) * r], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xfff2b0, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false,
    }));
    pts.userData.sparkle = true;
    g.add(pts);
  }
  g.scale.setScalar(scale);
  g.userData.variant = v;
  g.userData.body = body;
  return g;
}

// 每一幀更新特效（彩虹變色、閃光一閃一閃）
export function updateSlimeEffects(g, time) {
  const v = g.userData.variant;
  if (v.look === 'rainbow') {
    const c = g.userData.body.material.color;
    c.setHSL((time * 0.15) % 1, 0.75, 0.68);
    g.userData.body.material.emissive.copy(c).multiplyScalar(0.25);
  }
  for (const ch of g.children) {
    if (ch.userData.sparkle) {
      ch.rotation.y = time * 0.8;
      ch.material.opacity = 0.55 + 0.45 * Math.sin(time * 6);
    }
  }
}

// 圖鑑用的小圖（2D）
export function drawSlimeIcon(ctx, v, w, h, owned) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const by = h * 0.86;
  const rw = w * 0.38;
  const rh = h * 0.62;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - rw, by);
  ctx.bezierCurveTo(cx - rw * 1.05, by - rh * 0.55, cx - rw * 0.6, by - rh, cx, by - rh);
  ctx.bezierCurveTo(cx + rw * 0.6, by - rh, cx + rw * 1.05, by - rh * 0.55, cx + rw, by);
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
  let fill = v.color;
  if (v.look === 'rainbow') {
    const g = ctx.createLinearGradient(cx - rw, 0, cx + rw, 0);
    ['#ff7a7a', '#ffd36e', '#7fd67a', '#6fb7ff', '#b48cff'].forEach((c, i) => g.addColorStop(i / 4, c));
    fill = g;
  } else if (v.look === 'gold') {
    const g = ctx.createLinearGradient(0, by - rh, 0, by);
    g.addColorStop(0, '#fff1b8');
    g.addColorStop(1, '#c99a2e');
    fill = g;
  }
  ctx.fillStyle = fill;
  ctx.globalAlpha = v.look === 'jelly' ? 0.8 : 1;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.clip();
  if (v.look === 'dots') {
    ctx.fillStyle = v.color2;
    for (let y = by - rh; y < by; y += h * 0.13) {
      for (let x = cx - rw; x < cx + rw; x += w * 0.14) {
        ctx.beginPath();
        ctx.arc(x + ((y / (h * 0.13)) % 2) * w * 0.07, y, w * 0.025, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (v.look === 'stripes') {
    ctx.fillStyle = v.color2;
    for (let y = by - rh; y < by; y += h * 0.14) ctx.fillRect(0, y, w, h * 0.065);
  } else if (v.look === 'twotone') {
    ctx.fillStyle = v.color2;
    ctx.fillRect(0, 0, w, by - rh * 0.55);
  }
  ctx.restore();
  // 眼睛
  ctx.fillStyle = '#241a2e';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * rw * 0.3, by - rh * 0.45, w * 0.035, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
