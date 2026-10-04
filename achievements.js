// 成就系統和成就商店的框架。
// 成就：達成條件就拿到成就點數。成就商店：用成就點數買裝飾品，只改外觀，不影響遊戲。
// 之後要加內容，只要在 ACHIEVEMENTS 或 DECORATIONS 加一筆。

// 遊戲裡會累計的數字（存檔會記），成就的條件就看這些
export const STAT_NAMES = {
  coinsDropped: '投出去的幣',
  coinsWon: '推下來的幣',
  bigWon: '推下來的大金幣',
  dollsCollected: '收集到的娃娃',
  rains: '遇到的金幣雨',
  upgradesBought: '買過的升級',
};

// 成就：check(遊戲狀態) 回傳 true 就達成；points 是給多少成就點數
// 下面三個是範例，確認框架能動，之後換成正式內容
export const ACHIEVEMENTS = [
  {
    id: 'firstDrop',
    name: '第一枚',
    desc: '投出第一枚幣',
    points: 1,
    check: (g) => g.stats.coinsDropped >= 1,
  },
  {
    id: 'firstDoll',
    name: '抱回家',
    desc: '收集到第一隻史萊姆娃娃',
    points: 2,
    check: (g) => g.stats.dollsCollected >= 1,
  },
  {
    id: 'firstUpgrade',
    name: '小小投資',
    desc: '在商店買第一個升級',
    points: 1,
    check: (g) => g.stats.upgradesBought >= 1,
  },
];

// 裝飾品：slot 是裝在哪裡（同一個 slot 一次只能裝一個），price 是成就點數
// apply(畫面) 負責把外觀換上去，remove 換回原本的。目前還沒有內容。
// 範例格式：
// { id: 'tableRed', name: '紅絨布檯面', slot: 'table', price: 3, apply: (v) => {...}, remove: (v) => {...} }
export const DECORATIONS = [];

export const DECORATION_SLOTS = {
  table: '檯面',
  coin: '硬幣',
  background: '背景',
};
