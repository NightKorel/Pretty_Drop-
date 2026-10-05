// 測試版參數「難推」：開關前後各自動投 3 分鐘，比較投多少、推下多少（拿回幾成）；重新整理開關還在
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
const run = () => page.evaluate(() => {
  const g = __game; g.applyQuality('low'); g.setAuto(true);
  const d0 = g.stats.coinsDropped, w0 = g.stats.coinsWon;
  g.play(180, () => { if (g.wallet < 20) g.setWallet(100); });
  g.setAuto(false);
  const dropped = g.stats.coinsDropped - d0, won = g.stats.coinsWon - w0;
  return { hard: g.hardPush, dropped, won, 拿回: (won / dropped).toFixed(2), 檯面: g.coins.length };
});
const before = await run();
await page.evaluate(() => __game.setHardPush(true));
await page.evaluate(() => __game.play(60, () => { if (__game.wallet < 20) __game.setWallet(100); }));
const after = await run();
await page.reload();
await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
const kept = await page.evaluate(() => __game.hardPush);
await page.evaluate(() => __game.setHardPush(false));
console.log(JSON.stringify({ before, after, 重新整理還開著: kept, errs }));
await browser.close();
