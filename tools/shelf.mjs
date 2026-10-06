// 娃娃展示架：圖鑑放大展示按「擺上展示架」、擺 6 隻、第 7 隻提示滿了、拿下來、重新整理還在；電腦（兩側）和手機（前面一排）各拍一張
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['pc', { width: 1000, height: 650 }], ['phone', { width: 390, height: 780 }]]) {
  const page = await (await browser.newContext({ viewport: vp, isMobile: name === 'phone', hasTouch: name === 'phone' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto((process.env.BASE || 'http://localhost:8765/'));
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  const ids = ['animal.0', 'ice.7', 'gem.9', 'drink.6', 'jelly.9', 'metal.9', 'sweets.0'];
  const r = await page.evaluate((ids) => {
    const g = __game; g.applyQuality('mid');
    for (const id of ids) g.collection[id] = 1;
    const hiddenUnowned = (g.openViewer('animal.5'), document.getElementById('shelfBtn').hidden);
    const texts = [];
    for (const id of ids) { g.openViewer(id); document.getElementById('shelfBtn').click(); texts.push(document.getElementById('shelfBtn').textContent); }
    const toast = document.getElementById('toast').textContent;
    g.openViewer('ice.7'); document.getElementById('shelfBtn').click(); // 拿下來
    g.openViewer('sweets.0'); document.getElementById('shelfBtn').click(); // 補上
    document.getElementById('viewerClose').click();
    g.saveGame();
    return { hiddenUnowned, texts, toast, shelf: [...g.shelf] };
  }, ids);
  await page.reload(); await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => [...__game.shelf]);
  await page.screenshot({ path: `/tmp/pd-shots/shelf-${name}.png` });
  console.log(name, JSON.stringify({ ...r, after, errs }));
  await page.close();
}
await browser.close();
