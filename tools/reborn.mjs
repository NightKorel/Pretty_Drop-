// 轉生動畫：按兩次輪迴，動畫中途和結束各截圖；檢查初始資金表、輪迴點商店只寫升級後的效果；電腦和手機各一次
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
  await page.evaluate(() => { const g = __game; g.earned = g.rebirthNeed(8); g.doRebirth(); g.buyPerk('startMoney'); g.buyPerk('startMoney'); g.earned = g.rebirthNeed(2); });
  await page.click('#shopBtn');
  await page.click('button[data-shoptab="rebirth"]');
  const descs = await page.evaluate(() => [...document.querySelectorAll('#shopList .item .desc')].map((d) => d.textContent));
  await page.click('#rebirthGo');
  await page.evaluate(() => { window.__rebornT = 1.0; });
  await page.click('#rebirthGo');
  const t0 = Date.now();
  const at = [];
  await page.waitForTimeout(1300);
  at.push((Date.now() - t0) / 1000);
  await page.screenshot({ path: `/tmp/pd-shots/reborn-${name}-hop.png` });
  await page.evaluate(() => { window.__rebornT = 3.15; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/pd-shots/reborn-${name}-spin.png` });
  await page.evaluate(() => { window.__rebornT = undefined; });
  at.push((Date.now() - t0) / 1000);
  await page.waitForTimeout(600);
  at.push((Date.now() - t0) / 1000);
  await page.waitForTimeout(2200);
  const end = await page.evaluate(() => ({ busy: __game.rebornBusy, overlay: document.getElementById('reborn').className, wallet: __game.wallet, points: __game.rebirth.points, count: __game.rebirth.count }));
  await page.screenshot({ path: `/tmp/pd-shots/reborn-${name}-end.png` });
  console.log(name, JSON.stringify({ at, descs, end, errs }));
  await page.evaluate(() => localStorage.clear());
  await ctx.close();
}
await browser.close();
