// 輪迴節奏模擬（2026-10-06）：第一輪玩 N1 分鐘 → 輪迴（輪迴點照順序平均買）→ 第二輪玩 N2 分鐘，
// 比較兩輪同一時間累計賺多少，看第二輪有沒有明顯變快。
// 玩法跟 longrun.mjs 一樣：自動投幣、瞄準隨機移動、買得起最便宜的就買、技能冷卻好就按。
// 例：BASE=http://localhost:8765/beta/ NPMG=$(npm root -g) node tools/cycle.mjs 40 30
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const N1 = Number(process.argv[2] || 40);
const N2 = Number(process.argv[3] || 30);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 300, height: 200 } })).newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(process.env.BASE || 'http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { const g = __game; g.applyQuality('low'); g.setAuto(true); window.__t = 0; window.__buys = []; window.__spent = 0; });
async function playMinute() {
  return page.evaluate(() => {
    const g = __game;
    g.play(60, (t) => {
      const now = __t + t;
      if (Math.floor(now / 2) !== Math.floor((now - 1 / 60) / 2)) g.setAim((Math.random() * 2 - 1) * 2.2);
      if (Math.floor(now) !== Math.floor(now - 1 / 60)) {
        for (;;) {
          let best = null;
          for (const k of g.UPGRADE_KEYS) if (g.canBuy(k)) { const p = g.upPrice(k); if (!best || p < best[1]) best = [k, p]; }
          if (!best) break;
          __spent += best[1];
          g.buy(best[0]);
          __buys.push([+(now / 60).toFixed(1), g.UPGRADES[best[0]].name, g.upgrades[best[0]]]);
        }
        if (g.upValue('shake') > 0 && g.shakeCd <= 0) g.startShake();
        if (g.upValue('rain') > 0 && g.rainCd <= 0) g.startRainSkill();
        if (g.upValue('summon') > 0 && g.summonCd <= 0) g.startSummon();
      }
    });
    __t += 60;
    const lv = g.UPGRADE_KEYS.reduce((n, k) => n + g.upgrades[k], 0);
    return { earned: Math.round(g.earned), pts: g.rebirthPending(), wallet: g.wallet, lv, spent: __spent, dropped: g.stats.coinsDropped };
  });
}
function report(name, rows) {
  const buys = rows.buys;
  console.log(`【${name}】`);
  for (let m = 5; m <= rows.length; m += 5) {
    const r = rows[m - 1];
    const per = Math.round((r.earned - (rows[m - 6]?.earned || 0)) / 5);
    console.log(`  ${String(m).padStart(3)} 分：累計 ${r.earned}（這 5 分鐘每分鐘 ${per}），輪迴可拿 ${r.pts} 點，升級 ${r.lv} 級`);
  }
  const first = {}, last = {};
  for (const [t, nm, lv] of buys) { if (!(nm in first)) first[nm] = t; last[nm] = [t, lv]; }
  console.log('  各升級：第一次買、最後買到幾級（第幾分）');
  for (const nm of Object.keys(first)) console.log(`    ${nm}：${first[nm]} 分，Lv ${last[nm][1]}（${last[nm][0]} 分）`);
  let gap = 0, gapAt = 0;
  for (let i = 1; i < buys.length; i++) if (buys[i][0] - buys[i - 1][0] > gap) { gap = buys[i][0] - buys[i - 1][0]; gapAt = buys[i - 1][0]; }
  console.log(`  最久沒買到東西：${gap.toFixed(1)} 分鐘（從第 ${gapAt} 分開始）`);
}
const run1 = [];
for (let m = 1; m <= N1; m++) run1.push(await playMinute());
run1.buys = await page.evaluate(() => __buys);
report('第一輪', run1);
const perks = await page.evaluate(() => {
  const g = __game;
  g.enterRebirthShop();
  const got = g.rebirth.points;
  // 輪迴點照這個順序輪流買（每一輪每項買一級）
  const order = ['mult', 'startMoney', 'headStart', 'discount', 'dollCap', 'gems', 'gemCap'];
  for (let changed = true; changed;) {
    changed = false;
    for (const k of order) {
      const lv = g.perkLv(k);
      const c = g.PERKS[k].costs[lv];
      if (c !== undefined && g.rebirth.points >= c) { g.buyPerk(k); changed = true; }
    }
  }
  g.doRebirth();
  g.setAuto(true);
  window.__t = 0; window.__buys = []; window.__spent = 0;
  return { got, perks: { ...g.rebirth.perks }, wallet: g.wallet };
});
console.log(`輪迴：拿到 ${perks.got} 點，買了 ${JSON.stringify(perks.perks)}，開局手上 ${perks.wallet}`);
const run2 = [];
for (let m = 1; m <= N2; m++) run2.push(await playMinute());
run2.buys = await page.evaluate(() => __buys);
report('第二輪', run2);
const goal = run1[run1.length - 1].earned;
const reach = run2.findIndex((r) => r.earned >= goal);
console.log(`第一輪 ${N1} 分鐘賺 ${goal}；第二輪${reach >= 0 ? ` ${reach + 1} 分鐘就賺到` : ` ${N2} 分鐘還沒賺到（賺 ${run2[run2.length - 1].earned}）`}`);
// 每分鐘的數字存成 JSON（tools/curve.py 用來算價錢）
if (process.env.OUTJSON) require('fs').writeFileSync(process.env.OUTJSON, JSON.stringify({ run1, run2 }));
await browser.close();
