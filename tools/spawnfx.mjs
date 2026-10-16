// 出現時的光效（2026-10-16，第 15 條）：常見、稀有、傳說史萊姆各放一隻，再放寶石、道具、彩券，
// 把光效撥到一半左右拍照（測試機畫面更新很慢，所以直接撥時間），最後確認光效會自己消失、沒有錯誤。
// 截圖存 /tmp/pd-shots/spawnfx-*.png。參數 low 或 high（預設 high）。
// 用法：BASE=http://localhost:8765/beta/ NPMG=$(npm root -g) node tools/spawnfx.mjs [low|high]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const q = process.argv[2] || 'high';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(process.env.BASE || 'http://localhost:8765/beta/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate((q) => { __game.applyQuality(q); }, q);
const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
async function shot(name, setup, at) {
  await page.evaluate(setup);
  await page.evaluate((at) => { for (const f of __game.spawnFx) f.t = f.dur * at; }, at);
  await frames();
  const n = await page.evaluate(() => __game.spawnFx.map((f) => f.kind));
  await page.screenshot({ path: `/tmp/pd-shots/spawnfx-${q}-${name}.png` });
  console.log(name, '光效：', JSON.stringify(n));
  await page.evaluate(() => { for (const f of __game.spawnFx) f.t = f.dur; });
  await frames();
}
await shot('common', () => __game.dropNewDoll('common'), 0.25);
await shot('rare', () => __game.dropNewDoll('rare'), 0.3);
await shot('legend', () => __game.dropNewDoll('legend'), 0.3);
await shot('summon', () => { __game.setUpgrades({ summon: 2 }); __game.startSummon(); }, 0.2);
await shot('gem', () => { __game.setUpgrades({ gems: 3 }); __game.dropTreasure('pink'); }, 0.2);
await shot('items', () => { __game.dropProp('item'); __game.dropProp('ticket'); }, 0.2);
await page.waitForTimeout(500);
console.log('結束後還剩幾個光效', await page.evaluate(() => __game.spawnFx.length), '錯誤', JSON.stringify(errs));
await browser.close();
