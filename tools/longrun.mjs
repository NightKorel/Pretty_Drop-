// 長時間節奏模擬：自動投幣、瞄準隨機移動、買得起最便宜的升級就買、甩一甩冷卻好就甩。
// 參數：分鐘數、輪迴點商店等級（JSON，可省略）。例：node tools/longrun.mjs 60
//      node tools/longrun.mjs 40 '{"headStart":1,"mult":1,"startMoney":1}'
// 給了輪迴點商店等級，就先照那個等級輪迴一次再開始算（初始資金、起跑都會生效）。
// 每 5 分鐘印一行：這一輪累計賺多少、現在輪迴能拿幾點、手上多少、升級總級數、收集幾隻娃娃。
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const minutes = Number(process.argv[2] || 60);
const perks = JSON.parse(process.argv[3] || '{}');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 300, height: 200 } })).newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate((perks) => {
  const g = __game;
  g.applyQuality('low');
  if (Object.keys(perks).length) {
    Object.assign(g.rebirth.perks, perks);
    g.earned = g.rebirthNeed(1);
    g.doRebirth();
    g.rebirth.points = 0;
  }
  g.setAuto(true);
  window.__t = 0;
  window.__buys = [];
}, perks);
const rows = [];
for (let m = 1; m <= minutes; m++) {
  const r = await page.evaluate(() => {
    const g = __game;
    g.play(60, (t) => {
      const now = __t + t;
      if (Math.floor(now / 2) !== Math.floor((now - 1 / 60) / 2)) g.setAim((Math.random() * 2 - 1) * 2.2);
      if (Math.floor(now) !== Math.floor(now - 1 / 60)) {
        // 每秒：買得起最便宜的就一直買
        for (;;) {
          let best = null;
          for (const k of g.UPGRADE_KEYS) if (g.canBuy(k)) { const p = g.upPrice(k); if (!best || p < best[1]) best = [k, p]; }
          if (!best) break;
          g.buy(best[0]);
          __buys.push([+(now / 60).toFixed(1), g.UPGRADES[best[0]].name, g.upgrades[best[0]]]);
        }
        if (g.upValue('shake') > 0 && g.shakeCd <= 0) g.startShake();
      }
    });
    __t += 60;
    const lv = g.UPGRADE_KEYS.reduce((n, k) => n + g.upgrades[k], 0);
    const maxLv = g.UPGRADE_KEYS.reduce((n, k) => n + g.UPGRADES[k].prices.length, 0);
    return { earned: Math.round(g.earned), pts: g.rebirthPending(), wallet: g.wallet, lv, maxLv, dolls: g.stats.dollsCollected };
  });
  rows.push(r);
  if (m % 5 === 0 || m === minutes) console.log(`${String(m).padStart(3)} 分：累計賺 ${r.earned}，輪迴可拿 ${r.pts} 點，手上 ${r.wallet}，升級 ${r.lv}/${r.maxLv} 級，收集娃娃 ${r.dolls} 隻`);
}
const buys = await page.evaluate(() => __buys);
// 各升級第一次買到、買滿的時間
const first = {}, last = {};
for (const [t, name, lv] of buys) { if (!(name in first)) first[name] = t; last[name] = [t, lv]; }
console.log('各升級：第一次買在第幾分、最後一次買到幾級（第幾分）');
for (const name of Object.keys(first)) console.log(`  ${name}：${first[name]} 分開始，Lv ${last[name][1]}（${last[name][0]} 分）`);
let gap = 0, gapAt = 0;
for (let i = 1; i < buys.length; i++) if (buys[i][0] - buys[i - 1][0] > gap) { gap = buys[i][0] - buys[i - 1][0]; gapAt = buys[i - 1][0]; }
console.log(`最久沒買到東西：${gap.toFixed(1)} 分鐘（從第 ${gapAt} 分開始）`);
await browser.close();
