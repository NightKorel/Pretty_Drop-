// 硬幣圖案：五種圖案各換一次近拍（第三張起配銀色），存檔讀回
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 650 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { __game.applyQuality('high'); const b = document.querySelector('button[data-cheat="ach"]'); for (let i = 0; i < 120; i++) b.click(); });
await page.click('#achBtn'); await page.click('button[data-achtab="shop"]');
let k = 0;
for (const id of ['faceStar', 'faceHeart', 'coinSilver', 'facePaw', 'faceClover', 'faceCrown']) {
  await page.evaluate(() => document.querySelectorAll('#ach details.grp').forEach((d) => { d.open = true; }));
  await page.click(`button[data-decorbuy="${id}"]`); await page.waitForTimeout(100);
  if (id === 'coinSilver') continue;
  await page.evaluate(() => { document.getElementById('ach').classList.remove('show'); const c = __game.camera; c.position.set(0, 3.2, 6.2); c.lookAt(0, 0, 1.8); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `/tmp/pd-shots/coinface-${k++}.png` });
  await page.click('#achBtn'); await page.click('button[data-achtab="shop"]');
}
await page.evaluate(() => __game.saveGame());
await page.reload(); await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const eq = await page.evaluate(() => __game.saveData().equipped);
console.log(JSON.stringify({ eq, errs }));
await browser.close();
