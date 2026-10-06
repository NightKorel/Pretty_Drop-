// 第一次打開選畫質：手機打開（?pick=1 強制問）、選「低」、遊戲開起來；重新整理不再問；3D 畫面被關掉時自動改低畫質
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/') + '?pick=1');
await page.waitForSelector('#qualityPick.show', { timeout: 90000 });
const waiting = await page.evaluate(() => ({ 遊戲還沒開始: !window.__game, 建議: document.querySelector('#qualityPick .rec')?.dataset.pick }));
await page.screenshot({ path: '/tmp/pd-shots/qpick.png' });
await page.click('[data-pick="low"]');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const picked = await page.evaluate(() => ({ quality: __game.quality, stored: localStorage.getItem('pretty_drop_quality') }));
await page.goto((process.env.BASE || 'http://localhost:8765/') + '?pick=1');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const again = await page.evaluate(() => ({ 又問: document.getElementById('qualityPick').classList.contains('show'), quality: __game.quality }));
// 改回高畫質，再模擬 3D 畫面被系統關掉
await page.evaluate(() => { __game.applyQuality('high'); document.getElementById('view').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext(); });
await page.waitForTimeout(500);
const lost = await page.evaluate(() => localStorage.getItem('pretty_drop_quality'));
console.log(JSON.stringify({ waiting, picked, again, 三D被關掉後存的畫質: lost, errs }));
await browser.close();
