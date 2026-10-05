// 動物組：圖鑑小圖、天使和小蝙蝠的放大展示（看耳朵、翅膀、光環）
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 650 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { const g = __game; for (const s of ['jelly', 'sweets', 'metal', 'animal']) for (let i = 0; i < 10; i++) g.collection[`${s}.${i}`] = 1; });
await page.click('#bookBtn');
await page.waitForTimeout(300);
await page.evaluate(() => { const b = [...document.querySelectorAll('#book button')].find((x) => x.textContent.includes('動物')); b && b.click(); });
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/pd-shots/animal-book.png' });
for (const id of ['animal.9', 'animal.8']) {
  await page.evaluate((id) => __game.openViewer(id), id);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `/tmp/pd-shots/animal-${id}.png` });
  await page.keyboard.press('Escape');
}
console.log(JSON.stringify(errs));
await browser.close();
