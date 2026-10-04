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
  for (let i = 0; i < 4; i++) { g.setWallet(100000); g.buy('multi'); } // 還沒解鎖，買不到
  const lockedMulti = g.upgrades.multi;
  for (const k of g.UPGRADE_KEYS) for (let i = 0; i < 9; i++) { g.setWallet(100000); g.buy(k); }
  g.setWallet(20); const n0 = g.coins.length; g.dropAt(0); const n1 = g.coins.length;
  for (let i = 0; i < 6; i++) { g.spawnDoll(`jelly.${i}`, 1, { x: -2 + i * 0.8, y: 1, z: 2.5 }); g.simulate(0.6); }
  return { lockedMulti, ups: { ...g.upgrades }, dropped: n1 - n0, w: g.wallet };
});
await page.tap('#bookBtn'); await page.waitForTimeout(200);
await page.tap('.bookTab[data-set="sweets"]'); await page.tap('.useSet'); await page.waitForTimeout(200);
const sets = await page.evaluate(() => [...__game.activeSets]);
const ids = await page.evaluate(() => { const out = []; for (let i = 0; i < 12; i++) { __game.dropNewDoll(); out.push(__game.dolls[__game.dolls.length - 1].id.split('.')[0]); } return [...new Set(out)]; });
await page.screenshot({ path: '/tmp/pd-shots/book3.png' });
console.log(JSON.stringify({ r, sets, ids, errs }));
await browser.close();
