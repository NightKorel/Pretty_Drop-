// 第一批 2、3、5（2026-10-16）：寶石放大（藍 > 粉 > 珍珠）、寶物上限一開始 5 個、狂熱時間的畫面效果和雨量。
// 拍寶石放在幣堆上的近照、狂熱時間的畫面；量狂熱 20 秒掉了幾枚、寶物最多同時幾個。截圖存 /tmp/pd-shots/batch1-*.png。
// 用法：BASE=http://localhost:8765/beta/ NPMG=$(npm root -g) node tools/batch1.mjs [low|high]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const q = process.argv[2] || 'high';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(process.env.BASE || 'http://localhost:8765/beta/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate((q) => { __game.applyQuality(q); }, q);
// 三種寶石並排放在檯面中間的幣堆上
await page.evaluate(() => {
  const g = __game;
  [['blue', -1.6], ['pink', 0], ['pearl', 1.6]].forEach(([k, x]) => g.spawnTreasure(k, { x, y: 1.2, z: 0.3 }));
  g.simulate(2);
});
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
await page.screenshot({ path: `/tmp/pd-shots/batch1-${q}-gems.png` });
// 寶物上限：開了寶石、一直放，看最多同時幾個（沒買寶物上限）
const cap = await page.evaluate(() => {
  const g = __game; g.clearTable(); g.setUpgrades({ gems: 3 });
  let most = 0;
  g.play(240, () => { most = Math.max(most, g.treasures.length); });
  return most;
});
console.log('沒買寶物上限，4 分鐘裡檯面上最多同時幾個寶物：', cap);
// 狂熱時間
const fever = await page.evaluate(() => {
  const g = __game; const d0 = g.coins.length;
  g.addFever(10000);
  let spawned = 0, prev = g.coins.length;
  g.play(1, () => {});
  return { 開始: g.fever.time > 0, 一秒後幣數: g.coins.length - d0 };
});
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
await page.evaluate(() => document.getElementById('feverGlow').getAnimations().forEach((a) => { a.pause(); a.currentTime = 900; }));
await page.screenshot({ path: `/tmp/pd-shots/batch1-${q}-fever.png` });
console.log('狂熱', JSON.stringify(fever), '錯誤', JSON.stringify(errs));
await browser.close();
