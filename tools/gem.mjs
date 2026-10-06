// 寶石組：舊存檔的鑽石（jelly.9）搬到 gem.9、圖鑑寶石頁和果凍頁的小圖、低畫質的寶石
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 650 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
// 做一個舊存檔：收集過 2 隻鑽石（jelly.9），檯面上有一隻；開新分頁前先塞進瀏覽器
const old = await page.evaluate(() => {
  const d = __game.saveData();
  delete d.gemSet;
  d.collection = { 'jelly.0': 1, 'jelly.9': 2 };
  d.dolls = [{ id: 'jelly.9', s: 1, p: [0, 1, 0], r: [0, 0, 0, 1] }];
  return JSON.stringify(d);
});
await ctx.close();
const ctx2 = await browser.newContext({ viewport: { width: 900, height: 650 } });
await ctx2.addInitScript((json) => { if (!sessionStorage.getItem('t')) { localStorage.setItem('pretty_drop_save', json); sessionStorage.setItem('t', '1'); } }, old);
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errs.push(e.message));
await p2.goto((process.env.BASE || 'http://localhost:8765/'));
await p2.waitForFunction(() => window.__game, null, { timeout: 90000 });
const mig = await p2.evaluate(() => ({ jelly9: __game.collection['jelly.9'] || 0, gem9: __game.collection['gem.9'] || 0, dolls: __game.dolls.map((d) => d.id) }));
await p2.evaluate(() => { const g = __game; for (const s of ['jelly', 'sweets', 'metal', 'animal', 'gem']) for (let i = 0; i < 10; i++) g.collection[`${s}.${i}`] = 1; });
for (const set of ['寶石', '果凍']) {
  await p2.click('#bookBtn');
  await p2.waitForTimeout(300);
  await p2.evaluate((name) => { const b = [...document.querySelectorAll('#book button')].find((x) => x.textContent.includes(name)); b && b.click(); }, set);
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: `/tmp/pd-shots/gem-book-${set === '寶石' ? 'gem' : 'jelly'}.png` });
  await p2.click('#bookClose');
}
await p2.evaluate(() => { const g = __game; g.applyQuality('low'); g.clearTable();
  for (let i = 0; i < 10; i++) { const row = Math.floor(i / 5), col = i % 5; g.spawnDoll(`gem.${i}`, 0.95, { x: -2.8 + col * 1.4, y: 2.5 + row, z: -1.6 + row * 1.7 }); }
  g.spawnDoll('jelly.9', 0.95, { x: 3.2, y: 2.5, z: 1.5 });
  g.simulate(1.2); for (const d of g.dolls) d.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); g.simulate(0.05);
  const c = g.camera; c.position.set(0, 3.0, 6.2); c.lookAt(0, 0.4, -0.2); });
await p2.waitForTimeout(1000);
await p2.screenshot({ path: '/tmp/pd-shots/gem-low.png' });
console.log(JSON.stringify({ mig, errs }));
await p2.evaluate(() => localStorage.clear());
await browser.close();
