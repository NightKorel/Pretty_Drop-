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
    g.upgrades.rain = 3; g.startRainSkill(); out.rainCd = Math.round(g.rainCd); g.play(4);
    out.goldOnTable = g.coins.filter((c) => c.kind === 'gold').length;
    const d0 = g.dolls.length; g.upgrades.summon = 3; g.startSummon(); out.summoned = g.dolls.length - d0; out.summonCd = Math.round(g.summonCd);
    g.upgrades.shake = 3; g.startShake(); out.shakeCd = Math.round(g.shakeCd); g.play(2);
    g.upgrades.lottery = 2; out.wheelPrice = document.getElementById('wheelCost') ? 'ok' : 'none';
    g.clearTable(); g.play(8); out.refillCoins = g.coins.length; out.refills = g.refills;
    document.querySelectorAll('.skillAuto')[0].click(); const cd0 = g.rainCd; out.autoRainOn = document.querySelectorAll('.skillAuto')[0].classList.contains('on');
    return out;
  });
  await page.waitForTimeout(500);
  r.skillRows = await page.evaluate(() => [...document.querySelectorAll('.skillRow')].map((x) => !x.hidden).join(','));
  // 道具排隊：一次推下 3 個，看每個在第幾秒發動
  r.items = await page.evaluate(() => {
    const g = __game; const used = []; let n0 = g.stats.itemsUsed;
    g.useItem('wind'); g.useItem('quake'); g.useItem('reach');
    g.play(25, (t) => { if (g.stats.itemsUsed > n0) { n0 = g.stats.itemsUsed; used.push(t.toFixed(1)); } });
    return `發動時間：${used.join("、")} 秒；剩 ${g.itemQueue.length}`;
  });
  // 商店：快速購買、最便宜 3 個、舊存檔換算
  r.shop = await page.evaluate(() => {
    const g = __game; const o = {};
    for (const k of Object.keys(g.upgrades)) g.upgrades[k] = 0;
    g.setWallet(0); document.getElementById('shopBtn').click();
    o.rows = [...document.querySelectorAll('#shopList .item .name')].map((x) => x.textContent).join('|');
    o.quick = document.querySelector('.quickBuy .desc')?.textContent;
    g.upgrades.coinMix = 6; g.setWallet(1); document.getElementById('shopBtn').click(); document.getElementById('shopBtn').click();
    o.mixText = [...document.querySelectorAll('#shopList .desc')].map((x) => x.textContent).find((t) => t.includes('現在：'));
    g.setWallet(100000); g.buy('refill'); o.afterBuy = [...document.querySelectorAll('#shopList .item .name')].map((x) => x.textContent).join('|');
    document.getElementById('shopClose').click();
    const old = { upgrades: { refill: 7, guard: 3, speed: 7, dropRate: 6, silver: 6, gold: 10, rain: 8, rainSize: 7, shake: 2, summon: 1, multi: 1 } };
    o.tabs = document.querySelectorAll('#shopList .bookTab').length;
    const d = g.saveData(); d.upgrades = old.upgrades; d.rebirth = { points: 4, perks: { dollCap: 2, gemCap: 1, mult: 3 } }; o.save = d;
    return o;
  });
  // 重新整理時遊戲會先存檔，所以舊存檔要在新頁面開始前才放進去
  await page.addInitScript((d) => { if (!sessionStorage.getItem('oldSave')) { sessionStorage.setItem('oldSave', '1'); localStorage.setItem('pretty_drop_beta_save', JSON.stringify(d)); } }, r.shop.save);
  delete r.shop.save;
  await page.reload(); await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
  r.converted = await page.evaluate(() => JSON.stringify(__game.upgrades));
  await page.evaluate(() => localStorage.clear());
  console.log(vp.width, JSON.stringify(r, null, 1), errs);
}
await browser.close();
