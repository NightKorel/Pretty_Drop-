// 新手提示：全新存檔照順序跳提示、做了就收、舊存檔不跳、重看按鈕；手機拍一張提示框
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const seq = await page.evaluate(() => {
  const g = __game; const log = [];
  const note = () => { const n = g.tutorNow; if (n && log[log.length - 1] !== n) log.push(n); };
  g.play(3, note);
  for (let i = 0; i < 4; i++) { g.dropAt(0); g.play(1.2, note); }
  g.play(10, note);
  for (let i = 0; i < 20; i++) { g.dropAt(0); g.play(1.1, note); }
  g.play(14, note);
  g.setWallet(0); g.play(12, note);
  g.setWallet(500); g.play(4, note);
  g.giveSpins(1); g.play(4, note);
  return { log, seen: [...g.tutorSeen] };
});
await page.waitForTimeout(800);
const now = await page.evaluate(() => __game.tutorNow);
await page.screenshot({ path: '/tmp/pd-shots/tutor.png' });
// 舊存檔（沒有 tutor 這一項、投過幣）不跳：另開一頁，載入前先放好存檔
const saves = await page.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) o[k] = localStorage[k]; return o; });
const sk = Object.keys(saves).find((k) => { try { return JSON.parse(saves[k]).stats; } catch (e) { return false; } });
const d = JSON.parse(saves[sk]); delete d.tutor; saves[sk] = JSON.stringify(d);
await page.close();
const p2 = await ctx.newPage();
p2.on('pageerror', (e) => errs.push('p2: ' + e.message));
await p2.addInitScript((o) => { if (!sessionStorage.done) { for (const k in o) localStorage[k] = o[k]; sessionStorage.done = 1; } }, saves);
await p2.goto('http://localhost:8765/');
await p2.waitForFunction(() => window.__game, null, { timeout: 90000 });
const old = await p2.evaluate(() => { __game.play(5); return { now: __game.tutorNow, seen: __game.tutorSeen.size }; });
const pickTip = await p2.evaluate(() => document.querySelector('#qualityPick .viewerTip').textContent + ' / rec=' + document.querySelector('#qualityPick .rec').dataset.pick);
console.log(JSON.stringify({ seq, now, old, pickTip, errs }));
await browser.close();
