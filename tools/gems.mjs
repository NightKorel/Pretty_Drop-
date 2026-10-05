// 小寶物：藍寶石、粉寶石、珍珠的近拍（高、低畫質），還有推下去拿到的錢、跳出的字顏色、珍珠滾多遠、輪迴點解鎖後機台會放
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const errs = [];
for (const q of (process.env.Q ? [process.env.Q] : ["high", "low"])) {
  const page = await (await browser.newContext({ viewport: { width: 700, height: 500 } })).newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate((q) => {
    const g = __game; g.applyQuality(q);
    g.spawnTreasure('blue', { x: -0.9, y: 1.4, z: 0.6 });
    g.spawnTreasure('pink', { x: 0.1, y: 1.4, z: 0.9 });
    g.spawnTreasure('pearl', { x: 0.9, y: 1.4, z: 0.6 });
    g.simulate(0.4);
    for (const t of g.treasures) { t.body.setLinvel({ x: 0, y: 0, z: 0 }, true); t.body.setAngvel({ x: 0, y: 0, z: 0 }, true); }
    const c = g.camera; c.position.set(0, 2.4, 3.2); c.lookAt(0, 0.6, 0.6);
  }, q);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `/tmp/pd-shots/gems-${q}.png` });
  await page.close();
}
const page = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  const g = __game; g.applyQuality('low'); g.clearTable();
  const out = {};
  // 推下前緣：拿到多少、跳出的字
  for (const k of ['blue', 'pink', 'pearl']) {
    const w0 = g.wallet;
    g.spawnTreasure(k, { x: 0, y: 0.4, z: 3.3 });
    g.simulate(1.5);
    const f = [...document.querySelectorAll('.float')].pop();
    out[k] = { 拿到: g.wallet - w0, 字: f && f.textContent, 字的class: f && f.className };
  }
  // 滾多遠：同樣往前推一下（先把檯面清空，前面沒東西擋），比較珍珠、藍寶石、金幣走多遠
  g.clearTable();
  const dist = {};
  for (const k of ['pearl', 'blue', 'coin']) {
    g.clearTable();
    const o = k === 'coin' ? g.spawnCoin(0, 0.15, -1.5) : g.spawnTreasure(k, { x: 0, y: 0.35, z: -1.5 });
    g.simulate(0.5);
    const z0 = o.body.translation().z;
    o.body.setLinvel({ x: 0, y: 0, z: 2.5 }, true);
    g.simulate(1.2);
    dist[k] = (k === 'coin' ? g.coins : g.treasures).includes(o) ? +(o.body.translation().z - z0).toFixed(2) : '掉下前緣了';
  }
  out.往前推一下走多遠 = dist;
  // 輪迴點解鎖：小寶物 Lv 2（藍、粉）
  g.clearTable();
  g.rebirth.perks.gems = 2;
  const kinds = new Set();
  for (let i = 0; i < 20; i++) { g.dropTreasure(); kinds.add(g.treasures[g.treasures.length - 1].kind); g.clearTable(); }
  out.解鎖兩級會放 = [...kinds].join(',');
  return out;
});
console.log(JSON.stringify({ r, errs }));
await browser.close();
