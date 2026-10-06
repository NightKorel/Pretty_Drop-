// 輪迴：點數表、按兩次進輪迴點商店（機台蓋掉、只剩商店）、買東西、重新整理還在商店、按重生後清空與保留、存檔；電腦和手機各一次
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['pc', { width: 1000, height: 650 }], ['phone', { width: 390, height: 780 }]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: name === 'phone', hasTouch: name === 'phone' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto((process.env.BASE || 'http://localhost:8765/'));
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(() => __game.applyQuality('low'));
  const table = await page.evaluate(() => [1, 2, 3, 5, 10, 20].map((n) => `${n}點:${__game.rebirthNeed(n)}`).join(' '));
  // 假裝這一輪賺了很多：讓幣一直掉進前緣
  const before = await page.evaluate(() => {
    const g = __game;
    g.setWallet(3000);
    for (const k of ['refill', 'dropRate', 'speed']) g.buy(k);
    g.collection['jelly.0'] = 3;
    for (let i = 0; i < 80; i++) g.spawnCoin((Math.random() - 0.5) * 3, 0.3, 2.95);
    g.simulate(2);
    return { earned: g.earned, pending: g.rebirthPending() };
  });
  await page.click('#shopBtn');
  await page.click('button[data-shoptab="rebirth"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/pd-shots/rebirth-${name}-1.png` });
  // 測試用：直接把這一輪累計改成剛好夠 6 點
  await page.evaluate(() => { __game.earned = __game.rebirthNeed(6) + 10; });
  const pend = await page.evaluate(() => __game.rebirthPending());
  await page.click('button[data-shoptab="rebirth"]');
  await page.click('#rebirthGo');
  const armed = await page.textContent('#rebirthGo');
  await page.click('#rebirthGo');
  await page.waitForTimeout(300);
  // 進了輪迴點商店：點數拿到了，檯面還沒清；其他按鈕被蓋住點不到
  const inShop = await page.evaluate(() => { const g = __game; return { shopping: g.rebirth.shopping, points: g.rebirth.points, count: g.rebirth.count, coins: g.coins.length, title: document.querySelector('#shop .shopTitle').textContent, top: document.elementFromPoint(document.getElementById('shopBtn').getBoundingClientRect().x + 5, document.getElementById('shopBtn').getBoundingClientRect().y + 5).id || 'curtain', reborn: !!document.getElementById('rebornGo') }; });
  await page.screenshot({ path: `/tmp/pd-shots/rebirth-${name}-2.png` });
  for (const k of ['startMoney', 'headStart', 'discount']) await page.click(`button[data-perk="${k}"]`);
  const perks = await page.evaluate(() => { const g = __game; return { points: g.rebirth.points, perks: { ...g.rebirth.perks } }; });
  // 重新整理：還在輪迴點商店
  await page.reload();
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.waitForTimeout(300);
  const reloaded = await page.evaluate(() => ({ shopping: __game.rebirth.shopping, show: document.getElementById('shop').classList.contains('show'), points: __game.rebirth.points, pending: __game.rebirthPending() }));
  await page.evaluate(() => { window.__rebornT = 5; });
  await page.click('#rebornGo');
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => { const g = __game; return { shopping: g.rebirth.shopping, body: document.body.className, points: g.rebirth.points, count: g.rebirth.count, wallet: g.wallet, earned: g.earned, ups: { ...g.upgrades }, coins: g.coins.length, dolls: g.dolls.length, book: g.collection['jelly.0'], price: g.upPrice('refill'), base: g.UPGRADES.refill.prices[g.upgrades.refill] }; });
  await page.screenshot({ path: `/tmp/pd-shots/rebirth-${name}-3.png` });
  const loaded = after;
  console.log(name, JSON.stringify({ table, before, pend, armed, inShop, perks, reloaded, after, errs }));
  await page.evaluate(() => localStorage.clear());
  await ctx.close();
}
await browser.close();
