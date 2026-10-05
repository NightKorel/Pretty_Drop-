// 道具效果量測：同一個開局，分別發動三種道具，看 15 秒內多推下幾枚（和什麼都不做比）
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const out = {};
for (const kind of ['none', 'wind', 'reach', 'quake']) {
  const res = [];
  for (let t = 0; t < 3; t++) {
    const page = await (await browser.newContext({ viewport: { width: 300, height: 200 } })).newPage();
    await page.goto('http://localhost:8765/');
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    res.push(await page.evaluate((kind) => {
      const g = __game; g.applyQuality('low');
      for (let i = 0; i < 20; i++) { g.dropAt((Math.random() * 2 - 1) * 2); g.simulate(0.5); }
      const w0 = g.won;
      if (kind !== 'none') g.triggerItem(kind);
      g.simulate(15);
      return g.won - w0;
    }, kind));
    await page.close();
  }
  out[kind] = res;
}
console.log(JSON.stringify(out));
await browser.close();
