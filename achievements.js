// 成就系統和成就商店。
// 成就：達成條件就拿到成就點數。成就商店：用成就點數買裝飾品，只改外觀，不影響遊戲。
// 要加內容，只要在 ACHIEVEMENTS 或 DECORATIONS 加一筆。

// 遊戲裡會累計的數字（存檔會記），成就的條件就看這些
export const STAT_NAMES = {
  coinsDropped: '投出去的幣',
  coinsWon: '推下來的幣',
  bigWon: '推下來的大金幣',
  dollsCollected: '收集到的娃娃',
  rains: '遇到的金幣雨',
  upgradesBought: '買過的升級',
  spins: '轉過的轉盤',
  itemsUsed: '用過的道具',
  shakes: '甩過幾次',
  fevers: '狂熱時間幾次',
  treasures: '推下的小寶物',
};

// 成就：check(遊戲狀態) 回傳 true 就達成；points 是給多少成就點數
// 遊戲狀態裡有：stats（上面的累計數字）、kinds（收集到幾種娃娃）、setsDone（收集完幾套）、
// legend（收集過傳說娃娃沒）、maxed（幾項升級升滿）、upgradeCount（升級總共幾項）
// 成就圖標（自己畫的小圖，32×32，用 currentColor 上色：達成是金色、沒達成是灰色）。
// 沒達成時名字和說明都是「？？？」，只有圖標看得到，當作提示（2026-10-05 納可定）
const C = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
const coin = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" fill-opacity="0.25"/><circle cx="${x}" cy="${y}" r="${r * 0.55}"/>`;
const slimePath = (x, y, w, h) => `<path d="M${x - w} ${y} C${x - w} ${y - h * 1.1} ${x + w} ${y - h * 1.1} ${x + w} ${y} Z" fill="currentColor" fill-opacity="0.25"/><circle cx="${x - w * 0.35}" cy="${y - h * 0.45}" r="${w * 0.1}" fill="currentColor"/><circle cx="${x + w * 0.35}" cy="${y - h * 0.45}" r="${w * 0.1}" fill="currentColor"/>`;
export const ACH_ICONS = {
  coinDrop: coin(16, 21, 7) + '<path d="M16 3v8M12 8l4 4 4-4"/>',
  coinStack: '<ellipse cx="16" cy="24" rx="9" ry="3.5"/><ellipse cx="16" cy="18" rx="9" ry="3.5"/><ellipse cx="16" cy="12" rx="9" ry="3.5" fill="currentColor" fill-opacity="0.25"/><path d="M7 12v12M25 12v12"/>',
  bell: '<path d="M9 22c2-2 2-5 2-9a5 5 0 0 1 10 0c0 4 0 7 2 9z" fill="currentColor" fill-opacity="0.25"/><path d="M7 22h18M14 26a2 2 0 0 0 4 0M16 6V4"/>',
  coinFall: coin(10, 10, 5) + coin(22, 14, 5) + coin(14, 24, 5),
  mountain: '<path d="M3 27 L11 15 L16 20 L22 10 L29 27 Z" fill="currentColor" fill-opacity="0.25"/>' + C(22, 6, 2.5),
  bigCoin: coin(16, 16, 11) + '<path d="M16 11l1.5 3.2 3.5.4-2.6 2.4.7 3.4-3.1-1.8-3.1 1.8.7-3.4-2.6-2.4 3.5-.4z" fill="currentColor"/>',
  bigCoins: coin(11, 18, 8) + coin(21, 13, 8),
  slime: slimePath(16, 25, 11, 16),
  slimes: slimePath(11, 26, 8, 12) + slimePath(22, 22, 8, 12),
  sparkle: '<path d="M16 3 L18.5 13.5 L29 16 L18.5 18.5 L16 29 L13.5 18.5 L3 16 L13.5 13.5 Z" fill="currentColor" fill-opacity="0.25"/>',
  book: '<path d="M16 8c-3-2-7-2-11-1v17c4-1 8-1 11 1 3-2 7-2 11-1V7c-4-1-8-1-11 1z" fill="currentColor" fill-opacity="0.15"/><path d="M16 8v17"/>',
  crown: '<path d="M5 24 L4 10 L11 16 L16 7 L21 16 L28 10 L27 24 Z" fill="currentColor" fill-opacity="0.25"/><path d="M5 27h22"/>',
  cloudRain: '<path d="M9 17a5 5 0 0 1 1-10 6 6 0 0 1 11 1 4.5 4.5 0 0 1 1 9z" fill="currentColor" fill-opacity="0.25"/>' + C(10, 24, 2) + C(16, 27, 2) + C(22, 24, 2),
  umbrella: '<path d="M3 16a13 11 0 0 1 26 0z" fill="currentColor" fill-opacity="0.25"/><path d="M16 16v9a3 3 0 0 1-6 0M16 5V3"/>',
  arrowUp: '<path d="M16 27V7M8 14l8-8 8 8"/><path d="M6 27h20"/>',
  maxBar: '<rect x="4" y="12" width="24" height="8" rx="2"/><rect x="4" y="12" width="24" height="8" rx="2" fill="currentColor" fill-opacity="0.35"/><path d="M8 7l2 2 4-4"/>',
  trophy: '<path d="M10 5h12v6a6 6 0 0 1-12 0z" fill="currentColor" fill-opacity="0.25"/><path d="M10 7H6a4 4 0 0 0 4 5M22 7h4a4 4 0 0 1-4 5M16 17v5M11 26h10M13 22h6"/>',
  wheel: C(16, 16, 12) + '<path d="M16 4v24M4 16h24M7.5 7.5l17 17M24.5 7.5l-17 17"/>' + '<circle cx="16" cy="16" r="3" fill="currentColor"/>',
  bolt: '<path d="M18 3 L7 18 h8 l-2 11 L25 13 h-8 z" fill="currentColor" fill-opacity="0.25"/>',
};
export function achIconSvg(name) {
  return `<svg class="achIcon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ACH_ICONS[name] || ''}</svg>`;
}

// 成就分類（畫面上分組、可以收合）
export const ACH_CATS = { coin: '投幣與推幣', slime: '史萊姆', machine: '金幣雨、轉盤、道具', upgrade: '升級' };
export const ACHIEVEMENTS = [
  { id: 'firstDrop', icon: 'coinDrop', cat: 'coin', name: '第一枚', desc: '投出第一枚幣', points: 10, check: (g) => g.stats.coinsDropped >= 1 },
  { id: 'drop1000', icon: 'coinStack', cat: 'coin', name: '手停不下來', desc: '總共投出 1000 枚幣', points: 20, check: (g) => g.stats.coinsDropped >= 1000 },
  { id: 'drop10000', icon: 'bell', cat: 'coin', name: '一萬次的叮', desc: '總共投出 10000 枚幣', points: 50, check: (g) => g.stats.coinsDropped >= 10000 },
  { id: 'won500', icon: 'coinFall', cat: 'coin', name: '嘩啦嘩啦', desc: '總共推下來 500 枚幣', points: 20, check: (g) => g.stats.coinsWon >= 500 },
  { id: 'won5000', icon: 'mountain', cat: 'coin', name: '金山', desc: '總共推下來 5000 枚幣', points: 50, check: (g) => g.stats.coinsWon >= 5000 },
  { id: 'big1', icon: 'bigCoin', cat: 'coin', name: '大的來了', desc: '推下來第一枚大金幣', points: 10, check: (g) => g.stats.bigWon >= 1 },
  { id: 'big50', icon: 'bigCoins', cat: 'coin', name: '大金幣收藏家', desc: '總共推下來 50 枚大金幣', points: 30, check: (g) => g.stats.bigWon >= 50 },
  { id: 'firstDoll', icon: 'slime', cat: 'slime', name: '抱回家', desc: '收集到第一隻史萊姆娃娃', points: 10, check: (g) => g.stats.dollsCollected >= 1 },
  { id: 'doll50', icon: 'slimes', cat: 'slime', name: '史萊姆牧場', desc: '總共收集 50 隻娃娃', points: 30, check: (g) => g.stats.dollsCollected >= 50 },
  { id: 'legend', icon: 'sparkle', cat: 'slime', name: '閃閃發亮', desc: '收集到一隻傳說娃娃', points: 30, check: (g) => g.legend },
  { id: 'set1', icon: 'book', cat: 'slime', name: '一整套', desc: '收集完一整套娃娃（10 種）', points: 50, check: (g) => g.setsDone >= 1 },
  { id: 'setAll', icon: 'crown', cat: 'slime', name: '圖鑑全開', desc: '收集完所有娃娃', points: 100, check: (g) => g.kinds >= g.totalKinds },
  { id: 'rain1', icon: 'cloudRain', cat: 'machine', name: '下雨了', desc: '遇到第一場金幣雨', points: 10, check: (g) => g.stats.rains >= 1 },
  { id: 'rain20', icon: 'umbrella', cat: 'machine', name: '雨季', desc: '總共遇到 20 場金幣雨', points: 30, check: (g) => g.stats.rains >= 20 },
  { id: 'firstUpgrade', icon: 'arrowUp', cat: 'upgrade', name: '小小投資', desc: '在商店買第一個升級', points: 10, check: (g) => g.stats.upgradesBought >= 1 },
  { id: 'maxOne', icon: 'maxBar', cat: 'upgrade', name: '升好升滿', desc: '把一項升級升到滿級', points: 30, check: (g) => g.maxed >= 1 },
  { id: 'maxAll', icon: 'trophy', cat: 'upgrade', name: '終極機台', desc: '把所有升級升到滿級', points: 100, check: (g) => g.maxed >= g.upgradeCount },
  { id: 'spin10', icon: 'wheel', cat: 'machine', name: '轉轉轉', desc: '總共轉 10 次轉盤', points: 20, check: (g) => g.stats.spins >= 10 },
  { id: 'item10', icon: 'bolt', cat: 'machine', name: '道具達人', desc: '總共用 10 次道具', points: 20, check: (g) => g.stats.itemsUsed >= 10 },
];

// 裝飾品：slot 是裝在哪裡（同一個 slot 一次只能裝一個），價錢是成就點數。
// 同一類（slot）的價錢都一樣，不同類可以不一樣（2026-10-05 納可定）
const SLOT_PRICE = { pusher: 60, pusherDeco: 80, table: 60, background: 50, coin: 120, light: 70 };
// apply(畫面) 把外觀換上去，remove(畫面) 換回原本的
function tableColor(id, name, color) {
  return {
    id, name, slot: 'table', price: SLOT_PRICE.table,
    apply: (v) => { v.table.material.color.set(color); },
    remove: (v) => { v.table.material.color.set(0x1f5b57); },
  };
}
function bgColor(id, name, color) {
  return {
    id, name, slot: 'background', price: SLOT_PRICE.background,
    apply: (v) => { v.scene.background.set(color); },
    remove: (v) => { v.scene.background.set(0x14121c); },
  };
}
// 硬幣換色：在原本的顏色上乘一個色調（一般幣和大金幣都會換）
// grey：先把金色的貼圖換成灰階的，再上色（銀色要用這個，金色乘什麼都變不成銀色）
const greyMaps = new Map();
function greyOf(tex, THREE) {
  if (greyMaps.has(tex)) return greyMaps.get(tex);
  const src = tex.image;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const l = Math.min(255, (img.data[i] * 0.4 + img.data[i + 1] * 0.45 + img.data[i + 2] * 0.15) * 1.15);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = l;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = tex.colorSpace;
  t.center.copy(tex.center);
  t.rotation = tex.rotation;
  t.repeat.copy(tex.repeat);
  t.wrapS = tex.wrapS;
  t.wrapT = tex.wrapT;
  greyMaps.set(tex, t);
  return t;
}
function coinTint(id, name, tint, plain, grey = false) {
  const mats = (v) => [...v.coinMatFancy, ...v.bigMatFancy];
  return {
    id, name, slot: 'coin', price: SLOT_PRICE.coin,
    apply: (v) => {
      for (const m of mats(v)) {
        if (!m.userData.baseColor) m.userData.baseColor = m.color.clone();
        if (m.userData.baseMap === undefined) m.userData.baseMap = m.map;
        if (grey) {
          if (m.map) { m.map = greyOf(m.userData.baseMap, v.THREE); m.color.set(tint); }
          else m.color.set(tint).multiplyScalar(0.92); // 側邊沒有貼圖，直接換色
          m.needsUpdate = true;
        } else {
          m.color.copy(m.userData.baseColor).multiply(new v.THREE.Color(tint));
        }
      }
      if (!v.coinMatPlain.userData.baseColor) v.coinMatPlain.userData.baseColor = v.coinMatPlain.color.clone();
      v.coinMatPlain.color.set(plain);
    },
    remove: (v) => {
      for (const m of mats(v)) {
        if (m.userData.baseColor) m.color.copy(m.userData.baseColor);
        if (m.userData.baseMap !== undefined && m.map !== m.userData.baseMap) { m.map = m.userData.baseMap; m.needsUpdate = true; }
      }
      if (v.coinMatPlain.userData.baseColor) v.coinMatPlain.color.copy(v.coinMatPlain.userData.baseColor);
    },
  };
}

// 推板換色（2026-10-05 納可：最需要的）。metal、rough 是金屬感和光滑度，粉嫩的顏色金屬感低一點才不會髒
function pusherColor(id, name, color, metal, rough) {
  return {
    id, name, slot: 'pusher', price: SLOT_PRICE.pusher,
    apply: (v) => {
      const m = v.pusher.material;
      if (!m.userData.base) m.userData.base = { color: m.color.clone(), metal: m.metalness, rough: m.roughness };
      m.color.set(color);
      m.metalness = metal;
      m.roughness = rough;
    },
    remove: (v) => {
      const m = v.pusher.material;
      const b = m.userData.base;
      if (!b) return;
      m.color.copy(b.color);
      m.metalness = b.metal;
      m.roughness = b.rough;
    },
  };
}
// 推板花紋：貼在推板上面和正面，跟推板顏色可以自由搭
function pusherDeco(id, name, draw) {
  return {
    id, name, slot: 'pusherDeco', price: SLOT_PRICE.pusherDeco,
    apply: (v) => v.setPusherDeco(draw),
    remove: (v) => v.setPusherDeco(null),
  };
}
// 燈光（2026-10-04 納可：燈光不要跟真實時間自動變，讓玩家自己選）：整台機台的打光換一種氣氛
// hemi 環境光、sun 主燈、warm 上方的小燈、exp 整體亮度；neon 是額外兩盞霓虹燈（左粉右青）
function lightMood(id, name, m) {
  return {
    id, name, slot: 'light', price: SLOT_PRICE.light,
    apply: (v) => v.setLight(m),
    remove: (v) => v.setLight(null),
  };
}
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}
function heart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.3, y, x - r * 0.8, y - r * 1.1, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.1, x + r * 1.3, y, x, y + r * 0.9);
  ctx.fill();
}
// 每張圖是 128×128 的一小塊，會一直重複貼。兩個圖案錯開排，看起來比較自然
const DECO_DRAW = {
  dots: (ctx) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const [x, y] of [[32, 32], [96, 96]]) { ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill(); }
  },
  hearts: (ctx) => {
    ctx.fillStyle = '#ff7eb0';
    heart(ctx, 32, 34, 16);
    ctx.fillStyle = '#ffc2d9';
    heart(ctx, 96, 98, 12);
  },
  stars: (ctx) => {
    ctx.fillStyle = '#ffd65a';
    star(ctx, 32, 34, 20);
    ctx.fillStyle = '#fff1b8';
    star(ctx, 96, 96, 11);
  },
  stripes: (ctx) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let k = -1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 64, 0); ctx.lineTo(k * 64 + 32, 0); ctx.lineTo(k * 64 + 32 + 128, 128); ctx.lineTo(k * 64 + 128, 128);
      ctx.closePath();
      ctx.fill();
    }
  },
  checker: (ctx) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);
  },
  candy: (ctx) => {
    // 糖果點點：粉、藍、黃、綠的小圓點
    const cols = ['#ff9ec4', '#8fd3ff', '#ffe27a', '#9fe6b8'];
    [[22, 24], [86, 40], [44, 92], [108, 104]].forEach(([x, y], i) => {
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    });
  },
};

export const DECORATIONS = [
  pusherColor('pusherGold', '金色推板', 0xd9a842, 0.85, 0.28),
  pusherColor('pusherRose', '玫瑰金推板', 0xe8a99a, 0.8, 0.3),
  pusherColor('pusherBlack', '黑鉻推板', 0x2b2a31, 0.9, 0.22),
  pusherColor('pusherPearl', '珍珠白推板', 0xf3eee6, 0.25, 0.35),
  pusherColor('pusherPink', '草莓粉推板', 0xf5a3c0, 0.15, 0.45),
  pusherColor('pusherMint', '薄荷綠推板', 0x93d9c3, 0.15, 0.45),
  pusherColor('pusherLilac', '薰衣草推板', 0xb9a4e6, 0.15, 0.45),
  pusherDeco('decoDots', '白點點', DECO_DRAW.dots),
  pusherDeco('decoHearts', '愛心', DECO_DRAW.hearts),
  pusherDeco('decoStars', '星星', DECO_DRAW.stars),
  pusherDeco('decoCandy', '糖果點點', DECO_DRAW.candy),
  pusherDeco('decoStripes', '斜條紋', DECO_DRAW.stripes),
  pusherDeco('decoChecker', '格紋', DECO_DRAW.checker),
  lightMood('lightDay', '白天', { hemi: [0xffffff, 1.0], sun: [0xfffaf0, 2.8], warm: [0xfff0d8, 6], exp: 1.2, env: 0.75 }),
  lightMood('lightSunset', '黃昏', { hemi: [0xff9a62, 0.9], sun: [0xff8a3a, 2.8], warm: [0xff6a2a, 26], exp: 1.05, env: 0.3 }),
  lightMood('lightMoon', '月光', { hemi: [0x5f7fd0, 0.8], sun: [0xa9c2ff, 2.2], warm: [0x7f9cff, 14], exp: 0.95, env: 0.28 }),
  lightMood('lightNeon', '夜晚霓虹', { hemi: [0x4a3a90, 0.6], sun: [0x9fb0ff, 0.9], warm: [0xff3fa0, 22], exp: 1.0, env: 0.22, neon: true }),
  tableColor('tableRed', '紅絨布檯面', 0x7a2433),
  tableColor('tableBlue', '深藍絨布檯面', 0x1f3f6b),
  tableColor('tableBlack', '黑絨布檯面', 0x1d1b22),
  tableColor('tableLavender', '薰衣草檯面', 0x6b5a8e),
  bgColor('bgNight', '夜空藍背景', 0x0d1530),
  bgColor('bgWarm', '暖咖啡背景', 0x2a1d16),
  bgColor('bgPlum', '梅子紫背景', 0x2e1c2e),
  coinTint('coinBronze', '古銅硬幣', 0xb8906e, 0xa87a4e),
  coinTint('coinRose', '玫瑰金硬幣', 0xffc9bd, 0xe0a090),
  coinTint('coinSilver', '銀色硬幣', 0xe4e8ee, 0xbfc4cc, true),
];

export const DECORATION_SLOTS = {
  pusher: '推板顏色',
  pusherDeco: '推板花紋',
  light: '燈光',
  table: '檯面',
  coin: '硬幣',
  background: '背景',
};
