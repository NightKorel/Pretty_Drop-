import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const configs = JSON.parse(process.argv[2]);
const spread = Number(process.argv[3] || 2);
for (const cfg of configs) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto((process.env.BASE || 'http://localhost:8765/'));
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  const r = await page.evaluate(([cfg, spread]) => {
    const g = __game; g.applyQuality('low'); g.setWallet(100000);
    for (const k of Object.keys(cfg)) { while (g.upgrades[k] < cfg[k]) { const w = g.wallet; g.buy(k); g.setWallet(100000); } }
    const run = (sec) => { let d = 0; for (let t = 0; t < sec; t += 0.3) { g.dropAt((Math.random()*2-1)*spread); d++; g.simulate(0.3); } return d; };
    run(90);
    const w0 = g.won, l0 = g.lost;
    const d = run(180);
    return { drops: d, won: g.won - w0, lost: g.lost - l0, ratio: ((g.won - w0) / d).toFixed(2), table: g.coins.length };
  }, [cfg, spread]);
  console.log(JSON.stringify(cfg), JSON.stringify(r));
  await ctx.close();
}
await browser.close();
