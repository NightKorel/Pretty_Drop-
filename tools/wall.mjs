// 一般硬幣撞牆、其他東西穿過牆掉進側溝
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  const g = __game; g.applyQuality('low'); g.clearTable();
  // 往右邊的牆丟：一枚一般幣、一隻史萊姆，都給往右的速度
  const c = g.spawnCoin(3.5, 2, 0, 0); c.body.setLinvel({ x: 12, y: 0, z: 0 }, true);
  const d = g.spawnDoll('jelly.1', 1, { x: 3.0, y: 2, z: 0 }); d.body.setLinvel({ x: 12, y: 0, z: 0 }, true);
  g.simulate(0.4);
  const cx = c.body.translation().x, dx = d.body.translation().x;
  g.simulate(2);
  return { coinX: cx.toFixed(2), dollX: dx.toFixed(2), dollsLeft: g.dolls.length };
});
console.log(JSON.stringify({ r, errs }));
await browser.close();
