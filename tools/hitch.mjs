// 史萊姆卡頓：量「新的一種第一次放上檯面」「同一種第二次」「掉下前緣跳慶祝小卡」時，畫面最長停多久（毫秒），
// 還有顯示卡多準備了幾種畫法（著色器）
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const q = process.argv[2] || 'low';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 700 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate((q) => {
  __game.applyQuality(q);
  window.__dts = [];
  let last = performance.now();
  const f = (t) => { __dts.push(t - last); last = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
}, q);
await page.waitForTimeout(2500);
// 選這次要測的三組，等熱身做完（NOWARM=1 就跳過熱身，比較用）
await page.evaluate((warm) => (warm ? __game.setSets(['jelly', 'animal', 'gem']) : __game.setSets(['jelly'])), !process.env.NOWARM);
await page.waitForTimeout(8000);
const measure = async (label, fn) => {
  await page.evaluate(() => { __dts.length = 0; });
  await page.waitForTimeout(1500);
  const base = await page.evaluate(() => Math.max(...__dts));
  const p0 = await page.evaluate(() => __game.renderer.info.programs.length);
  await page.evaluate(fn);
  await page.evaluate(() => { __dts.length = 0; });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => ({ max: Math.max(...__dts), progs: __game.renderer.info.programs.length, seq: __dts.slice(0, 25).map(Math.round).join(',') }));
  if (process.env.SEQ) console.log(label, r.seq);
  return `${label}：平常最長 ${Math.round(base)}ms → 之後最長 ${Math.round(r.max)}ms，多準備 ${r.progs - p0} 種畫法`;
};
const out = [];
out.push(await measure('第一次放「鑽石」', () => { __game.spawnDoll('gem.9', 1, { x: 0, y: 2.5, z: -4.6 }); }));
out.push(await measure('第二次放「鑽石」', () => { __game.spawnDoll('gem.9', 1, { x: 1.5, y: 2.5, z: -4.6 }); }));
out.push(await measure('第一次放「孔雀」', () => { __game.spawnDoll('animal.9', 1, { x: -1.5, y: 2.5, z: -4.6 }); }));
out.push(await measure('史萊姆掉下前緣（慶祝小卡）', () => { __game.spawnDoll('jelly.3', 1, { x: 0, y: 1.5, z: 3.6 }); }));
out.push(await measure('第二隻掉下前緣', () => { __game.spawnDoll('jelly.4', 1, { x: 0.8, y: 1.5, z: 3.6 }); }));
console.log(q, out.join('\n'), JSON.stringify(errs), JSON.stringify(await page.evaluate(() => [window.__ct, window.__ct2, window.__ct3])));
await browser.close();
