// 輪迴：點數表、輪迴後清空與保留、輪迴點商店（收入加成、初始資金、起跑、打折、娃娃上限）、存檔；電腦和手機各一次
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['pc', { width: 1000, height: 650 }], ['phone', { width: 390, height: 780 }]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: name === 'phone', hasTouch: name === 'phone' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8765/');
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
  const after = await page.evaluate(() => { const g = __game; return { points: g.rebirth.points, count: g.rebirth.count, wallet: g.wallet, earned: g.earned, ups: { ...g.upgrades }, coins: g.coins.length, dolls: g.dolls.length, book: g.collection['jelly.0'] }; });
  // 買輪迴點商店
  const perks = await page.evaluate(() => { const g = __game; for (const k of ['startMoney', 'headStart', 'discount']) g.buyPerk(k); return { points: g.rebirth.points, perks: { ...g.rebirth.perks }, price: g.upPrice('refill'), base: g.UPGRADES.refill.prices[g.upgrades.refill] }; });
  await page.screenshot({ path: `/tmp/pd-shots/rebirth-${name}-2.png` });
  await page.evaluate(() => __game.saveGame());
  await page.reload();
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  const loaded = await page.evaluate(() => ({ points: __game.rebirth.points, perks: { ...__game.rebirth.perks }, count: __game.rebirth.count }));
  console.log(name, JSON.stringify({ table, before, pend, armed, after, perks, loaded, errs }));
  await page.evaluate(() => localStorage.clear());
  await ctx.close();
}
await browser.close();
