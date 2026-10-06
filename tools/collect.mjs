import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext(devices['iPhone 13'])).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => __game.applyQuality('low'));
const r = await page.evaluate(() => {
  const g = __game; const w0 = g.wallet;
  g.spawnDoll('gold', 1, { x: 0, y: 1, z: 2.3 });   // 放在前緣外面，馬上掉下去
  g.spawnDoll('mint', 1, { x: 4.4, y: 1, z: 0 });    // 放在側溝上方
  g.simulate(2);
  return { w0, w1: g.wallet, col: { ...g.collection }, dolls: g.dolls.length };
});
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/pd-shots/toast.png' });
await page.tap('#bookBtn'); await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/pd-shots/book.png' });
await page.evaluate(() => __game.saveGame());
await page.reload(); await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r2 = await page.evaluate(() => ({ col: { ...__game.collection }, dolls: __game.dolls.map(d => d.id) }));
console.log(JSON.stringify({ r, r2, errs }));
await browser.close();
