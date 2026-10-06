// 補充金幣：清空檯面後會一場一場下雨補到 40 枚以上；一般自動玩 10 分鐘檯面最少剩幾枚、有沒有誤觸發；狂熱值上限 800
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
    const g = __game; const out = {};
    g.applyQuality('low');
    // 一般自動玩 10 分鐘（錢一直補滿），記檯面最少幾枚
    g.setAuto(true);
    let min = 999;
    g.play(600, (t) => { if (g.wallet < 50) g.setWallet(200); if (t % 1 < 1 / 60) min = Math.min(min, g.coins.length); });
    out.normal = { minCoins: min, refills: g.refills };
    g.setAuto(false);
    // 清空檯面：看補幾場、補到幾枚
    g.clearTable();
    const r0 = g.refills;
    const counts = [];
    g.play(20, (t) => { if (t % 2 < 1 / 60) counts.push(g.coins.length); });
    out.cleared = { refills: g.refills - r0, counts: counts.join(' ') };
    g.play(25);
    const left = 800 - g.fever.gauge;
    g.addFever(left - 1); out.feverBefore = g.fever.time > 0;
    g.addFever(1); out.feverAt800 = g.fever.time > 0;
    return out;
  });
  console.log(name, JSON.stringify({ ...r, errs }));
}
await browser.close();
