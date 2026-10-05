import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const q of ['high', 'low']) {
const page = await (await browser.newContext({ viewport: { width: 700, height: 500 } })).newPage();
page.on('pageerror', e => console.log('ERR', e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate((q) => { const g = __game; g.applyQuality(q); g.clearTable();
  g.spawnDoll('jelly.9', 1.3, { x: 0, y: 1.5, z: 0 }); g.spawnDoll('jelly.0', 1.0, { x: -1.6, y: 1.5, z: 0.2 }); g.simulate(1.5);
  for (const d of g.dolls) { d.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); } g.simulate(0.05);
  const c = g.camera; c.position.set(0, 2.0, 3.2); c.lookAt(-0.3, 0.5, 0); }, q);
await page.waitForTimeout(1500);
await page.screenshot({ path: `/tmp/pd-shots/dia-${q}.png` });
await page.close();
}
await browser.close();
