// 換套系統（2026-10-16 起）：解鎖的套全部都會掉、可以排除、還沒收齊的套比重比較高。電腦和手機各一次。
// 用法：BASE=http://localhost:8765/beta/ NPMG=$(npm root -g) node tools/sets.mjs
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
    const g = __game; const o = {};
    o.start = g.activeSets.join(',');
    // 果凍收 6 種 → 第二套解鎖，推下娃娃那段會呼叫 syncActiveSets
    for (let i = 0; i < 6; i++) g.collection[`jelly.${i}`] = 1;
    g.syncActiveSets(); o.after6 = g.activeSets.join(',');
    // 抽 n 次：每套比例、最長連續同一套、三次內有沒有重複同一隻
    const draw = (n) => {
      const cnt = {}; let run = 0; let maxRun = {}; let last = null; const ids = []; let rep3 = 0;
      for (let k = 0; k < n; k++) {
        const id = g.pickDollId(new Set()); const st = id.split('.')[0];
        cnt[st] = (cnt[st] || 0) + 1; run = st === last ? run + 1 : 1; last = st; maxRun[st] = Math.max(maxRun[st] || 0, run);
        if (ids.slice(-3).includes(id)) rep3++; ids.push(id);
      }
      const pct = Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, Math.round(v / n * 100) + '%']));
      return JSON.stringify({ pct, maxRun, rep3 });
    };
    // 2 套、果凍收齊、第二套沒收齊：平分、最多連 2 隻
    for (let i = 0; i < 10; i++) g.collection[`jelly.${i}`] = 1;
    o.twoSets = draw(4000);
    // 7 套全開、只有最後一套沒收齊：最後一套大約四成多，收齊的不連續
    for (const st of g.SLIME_SETS) for (let i = 0; i < 10; i++) g.collection[`${st.id}.${i}`] = 1;
    for (const st of g.SLIME_SETS) g.setUnlocked(st);
    const lastSet = g.SLIME_SETS[g.SLIME_SETS.length - 1].id;
    for (let i = 0; i < 10; i++) delete g.collection[`${lastSet}.${i}`];
    g.syncActiveSets(); o.sevenSets = g.activeSets.length + ' 套 ' + draw(6000);
    // 7 套、只有果凍收齊：平分（收齊的那套不會被抬高）
    for (const st of g.SLIME_SETS) for (let i = 0; i < 10; i++) delete g.collection[`${st.id}.${i}`];
    for (let i = 0; i < 10; i++) g.collection[`jelly.${i}`] = 1;
    o.oneDone = draw(6000);
    for (const st of g.SLIME_SETS) for (let i = 0; i < 10; i++) delete g.collection[`${st.id}.${i}`];
    for (let i = 0; i < 6; i++) g.collection[`jelly.${i}`] = 1;
    g.excludedSets.clear(); g.syncActiveSets();
    o.beforeExclude = g.activeSets.join(',');
    // 排除第二套：只剩果凍
    const second = g.activeSets.find((x) => x !== 'jelly');
    for (const st of g.activeSets.filter((x) => x !== 'jelly' && x !== second)) g.excludedSets.add(st); g.syncActiveSets();
    document.getElementById('bookBtn').click();
    document.querySelector(`button[data-set="${second}"]`).click();
    document.querySelector(`button[data-use="${second}"]`).click();
    o.excluded = g.activeSets.join(',');
    o.bookUse = document.querySelector('.bookUse').textContent;
    document.querySelector(`button[data-use="${second}"]`).click();
    o.restored = g.activeSets.join(',');
    // 只剩一套時不能排除
    document.querySelector('button[data-set="jelly"]').click();
    g.excludedSets.add(second); g.syncActiveSets(); document.querySelector('button[data-set="jelly"]').click();
    o.lastOne = document.querySelector('.bookUse').textContent;
    g.excludedSets.clear(); g.syncActiveSets();
    g.saveGame(); return o;
  });
  await page.reload(); await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
  r.reloaded = await page.evaluate(() => __game.activeSets.join(','));
  await page.evaluate(() => localStorage.clear());
  console.log(vp.width, JSON.stringify(r, null, 1), errs);
}
await browser.close();
