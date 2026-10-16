// 第一段（v0.1.2 測試版起）的基本檢查：開得起來、硬幣比例、錢幣雨、召喚、甩一甩、彩票、補幣、技能自動。
// 用法：BASE=http://localhost:8765/beta/ NPMG=$(npm root -g) node tools/stage1.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const vp of [{ width: 1000, height: 700 }, { width: 390, height: 780 }]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(process.env.BASE || 'http://localhost:8765/beta/');
  await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
  const r = await page.evaluate(() => {
    const g = __game; g.applyQuality('low'); const out = {};
    g.upgrades.coinMix = 10; g.refillCoinBag(); const bag = g.coinBag.join(',');
    out.bag = ['copper', 'silver', 'gold'].map((k) => bag.split(k).length - 1).join('/');
    g.upgrades.rain = 3; g.startRainSkill(); out.rainCd = Math.round(g.rainCd); g.simulate(4);
    out.goldOnTable = g.coins.filter((c) => c.kind === 'gold').length;
    const d0 = g.dolls.length; g.upgrades.summon = 3; g.startSummon(); out.summoned = g.dolls.length - d0; out.summonCd = Math.round(g.summonCd);
    g.upgrades.shake = 3; g.startShake(); out.shakeCd = Math.round(g.shakeCd); g.simulate(2);
    g.upgrades.lottery = 2; out.wheelPrice = document.getElementById('wheelCost') ? 'ok' : 'none';
    g.clearTable(); g.simulate(4); out.refillCoins = g.coins.length; out.refills = g.refills;
    document.querySelectorAll('.skillAuto')[0].click(); const cd0 = g.rainCd; out.autoRainOn = document.querySelectorAll('.skillAuto')[0].classList.contains('on');
    out.skillRows = [...document.querySelectorAll('.skillRow')].map((x) => !x.hidden).join(',');
    return out;
  });
  console.log(vp.width, JSON.stringify(r), errs);
}
await browser.close();
