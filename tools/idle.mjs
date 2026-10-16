// 不投幣放著：開局後完全不投幣、不補錢，每 30 秒記檯面幾枚、推下前緣幾枚、掉進側溝幾枚（看幣會不會自己滑下去）
// 參數：分鐘數（預設 5）
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const min = Number(process.argv[2] || 5);
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
const r = await page.evaluate((min) => {
  const g = __game;
  g.applyQuality('low');
  g.setAuto(false);
  const rows = [];
  const w0 = g.won, l0 = g.lost;
  rows.push({ sec: 0, coins: g.coins.length, won: 0, lost: 0 });
  for (let s = 30; s <= min * 60; s += 30) {
    g.simulate(30);
    rows.push({ sec: s, coins: g.coins.length, won: g.won - w0, lost: g.lost - l0, refills: g.refills });
  }
  return rows;
}, min);
for (const x of r) console.log(JSON.stringify(x));
if (errs.length) console.log('errs', errs);
await browser.close();
