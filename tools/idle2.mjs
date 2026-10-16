// 自動投幣玩 N 分鐘（錢一直補夠、不買升級），每 30 秒記檯面幾枚、推下幾枚、掉側溝幾枚、補錢幾次
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const min = Number(process.argv[2] || 5);
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
const r = await page.evaluate((min) => {
  const g = __game; g.applyQuality('low'); g.setAuto(true);
  const rows = []; const w0 = g.won, l0 = g.lost; let lo = 999;
  for (let s = 30; s <= min * 60; s += 30) {
    g.play(30, () => { if (g.wallet < 50) g.setWallet(200); lo = Math.min(lo, g.coins.length); });
    rows.push({ sec: s, coins: g.coins.length, low: lo, won: g.won - w0, lost: g.lost - l0, refills: g.refills }); lo = 999;
  }
  return rows;
}, min);
for (const x of r) console.log(JSON.stringify(x));
await browser.close();
