import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext(devices['iPhone 13'])).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => __game.applyQuality('low'));
// 投幣速度上限：連點 10 次，一秒內只該投 1 枚
const rate = await page.evaluate(() => { const g = __game; const n0 = g.stats.coinsDropped; const c = document.getElementById('view'); for (let i = 0; i < 10; i++) { c.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 200, clientY: 400, bubbles: true })); c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); } return g.stats.coinsDropped - n0; });
await page.evaluate(() => { __game.spawnDoll('jelly.9', 1, { x: 0, y: 1, z: 3.6 }); __game.simulate(1.2); });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/pd-shots/celeb.png' });
console.log(JSON.stringify({ rate, errs, ups: await page.evaluate(() => __game.UPGRADE_KEYS) }));
await browser.close();
