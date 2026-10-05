import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const set of (process.argv[2] ? [process.argv[2]] : ['jelly', 'sweets', 'metal', 'animal'])) {
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate((set) => {
    const g = __game; g.applyQuality('high');
    g.clearTable();
    for (let i = 0; i < 10; i++) { const row = Math.floor(i / 5), col = i % 5; g.spawnDoll(`${set}.${i}`, 0.95, { x: -2.8 + col * 1.4, y: 2.5 + row, z: -1.6 + row * 1.7 }); }
    g.simulate(1.2);
    for (const d of g.dolls) { d.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); const t = d.body.translation(); d.body.setTranslation({ x: t.x, y: t.y + 0.05, z: t.z }, true); }
    g.simulate(0.05);
    const c = g.camera; c.position.set(0, 3.0, 6.2); c.lookAt(0, 0.4, -0.2);
  }, set);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `/tmp/pd-shots/set-${set}.png` });
  console.log(set, JSON.stringify(errs));
  await page.close();
}
await browser.close();
