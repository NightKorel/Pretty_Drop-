import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.screenshot({ path: '/tmp/pd-shots/doll-start.png' });
await page.evaluate(() => {
  const g = __game; const ids = ['green','blue','pink','yellow','purple','white','strawberry','mint','candy','jelly','gold','rainbow'];
  ids.forEach((id, i) => { const row = Math.floor(i / 6), col = i % 6; g.spawnDoll(id, 1, { x: -3.2 + col * 1.3, y: 3 + row, z: -1.2 + row * 1.6 }); });
  g.simulate(1.5);
  const c = g.camera; c.position.set(0, 3.2, 6.5); c.lookAt(0, 0.3, 0);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/pd-shots/dolls.png' });
console.log(JSON.stringify({ n: await page.evaluate(() => __game.dolls.length), errs }));
await browser.close();
