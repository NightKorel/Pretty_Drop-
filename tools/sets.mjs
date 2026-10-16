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
    // 果凍收齊、第二套沒收齊：抽 2000 次看比例（應該大約 1：3）
    for (let i = 0; i < 10; i++) g.collection[`jelly.${i}`] = 1;
    const cnt = {}; let same = 0; let last = null;
    for (let k = 0; k < 2000; k++) { const id = g.pickDollId(new Set()); const st = id.split('.')[0]; cnt[st] = (cnt[st] || 0) + 1; if (st === last) same++; last = st; }
    o.ratio = JSON.stringify(cnt); o.sameInRow = same;
    // 排除第二套：只剩果凍
    const second = g.activeSets.find((x) => x !== 'jelly');
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
