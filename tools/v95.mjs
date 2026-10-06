// v0.0.95：一次多投（1、2、3 枚，3 枚天價）、召喚史萊姆技能；電腦和手機各一次
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['pc', { width: 1280, height: 800 }], ['phone', { width: 390, height: 780 }]]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto((process.env.BASE || 'http://localhost:8765/'));
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  const r = await page.evaluate(() => {
    const g = __game; const out = {};
    g.applyQuality('low');
    g.setWallet(100000);
    // 一次多投
    out.multiPrices = g.UPGRADES.multi.prices.join(' ');
    g.upgrades.multi = 2;
    const n0 = g.coins.length; g.dropAt(0); out.multiDropped = g.coins.length - n0;
    g.simulate(3);
    // 召喚
    g.clearTable(); g.simulate(0.5);
    g.upgrades.summon = 1;
    const d0 = g.dolls.length; g.startSummon(); g.simulate(1);
    out.summon = { added: g.dolls.length - d0, cd: Math.round(g.summonCd) };
    g.startSummon(); out.summonAgainWhileCd = g.dolls.length - d0;
    return out;
  });
  await page.evaluate(() => { __game.upgrades.summon = 1; __game.updateHud?.(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `/tmp/pd-shots/v95-${name}.png` });
  console.log(name, JSON.stringify({ ...r, summonBtn: await page.evaluate(() => !document.getElementById('summonBtn').hidden), errs }));
}
await browser.close();
