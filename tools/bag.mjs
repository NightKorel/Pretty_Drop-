// 娃娃袋子：選 1、2、3 組各抽很多隻，看每一種出現幾次、同一組有沒有連續出現
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
for (const sets of [['jelly'], ['jelly', 'sweets'], ['jelly', 'sweets', 'metal']]) {
  const r = await page.evaluate((sets) => {
    const g = __game; g.applyQuality('low'); g.setSets(sets);
    const n = sets.length * 10 * 3; // 剛好一袋
    const seq = [];
    for (let i = 0; i < n * 2; i++) { // 抽兩袋
      g.dropNewDoll();
      const d = g.dolls[g.dolls.length - 1];
      seq.push(d.id);
      g.clearTable();
    }
    const firstBag = {};
    for (const id of seq.slice(0, n)) firstBag[id] = (firstBag[id] || 0) + 1;
    const counts = Object.values(firstBag);
    let repeats = 0;
    for (let i = 1; i < seq.length; i++) if (seq[i].split('.')[0] === seq[i - 1].split('.')[0]) repeats++;
    return { 一袋幾隻: n, 種類: counts.length, 每種最少: Math.min(...counts), 每種最多: Math.max(...counts), 同組連續次數: repeats, 前20隻: seq.slice(0, 20).map((x) => x.split('.')[0][0]).join('') };
  }, sets);
  console.log(sets.join('+'), JSON.stringify(r));
}
console.log(JSON.stringify(errs));
await browser.close();
