import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const cfg of JSON.parse(process.argv[2])) {
const page = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
page.on('pageerror', e => console.log('ERR', e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r = await page.evaluate((cfg) => {
  const g = __game; g.applyQuality('low');
  for (const k of Object.keys(cfg)) while (g.upgrades[k] < cfg[k]) { g.setWallet(100000); g.buy(k); }
  g.setWallet(100000);
  const col0 = () => Object.values(g.collection).reduce((a, b) => a + b, 0);
  let drops = 0; const w0 = g.won; const c0 = col0(); let dollsDropped = 0;
  for (let t = 0; t < 300; t += 0.3) {
    g.dropAt((Math.random() * 2 - 1) * 2); drops++;
    if (Math.floor(t / 33) !== Math.floor((t - 0.3) / 33) && g.dolls.length < 2) { g.dropNewDoll(); dollsDropped++; }
    g.simulate(0.3);
  }
  return { drops, won: g.won - w0, dollsDropped, collected: col0() - c0, onTable: g.dolls.length };
}, cfg);
const momPer5min = 300 / 30 * 10;
console.log(JSON.stringify(cfg), JSON.stringify(r), 'mom(5min)=', momPer5min, 'net table=', r.won - r.drops);
await page.close();
}
await browser.close();
