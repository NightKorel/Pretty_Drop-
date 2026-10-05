// 入賞口：洞口左右移動、瞄準洞口投幣會入賞（掉小獎、冷卻變暗）、沒對準的彈開；拍照
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 650 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  const g = __game;
  g.applyQuality('mid');
  g.setWallet(500);
  const out = { hits: 0, tries: 0, coins0: g.coins.length };
  // 跟著洞口瞄準投 20 枚（每次等洞口冷卻好）
  for (let k = 0; k < 6; k++) {
    g.simulate(8.5);
    const before = g.stats.prizes;
    g.dropAt(g.prize.x + g.prize.v * 0.25);
    out.tries++;
    g.simulate(1.5);
    if (g.stats.prizes > before) out.hits++;
  }
  // 故意投在洞口旁邊 1 格
  g.simulate(8.5);
  const b2 = g.stats.prizes;
  g.dropAt(g.prize.x + 1.0);
  g.simulate(1.5);
  out.offHit = g.stats.prizes - b2;
  out.spins = g.freeSpins;
  return out;
});
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/pd-shots/prize.png' });
console.log(JSON.stringify({ ...r, errs }));
await browser.close();
