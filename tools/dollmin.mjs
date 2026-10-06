// 檯面上史萊姆少於 2 隻會很快補上：清掉全部娃娃，看幾秒後補回幾隻；電腦和手機各一次
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['pc', { width: 1000, height: 700 }], ['phone', { width: 390, height: 780 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto((process.env.BASE || 'http://localhost:8765/'));
  await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
  const r = await page.evaluate(() => {
    const g = __game; g.applyQuality('low');
    while (g.dolls.length) { g.clearTable(); }
    const seen = [];
    g.play(12, (t) => { if (t % 1 < 1 / 60) seen.push(g.dolls.length); });
    return seen.join(' ');
  });
  console.log(name, JSON.stringify({ 每秒娃娃數: r, errs }));
}
await browser.close();
