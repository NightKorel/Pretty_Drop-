// 燈光：四種燈光各預覽一次拍照，最後買下夜晚霓虹、重新整理看還在
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 650 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { __game.applyQuality('mid'); });
await page.evaluate(() => { const b = document.querySelector('button[data-cheat="ach"]'); for (let i = 0; i < 20; i++) b.click(); __game.spawnDoll('ice.7', 1, { x: 0, y: 1, z: 0.5 }); __game.spawnDoll('metal.9', 1, { x: 1.6, y: 1, z: 0.8 }); __game.simulate(1); });
await page.click('#achBtn'); await page.click('button[data-achtab="shop"]');
for (const id of ['lightDay', 'lightSunset', 'lightMoon', 'lightNeon']) {
  await page.evaluate(() => document.querySelectorAll('#ach details.grp').forEach((d) => { d.open = true; }));
  await page.click(`[data-preview="${id}"]`); await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/pd-shots/light-${id}.png` });
  if (id !== 'lightNeon') { await page.click('#previewBack'); await page.waitForTimeout(150); }
}
await page.click('#previewAct'); await page.waitForTimeout(200);
await page.evaluate(() => __game.saveGame());
await page.reload(); await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const eq = await page.evaluate(() => __game.saveData().equipped);
console.log(JSON.stringify({ eq, errs }));
await browser.close();
