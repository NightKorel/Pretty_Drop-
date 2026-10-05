import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext(devices['iPhone 13'])).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  const g = __game; g.applyQuality('low');
  // 直接當作果凍收集到 6 種（推下去收集的部分由 collect.mjs 測）
  for (let i = 0; i < 6; i++) g.collection[`jelly.${i}`] = 1;
  g.simulate(2); return { col: Object.keys(g.collection).length };
});
await page.waitForTimeout(400);
console.log('收集了', JSON.stringify(r));
await page.screenshot({ path: '/tmp/pd-shots/unlock-toast.png' });
await page.tap('#bookBtn'); await page.waitForTimeout(300);
await page.tap('.bookTab[data-set="metal"]'); await page.waitForTimeout(200);
await page.tap('.useSet'); await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/pd-shots/book2.png' });
await page.tap('.bookTab[data-set="sweets"]'); await page.waitForTimeout(200);
const lockTxt = await page.textContent('.bookLock');
const nd = await page.evaluate(() => { __game.dropNewDoll(); return __game.dolls[__game.dolls.length - 1].id; });
console.log(JSON.stringify({ r, lockTxt, nd, errs }));
await browser.close();
