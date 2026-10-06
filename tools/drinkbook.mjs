// 飲料組：冰品收集 6 種後圖鑑出現飲料頁，拍飲料頁的小圖和珍珠奶茶的放大展示，電腦和手機各一次
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['pc', { width: 1000, height: 700 }], ['phone', { width: 390, height: 780 }]]) {
  const page = await (await browser.newContext({ viewport: vp, isMobile: name === 'phone', hasTouch: name === 'phone' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto((process.env.BASE || 'http://localhost:8765/'));
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  const before = await page.evaluate(() => { const g = __game; for (const st of ['jelly', 'metal', 'sweets', 'animal', 'gem', 'ice']) for (let i = 0; i < 6; i++) g.collection[`${st}.${i}`] = 1; for (let i = 0; i < 5; i++) g.collection[`gem.${i}`] = 1; g.checkAchievements(); return document.querySelectorAll('[data-set="drink"]').length; });
  await page.evaluate(() => { __game.collection['gem.5'] = 1; for (let i = 0; i < 10; i++) if (i !== 2) __game.collection[`drink.${i}`] = 1; });
  await page.click('#bookBtn'); await page.waitForTimeout(200);
  const tabs = await page.evaluate(() => [...document.querySelectorAll('#bookList [data-set]')].map((b) => b.dataset.set + (b.disabled ? '(鎖)' : '')));
  const t = await page.$('#bookList [data-set="drink"]');
  if (t) await t.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/pd-shots/drinkbook-${name}.png` });
  await page.evaluate(() => __game.openViewer('drink.6')); await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/pd-shots/drinkview-${name}.png` });
  console.log(name, JSON.stringify({ before, tabs, errs }));
  await page.close();
}
await browser.close();
