// 小寶物（2026-10-05 納可定）：藍色菱形寶石 20、粉色橢圓寶石 30、珍珠 40。
// 寶石的切面做法跟寶石史萊姆一樣：一圈一圈的點，上下兩段錯開半格切出三角形的星形面，每一面都是平的。
// 這裡只管長相（形狀、材質）；物理和規則在 app.js。
import * as THREE from '../lib/three.module.js';

// float 是推下去時跳出來的「+20」的顏色
export const TREASURES = {
  blue: { name: '藍寶石', value: 20, color: '#2f6bff', float: '#8fbcff' },
  pink: { name: '粉寶石', value: 30, color: '#ff86c0', float: '#ffa3cc' },
  pearl: { name: '珍珠', value: 40, color: '#f8ece8', float: '#fff3e2' },
};
export const TREASURE_ORDER = ['blue', 'pink', 'pearl']; // 解鎖順序（照價值）
export const PEARL_R = 0.22; // 珍珠的半徑（金幣半徑 0.5）

// 切面形狀：rings 每一圈 [半徑, 高度, 錯開半格(0 或 0.5)]，半徑和高度都以 1 為單位。
// n 是一圈幾個點，sx、sz 是左右、前後的大小（不一樣就是橢圓或菱形），h 是高度，start 是第一個點的角度
function facetedGeo(rings, n, sx, sz, h, start) {
  const ring = ([r, y, off], j) => {
    const a = ((j + off) * 2 * Math.PI) / n + start;
    return new THREE.Vector3(Math.sin(a) * r * sx, y * h, Math.cos(a) * r * sz);
  };
  const mid = new THREE.Vector3(0, h * 0.45, 0);
  const pos = [];
  const tri = (a, b, c) => {
    const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (nrm.lengthSq() < 1e-12) return;
    const out = a.clone().add(b).add(c).divideScalar(3).sub(mid);
    if (nrm.dot(out) < 0) [b, c] = [c, b];
    for (const v of [a, b, c]) pos.push(v.x, v.y, v.z);
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i];
    const B = rings[i + 1];
    for (let j = 0; j < n; j++) {
      const a0 = ring(A, j), a1 = ring(A, j + 1), b0 = ring(B, j), b1 = ring(B, j + 1);
      if (B[2] >= A[2]) { tri(a0, a1, b0); tri(b0, a1, b1); }
      else { tri(b0, b1, a0); tri(a0, b1, a1); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.translate(0, -h / 2, 0); // 原點放在中間，物理比較好算
  return g;
}

const geos = {};
export function treasureGeo(kind) {
  if (geos[kind]) return geos[kind];
  if (kind === 'blue') {
    // 菱形：一圈 4 個點，尖端朝左右和前後；平底、腰帶、星形面、平的檯面。比金幣小一點
    geos.blue = facetedGeo([
      [0, 0, 0], [0.45, 0, 0], [0.62, 0.2, 0.5], [1, 0.4, 0], [1, 0.5, 0],
      [0.6, 0.78, 0.5], [0.42, 1, 0], [0, 1, 0],
    ], 4, 0.44, 0.31, 0.3, 0);
  } else if (kind === 'pink') {
    // 橢圓明亮式切面：一圈 10 個面，很小顆
    geos.pink = facetedGeo([
      [0, 0, 0], [0.55, 0, 0], [0.9, 0.16, 0.5], [1, 0.34, 0], [0.97, 0.5, 0],
      [0.78, 0.74, 0.5], [0.52, 0.92, 0], [0, 0.92, 0],
    ], 10, 0.25, 0.18, 0.24, -Math.PI / 10);
  } else {
    geos.pearl = new THREE.SphereGeometry(PEARL_R, 40, 28);
  }
  return geos[kind];
}

const mats = {};
// fancy：高、中畫質（真的透光、彩虹光澤）；低畫質用便宜的材質，切面一樣看得到
export function treasureMaterial(kind, fancy) {
  const key = `${kind}.${fancy ? 1 : 0}`;
  if (mats[key]) return mats[key];
  const c = new THREE.Color(TREASURES[kind].color);
  let m;
  if (kind === 'pearl') {
    m = fancy
      ? new THREE.MeshPhysicalMaterial({
        // 珍珠：暖白、帶一點粉，表面一層彩虹光澤
        color: c, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05,
        iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 650],
        sheen: 0.8, sheenRoughness: 0.4, sheenColor: new THREE.Color('#ffc9de'),
      })
      : new THREE.MeshPhongMaterial({ color: c, shininess: 90, specular: new THREE.Color('#d8e6ff'), emissive: new THREE.Color('#3a2630') });
  } else {
    m = fancy
      ? new THREE.MeshPhysicalMaterial({
        color: c.clone().lerp(new THREE.Color(1, 1, 1), 0.25), roughness: 0.02, transmission: 1, thickness: 0.5,
        ior: 1.77, dispersion: 3, specularIntensity: 1,
        attenuationColor: c, attenuationDistance: 1.4,
        emissive: c, emissiveIntensity: 0.3, // 小小一顆也看得出顏色，深色的藍也不會黑掉
      })
      // 低畫質：每一面都有自己的亮點，切面才看得出來
      : new THREE.MeshPhongMaterial({ color: c, shininess: 140, specular: new THREE.Color('#ffffff'), emissive: c.clone().multiplyScalar(0.28) });
  }
  mats[key] = m;
  return m;
}
