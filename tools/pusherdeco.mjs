// 推板換色、推板花紋、銀色硬幣：買、裝上、拍照、存檔讀回
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 650 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { __game.applyQuality('mid'); });
await page.click('#achBtn'); await page.waitForTimeout(200);
await page.evaluate(() => { const b = document.querySelector('button[data-cheat="ach"]'); for (let i = 0; i < 200; i++) b.click(); });
await page.click('button[data-achtab="shop"]'); await page.waitForTimeout(100);
const combos = [['pusherPink', 'decoHearts', 'coinSilver'], ['pusherBlack', 'decoStars', 'coinRose'], ['pusherMint', 'decoCandy', 'coinSilver']];
let k = 0;
for (const c of combos) {
  for (const id of c) {
    await page.evaluate(() => document.querySelectorAll('#ach details.grp').forEach((d) => { d.open = true; }));
    const buy = await page.$(`button[data-decorbuy="${id}"]`);
    if (buy) await buy.click(); else await page.click(`button[data-decoruse="${id}"]`);
    await page.waitForTimeout(80);
  }
  await page.click('#achClose'); await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/pd-shots/pdeco-${k++}.png` });
  await page.click('#achBtn'); await page.waitForTimeout(100);
  await page.click('button[data-achtab="shop"]'); await page.waitForTimeout(100);
}
await page.evaluate(() => document.querySelectorAll('#ach details.grp').forEach((d) => { d.open = true; }));
await page.screenshot({ path: '/tmp/pd-shots/pdeco-shop.png' });
await page.evaluate(() => __game.saveGame());
await page.reload(); await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const eq = await page.evaluate(() => JSON.parse(localStorage.getItem('pretty_drop_save')).equipped);
console.log(JSON.stringify({ eq, errs }));
await browser.close();
