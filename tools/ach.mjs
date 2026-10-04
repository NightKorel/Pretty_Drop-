import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext(devices['iPhone 13'])).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => __game.applyQuality('low'));
await page.screenshot({ path: '/tmp/pd-shots/hud.png' });
// 先放一個測試用裝飾品，確認框架能買、能裝、能拿下來
await page.evaluate(async () => {
  const m = await import('/achievements.js?v=0.0.21');
  m.DECORATIONS.push({ id: 'testRed', name: '測試紅檯面', slot: 'table', price: 2,
    apply: (v) => { v.table.userData.old = v.table.material.color.getHex(); v.table.material.color.set(0xaa3344); },
    remove: (v) => { v.table.material.color.setHex(v.table.userData.old); } });
  __game.dropAt(0); __game.buy('refill');
  __game.checkAchievements();
});
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/pd-shots/ach-toast.png' });
await page.tap('#achBtn'); await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/pd-shots/ach.png' });
await page.tap('button[data-achtab="shop"]'); await page.waitForTimeout(200);
await page.tap('button[data-decorbuy="testRed"]'); await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/pd-shots/ach-shop.png' });
const r = await page.evaluate(() => ({ pts: __game.achPoints, ach: { ...__game.achieved }, stats: { ...__game.stats } }));
console.log(JSON.stringify({ r, errs }));
await browser.close();
