// 硬幣的外觀：幣面浮雕（史萊姆＋閃亮＋外圈）和側邊直紋。
// 只是貼在表面的皮，物理還是一個扁圓柱，不會多算。
import * as THREE from './lib/three.module.js';

const SIZE = 256;

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// 幣面的高度：0 最低，1 最高。x、y 從 -1 到 1，y 往下是正。
function faceHeight(x, y) {
  const r = Math.hypot(x, y);
  let h = 0.3; // 底面

  // 外圈凸起，邊緣圓滑
  const rim = smoothstep(0.8, 0.86, r) * (1 - smoothstep(0.95, 1.0, r));
  h = Math.max(h, 0.3 + 0.5 * rim);

  // 內圈一圈小圓點（像真硬幣的珠圈）
  const beadR = 0.74;
  if (Math.abs(r - beadR) < 0.04) {
    const ang = Math.atan2(y, x);
    const n = 48;
    const a = Math.round((ang / (Math.PI * 2)) * n) / n * Math.PI * 2;
    const d = Math.hypot(x - Math.cos(a) * beadR, y - Math.sin(a) * beadR);
    h = Math.max(h, 0.3 + 0.28 * (1 - smoothstep(0.012, 0.026, d)));
  }

  // 史萊姆：上面圓、下面比較扁平
  const sx = x / 0.5;
  const syRaw = y - 0.16;
  const sy = syRaw < 0 ? syRaw / 0.42 : syRaw / 0.27;
  const p = syRaw < 0 ? 2 : 3.2;
  const d = Math.pow(Math.pow(Math.abs(sx), p) + Math.pow(Math.abs(sy), p), 1 / p);
  if (d < 1.04) {
    const edge = 1 - smoothstep(0.96, 1.04, d);
    let sh = 0.3 + (0.22 + 0.3 * Math.sqrt(Math.max(0, 1 - d * d))) * edge;
    // 眼睛凹進去
    for (const ex of [-0.17, 0.17]) {
      const ed = Math.hypot((x - ex) / 0.055, (y - 0.12) / 0.085);
      sh -= 0.6 * (1 - smoothstep(0.75, 1.1, ed)) * edge;
    }
    // 身上一小塊反光（微微凸起）
    const hd = Math.hypot((x - 0.24) / 0.07, (y + 0.02) / 0.045);
    sh += 0.08 * (1 - smoothstep(0.6, 1, hd)) * edge;
    h = Math.max(h, sh);
  }

  // 閃亮：四角星，中心最高
  h = Math.max(h, sparkle(x, y, -0.36, -0.26, 0.26, 1.0));
  h = Math.max(h, sparkle(x, y, 0.4, -0.42, 0.1, 0.8));
  h = Math.max(h, sparkle(x, y, -0.5, 0.18, 0.07, 0.7));
  return h;
}

function sparkle(x, y, cx, cy, s, peak) {
  const ax = Math.abs(x - cx);
  const ay = Math.abs(y - cy);
  const f = (Math.sqrt(ax) + Math.sqrt(ay)) / Math.sqrt(s);
  if (f >= 1.05) return 0;
  const edge = 1 - smoothstep(0.95, 1.05, f);
  return (0.4 + (peak - 0.4) * Math.pow(1 - Math.min(1, f), 0.7)) * edge;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// 從高度算出法線圖（讓光照出凹凸）
function normalFromHeight(hmap, w, h, strength, wrapX = false) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const at = (x, y) => {
    if (wrapX) x = (x + w) % w; else x = Math.min(w - 1, Math.max(0, x));
    y = Math.min(h - 1, Math.max(0, y));
    return hmap[y * w + x];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function texture(canvas, srgb = false) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeCoinMaterials() {
  // 幣面
  const hmap = new Float32Array(SIZE * SIZE);
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x = ((px + 0.5) / SIZE) * 2 - 1;
      const y = ((py + 0.5) / SIZE) * 2 - 1;
      hmap[py * SIZE + px] = faceHeight(x, y);
    }
  }
  const color = makeCanvas(SIZE, SIZE);
  const rough = makeCanvas(SIZE, SIZE);
  const cctx = color.getContext('2d');
  const rctx = rough.getContext('2d');
  const cimg = cctx.createImageData(SIZE, SIZE);
  const rimg = rctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const h = hmap[i];
    // 凸的地方亮、凹的地方暗，遠看也認得出圖案
    const k = 0.62 + 0.5 * h;
    cimg.data[i * 4] = Math.min(255, 240 * k);
    cimg.data[i * 4 + 1] = Math.min(255, 190 * k);
    cimg.data[i * 4 + 2] = Math.min(255, 80 * k * k);
    cimg.data[i * 4 + 3] = 255;
    // 凸的地方被摸得很亮（光滑），凹的地方霧霧的
    const r = Math.max(0.12, 0.62 - 0.5 * h) * 255;
    rimg.data[i * 4] = r;
    rimg.data[i * 4 + 1] = r;
    rimg.data[i * 4 + 2] = r;
    rimg.data[i * 4 + 3] = 255;
  }
  cctx.putImageData(cimg, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  const face = new THREE.MeshStandardMaterial({
    map: texture(color, true),
    normalMap: texture(normalFromHeight(hmap, SIZE, SIZE, 7)),
    roughnessMap: texture(rough),
    roughness: 1,
    metalness: 0.85,
  });

  // 側邊直紋
  const SW = 256;
  const SH = 8;
  const smap = new Float32Array(SW * SH);
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) smap[y * SW + x] = 0.5 + 0.5 * Math.sin((x / SW) * Math.PI * 2 * 64);
  }
  const side = new THREE.MeshStandardMaterial({
    color: 0xe0b04a,
    normalMap: texture(normalFromHeight(smap, SW, SH, 1.6, true)),
    roughness: 0.35,
    metalness: 0.85,
  });

  // CylinderGeometry 的順序：側面、上面、下面
  return [side, face, face];
}
