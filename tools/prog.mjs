// 升級節奏模擬：自動投幣、瞄中間一帶、買得起最便宜的就買，記下每次購買的時間
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const minutes = Number(process.argv[2] || 20);
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 300, height: 200 } })).newPage();
page.on('pageerror', e => console.log('ERR', e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { __game.applyQuality('low'); __game.setAuto(true); window.__log = []; window.__t = 0; });
for (let m = 0; m < minutes; m++) {
  const r = await page.evaluate(() => {
    const g = __game;
    g.play(60, (t) => {
      if (Math.floor((__t + t) / 2) !== Math.floor((__t + t - 1/60) / 2)) g.setAim((Math.random() * 2 - 1) * 2);
      // 買最便宜的
      let best = null;
      for (const k of g.UPGRADE_KEYS) if (g.canBuy(k)) { const p = g.UPGRADES[k].prices[g.upgrades[k]]; if (!best || p < best[1]) best = [k, p]; }
      if (best) { g.buy(best[0]); __log.push(`${((__t + t) / 60).toFixed(1)}分 ${g.UPGRADES[best[0]].name}${g.upgrades[best[0]]} (${best[1]})`); }
    });
    __t += 60;
    return { w: g.wallet, dolls: Object.values(g.collection).reduce((a, b) => a + b, 0), pos: g.dolls.map(d => { const t = d.body.translation(); return [t.x.toFixed(1), t.y.toFixed(1), t.z.toFixed(1)].join(','); }).join(' | ') };
  });
  console.log(`第 ${m + 1} 分鐘結束：手上 ${r.w}，娃娃 ${r.dolls}，檯面娃娃位置 ${r.pos}`);
}
console.log((await page.evaluate(() => __log)).join('\n'));
await browser.close();
