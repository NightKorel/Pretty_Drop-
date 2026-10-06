import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 500 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { const g = __game; g.applyQuality('mid'); g.clearTable();
  const q = { x: -0.7071, y: 0, z: 0, w: 0.7071 }; // 平躺，正面朝上
  g.spawnProp('item', 'wind', { x: -2, y: 0.3, z: 0 }, q); g.spawnProp('item', 'reach', { x: 0, y: 0.3, z: 0 }, q); g.spawnProp('item', 'quake', { x: 2, y: 0.3, z: 0 }, q);
  g.simulate(0.5); const c = g.camera; c.position.set(0, 4, 2.5); c.lookAt(0, 0, 0); });
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/pd-shots/items3.png' });
console.log(JSON.stringify({ errs }));
await browser.close();
