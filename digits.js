// 花體數字 0 到 9（照納可給的參考風格自己畫的：粗體斜字、直粗橫細、收尾帶圓珠）
// 全部用同一支「扁頭筆」畫：筆頭是橫的長方形，所以直的筆畫粗、橫的筆畫細，
// 十個數字的粗細自然一致。之後遊戲裡要顯示數字也可以用這個。
//
// 每個數字畫在 256×256 的格子裡（還沒斜）：頂端 y=54、底線 y=202、中心 x=128。

export const PEN_W = 23;   // 粗筆畫的粗細（直的）
export const PEN_H = 6;    // 細筆畫的粗細（橫的）
const BALL = 11;           // 收尾圓珠的半徑
const SLANT = 0.2;         // 往右斜的程度

// 路徑寫法：['M', x, y] 移到、['L', x, y] 直線、['C', x1, y1, x2, y2, x, y] 曲線、
// ['E', cx, cy, rx, ry] 一整圈橢圓。這些都是筆的中心線。
const T = 59;   // 筆中心線的頂（54 + PEN_H / 2）
const B = 197;  // 筆中心線的底（202 - PEN_H / 2）

const GLYPHS = {
  0: { strokes: [[['E', 128, 128, 30, 69]]] },
  1: {
    strokes: [
      [['M', 138, T], ['L', 138, B]],
      [['M', 138, T], ['C', 128, 74, 110, 86, 94, 92]],
      [['M', 106, B], ['L', 170, B]],
    ],
    balls: [[94, 92, 10]],
  },
  2: {
    strokes: [
      [['M', 102, 84], ['C', 102, 66, 116, T, 130, T], ['C', 150, T, 160, 72, 160, 94],
        ['C', 160, 124, 128, 146, 100, B]],
      [['M', 100, B], ['L', 166, B], ['L', 166, 182]],
    ],
    balls: [[102, 84, BALL]],
  },
  3: {
    strokes: [
      [['M', 100, 82], ['C', 104, 64, 118, T, 130, T], ['C', 150, T, 158, 72, 158, 88],
        ['C', 158, 108, 142, 122, 122, 124]],
      [['M', 122, 124], ['C', 148, 126, 162, 142, 162, 162], ['C', 162, 186, 146, B, 126, B],
        ['C', 110, B, 98, 190, 96, 176]],
    ],
    balls: [[100, 82, BALL], [96, 176, BALL]],
  },
  4: {
    strokes: [
      [['M', 148, T], ['L', 94, 160]],
      [['M', 94, 160], ['L', 172, 160]],
      [['M', 148, T], ['L', 148, B]],
      [['M', 126, B], ['L', 170, B]],
    ],
  },
  5: {
    strokes: [
      [['M', 110, T], ['L', 162, T], ['L', 162, 50]],
      [['M', 110, T], ['L', 106, 118]],
      [['M', 106, 118], ['C', 116, 108, 128, 104, 138, 104], ['C', 156, 104, 162, 124, 162, 148],
        ['C', 162, 180, 146, B, 124, B], ['C', 108, B, 98, 188, 96, 176]],
    ],
    balls: [[96, 176, BALL]],
  },
  6: {
    strokes: [
      [['M', 156, 82], ['C', 152, 66, 142, T, 132, T], ['C', 110, T, 98, 92, 98, 152]],
      [['E', 129, 160, 31, 37]],
    ],
    balls: [[156, 82, BALL]],
  },
  7: {
    strokes: [
      [['M', 96, 74], ['L', 96, T], ['L', 164, T]],
      [['M', 164, T], ['C', 142, 100, 122, 150, 118, B]],
    ],
  },
  8: {
    strokes: [
      [['E', 128, 92, 26, 33]],
      [['E', 128, 160, 31, 37]],
    ],
  },
  9: {
    strokes: [
      [['E', 127, 96, 31, 37]],
      [['M', 158, 104], ['C', 158, 164, 146, B, 124, B], ['C', 112, B, 102, 190, 100, 176]],
    ],
    balls: [[100, 176, BALL]],
  },
};

const ADVANCE = 104; // 每個數字佔多寬（排一串數字時用）

// 把路徑切成很密的點
function samplePath(path) {
  const pts = [];
  let x = 0;
  let y = 0;
  for (const seg of path) {
    if (seg[0] === 'M') {
      x = seg[1]; y = seg[2];
      pts.push([x, y]);
    } else if (seg[0] === 'L') {
      const n = Math.max(2, Math.ceil(Math.hypot(seg[1] - x, seg[2] - y)));
      for (let i = 1; i <= n; i++) pts.push([x + ((seg[1] - x) * i) / n, y + ((seg[2] - y) * i) / n]);
      x = seg[1]; y = seg[2];
    } else if (seg[0] === 'C') {
      const [, x1, y1, x2, y2, x3, y3] = seg;
      const n = 120;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        pts.push([
          u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
      x = x3; y = y3;
    } else if (seg[0] === 'E') {
      const [, cx, cy, rx, ry] = seg;
      const n = 240;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
      }
    }
  }
  return pts;
}

// 用扁頭筆沿著點畫：每兩點之間把筆頭掃過的範圍填滿
function penStroke(ctx, pts) {
  const hw = PEN_W / 2;
  const hh = PEN_H / 2;
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    ctx.fillRect(x - hw, y - hh, PEN_W, PEN_H);
    if (i === 0) continue;
    const [px, py] = pts[i - 1];
    ctx.beginPath();
    ctx.moveTo(px - hw, py);
    ctx.lineTo(px + hw, py);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fill();
  }
}

// 畫一個數字（中心在 128, 128，還沒斜）
export function drawGlyph(ctx, d) {
  const g = GLYPHS[d];
  if (!g) return;
  for (const s of g.strokes) penStroke(ctx, samplePath(s));
  for (const [x, y, r] of g.balls || []) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 把一串數字畫在 (cx, cy)，高度大約 height，往右斜
export function drawDigits(ctx, text, cx, cy, height, color = '#fff') {
  const digits = String(text).split('').filter((d) => GLYPHS[d]);
  const scale = height / 148;
  const total = ADVANCE * digits.length;
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.transform(1, 0, -SLANT, 1, 0, 0);
  digits.forEach((d, i) => {
    ctx.save();
    ctx.translate(-total / 2 + ADVANCE * (i + 0.5) - 128, -128);
    drawGlyph(ctx, d);
    ctx.restore();
  });
  ctx.restore();
}
