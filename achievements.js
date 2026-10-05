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
};

// 成就：check(遊戲狀態) 回傳 true 就達成；points 是給多少成就點數
// 遊戲狀態裡有：stats（上面的累計數字）、kinds（收集到幾種娃娃）、setsDone（收集完幾套）、
// legend（收集過傳說娃娃沒）、maxed（幾項升級升滿）、upgradeCount（升級總共幾項）
// 成就分類（畫面上分組、可以收合）
export const ACH_CATS = { coin: '投幣與推幣', slime: '史萊姆', machine: '金幣雨、轉盤、道具', upgrade: '升級' };
export const ACHIEVEMENTS = [
  { id: 'firstDrop', cat: 'coin', name: '第一枚', desc: '投出第一枚幣', points: 10, check: (g) => g.stats.coinsDropped >= 1 },
  { id: 'drop1000', cat: 'coin', name: '手停不下來', desc: '總共投出 1000 枚幣', points: 20, check: (g) => g.stats.coinsDropped >= 1000 },
  { id: 'drop10000', cat: 'coin', name: '一萬次的叮', desc: '總共投出 10000 枚幣', points: 50, check: (g) => g.stats.coinsDropped >= 10000 },
  { id: 'won500', cat: 'coin', name: '嘩啦嘩啦', desc: '總共推下來 500 枚幣', points: 20, check: (g) => g.stats.coinsWon >= 500 },
  { id: 'won5000', cat: 'coin', name: '金山', desc: '總共推下來 5000 枚幣', points: 50, check: (g) => g.stats.coinsWon >= 5000 },
  { id: 'big1', cat: 'coin', name: '大的來了', desc: '推下來第一枚大金幣', points: 10, check: (g) => g.stats.bigWon >= 1 },
  { id: 'big50', cat: 'coin', name: '大金幣收藏家', desc: '總共推下來 50 枚大金幣', points: 30, check: (g) => g.stats.bigWon >= 50 },
  { id: 'firstDoll', cat: 'slime', name: '抱回家', desc: '收集到第一隻史萊姆娃娃', points: 10, check: (g) => g.stats.dollsCollected >= 1 },
  { id: 'doll50', cat: 'slime', name: '史萊姆牧場', desc: '總共收集 50 隻娃娃', points: 30, check: (g) => g.stats.dollsCollected >= 50 },
  { id: 'legend', cat: 'slime', name: '閃閃發亮', desc: '收集到一隻傳說娃娃', points: 30, check: (g) => g.legend },
  { id: 'set1', cat: 'slime', name: '一整套', desc: '收集完一整套娃娃（10 種）', points: 50, check: (g) => g.setsDone >= 1 },
  { id: 'setAll', cat: 'slime', name: '圖鑑全開', desc: '收集完所有娃娃', points: 100, check: (g) => g.kinds >= g.totalKinds },
  { id: 'rain1', cat: 'machine', name: '下雨了', desc: '遇到第一場金幣雨', points: 10, check: (g) => g.stats.rains >= 1 },
  { id: 'rain20', cat: 'machine', name: '雨季', desc: '總共遇到 20 場金幣雨', points: 30, check: (g) => g.stats.rains >= 20 },
  { id: 'firstUpgrade', cat: 'upgrade', name: '小小投資', desc: '在商店買第一個升級', points: 10, check: (g) => g.stats.upgradesBought >= 1 },
  { id: 'maxOne', cat: 'upgrade', name: '升好升滿', desc: '把一項升級升到滿級', points: 30, check: (g) => g.maxed >= 1 },
  { id: 'maxAll', cat: 'upgrade', name: '終極機台', desc: '把所有升級升到滿級', points: 100, check: (g) => g.maxed >= g.upgradeCount },
  { id: 'spin10', cat: 'machine', name: '轉轉轉', desc: '總共轉 10 次轉盤', points: 20, check: (g) => g.stats.spins >= 10 },
  { id: 'item10', cat: 'machine', name: '道具達人', desc: '總共用 10 次道具', points: 20, check: (g) => g.stats.itemsUsed >= 10 },
];

// 裝飾品：slot 是裝在哪裡（同一個 slot 一次只能裝一個），price 是成就點數
// apply(畫面) 把外觀換上去，remove(畫面) 換回原本的
function tableColor(id, name, color, price) {
  return {
    id, name, slot: 'table', price,
    apply: (v) => { v.table.material.color.set(color); },
    remove: (v) => { v.table.material.color.set(0x1f5b57); },
  };
}
function bgColor(id, name, color, price) {
  return {
    id, name, slot: 'background', price,
    apply: (v) => { v.scene.background.set(color); },
    remove: (v) => { v.scene.background.set(0x14121c); },
  };
}
// 硬幣換色：在原本的顏色上乘一個色調（一般幣和大金幣都會換）
function coinTint(id, name, tint, plain, price) {
  const mats = (v) => [...v.coinMatFancy, ...v.bigMatFancy];
  return {
    id, name, slot: 'coin', price,
    apply: (v) => {
      for (const m of mats(v)) {
        if (!m.userData.baseColor) m.userData.baseColor = m.color.clone();
        m.color.copy(m.userData.baseColor).multiply(new v.THREE.Color(tint));
      }
      if (!v.coinMatPlain.userData.baseColor) v.coinMatPlain.userData.baseColor = v.coinMatPlain.color.clone();
      v.coinMatPlain.color.set(plain);
    },
    remove: (v) => {
      for (const m of mats(v)) if (m.userData.baseColor) m.color.copy(m.userData.baseColor);
      if (v.coinMatPlain.userData.baseColor) v.coinMatPlain.color.copy(v.coinMatPlain.userData.baseColor);
    },
  };
}

export const DECORATIONS = [
  tableColor('tableRed', '紅絨布檯面', 0x7a2433, 50),
  tableColor('tableBlue', '深藍絨布檯面', 0x1f3f6b, 50),
  tableColor('tableBlack', '黑絨布檯面', 0x1d1b22, 80),
  tableColor('tableLavender', '薰衣草檯面', 0x6b5a8e, 80),
  bgColor('bgNight', '夜空藍背景', 0x0d1530, 50),
  bgColor('bgWarm', '暖咖啡背景', 0x2a1d16, 50),
  bgColor('bgPlum', '梅子紫背景', 0x2e1c2e, 50),
  coinTint('coinBronze', '古銅硬幣', 0xb8906e, 0xa87a4e, 100),
  coinTint('coinRose', '玫瑰金硬幣', 0xffc9bd, 0xe0a090, 150),
];

export const DECORATION_SLOTS = {
  table: '檯面',
  coin: '硬幣',
  background: '背景',
};
