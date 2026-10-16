// 每分鐘淨賺（2026-10-16，給 tools/curve.py 排價錢用）：直接把升級設成指定的組合，量那個組合下每分鐘淨賺多少。
// 比從頭玩一輪快很多：一輪 3 小時要跑好幾個小時，這個每個組合幾分鐘。
// 用法：BASE=http://localhost:8765/beta/ NPMG=$(npm root -g) node tools/rate.mjs 組合.json [輸出.json]
//   組合.json 是陣列，每一格是升級等級，例如 [{"coinMix":3,"dropRate":1}, ...]
//   環境變數 WARM（先跑幾分鐘不算，預設 1）、MIN（量幾分鐘，預設 4）、JOBS（同時開幾個，預設 3）
// 玩法跟 longrun.mjs 一樣：自動投幣、瞄準隨機移動、技能好了就按、免費抽直接抽；錢給很多，不會因為沒錢停下來。
// 淨賺 = 賺到的錢（推下去、媽媽十元、彩券……全部）− 投幣花掉的錢。
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const { chromium } = require(process.env.NPMG + '/playwright');
const states = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const WARM = Number(process.env.WARM || 1), MIN = Number(process.env.MIN || 4), JOBS = Number(process.env.JOBS || 3);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function measure(st) {
  const ctx = await browser.newContext({ viewport: { width: 300, height: 200 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(process.env.BASE || 'http://localhost:8765/beta/');
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate((st) => { const g = __game; g.applyQuality('low'); g.setUpgrades(st); g.setWallet(1e9); g.setAuto(true); window.__t = 0; }, st);
  const per = [];
  for (let m = 0; m < WARM + MIN; m++) {
    const r = await page.evaluate(() => {
      const g = __game;
      const w0 = g.won, d0 = g.stats.coinsDropped;
      g.play(60, (t) => {
        const now = __t + t;
        if (Math.floor(now / 2) !== Math.floor((now - 1 / 60) / 2)) g.setAim((Math.random() * 2 - 1) * 2.2);
        if (Math.floor(now) !== Math.floor(now - 1 / 60)) {
          if (g.upValue('shake') > 0 && g.shakeCd <= 0) g.startShake();
          if (g.upValue('rain') > 0 && g.rainCd <= 0) g.startRainSkill();
          if (g.upValue('summon') > 0 && g.summonCd <= 0) g.startSummon();
          if (g.freeSpins > 0) g.instantSpin();
        }
      });
      __t += 60;
      g.setWallet(1e9);
      return { won: g.won - w0, dropped: g.stats.coinsDropped - d0, coins: g.coins.length };
    });
    if (m >= WARM) per.push(r);
  }
  await ctx.close();
  const won = per.reduce((n, r) => n + r.won, 0) / MIN, dropped = per.reduce((n, r) => n + r.dropped, 0) / MIN;
  return { state: st, won: Math.round(won), dropped: Math.round(dropped), net: Math.round(won - dropped), perMin: per.map((r) => r.won - r.dropped) };
}
const out = new Array(states.length);
let next = 0;
await Promise.all(Array.from({ length: JOBS }, async () => {
  while (next < states.length) {
    const i = next++;
    out[i] = await measure(states[i]);
    console.log(`#${i} ${JSON.stringify(states[i])}：每分鐘賺 ${out[i].won}、投幣 ${out[i].dropped}、淨賺 ${out[i].net}（各分鐘 ${out[i].perMin.join(' ')}）`);
  }
}));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(out));
await browser.close();
