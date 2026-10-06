// 史萊姆直接放在推板上：放 6 隻（中間跑物理），看放下去的高度、有沒有被彈飛、擋到的幣有沒有頂開；截圖
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 650 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const res = await page.evaluate(() => {
  const g = __game;
  g.applyQuality('low');
  // 推板上先撒一堆幣，擋路
  for (let i = 0; i < 25; i++) g.spawnCoin((Math.random() - 0.5) * 6, 1.2, -5.6 + Math.random() * 0.8);
  g.simulate(1);
  const out = [];
  for (let k = 0; k < 6; k++) {
    const n0 = g.dolls.length;
    g.dropNewDoll();
    let waited = 0;
    while (g.dolls.length === n0 && waited < 300) { g.simulate(1 / 60); waited++; }
    const d = g.dolls[g.dolls.length - 1];
    const p0 = d.body.translation();
    g.simulate(0.5);
    const p1 = d.body.translation();
    const v = d.body.linvel();
    out.push({ waitSteps: waited, at: [+p0.x.toFixed(2), +p0.y.toFixed(2), +p0.z.toFixed(2)], after: [+p1.x.toFixed(2), +p1.y.toFixed(2), +p1.z.toFixed(2)], speed: +Math.hypot(v.x, v.y, v.z).toFixed(2) });
    g.simulate(1.5);
  }
  const high = g.coins.filter((c) => c.body.translation().y > 2).length;
  return { out, high, dolls: g.dolls.length };
});
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/pd-shots/dollspawn.png' });
console.log(JSON.stringify({ ...res, errs }));
await browser.close();
