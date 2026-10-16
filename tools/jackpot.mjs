// 累計獎池和轉盤按鈕（2026-10-16，第 17、18 條）：
// 兩個按鈕永遠都在、按鈕上的字；獎池起始 500、花錢抽 +30、免費抽 +10；很多次免費抽看大獎多久中一次、平均拿回多少；
// 彩票升到 3 級後價錢、獎池跟著乘；存檔讀回獎池還在。截圖存 /tmp/pd-shots/jackpot-*.png（轉盤、升級後的轉盤、大獎慶祝畫面）。
// 用法：BASE=http://localhost:8765/beta/ NPMG=$(npm root -g) node tools/jackpot.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(process.env.BASE || 'http://localhost:8765/beta/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { __game.applyQuality('low'); __game.setWallet(100000); });
await page.click('#lotteryBtn');
const btns = () => page.evaluate(() => ['freeSpinBtn', 'paySpinBtn'].map((id) => { const b = document.getElementById(id); return { text: b.textContent, disabled: b.disabled, shown: b.offsetWidth > 0 }; }));
const pool = () => page.evaluate(() => ({ base: __game.jackpotBase, text: document.getElementById('jackpotPool').textContent }));
console.log('沒彩券時的按鈕', JSON.stringify(await btns()), '獎池', JSON.stringify(await pool()));
await page.screenshot({ path: '/tmp/pd-shots/jackpot-wheel.png' });
await page.click('#paySpinBtn');
await page.waitForFunction(() => !document.getElementById('paySpinBtn').disabled, null, { timeout: 20000 });
console.log('花錢抽一次後', JSON.stringify(await pool()), await page.textContent('#wheelResult'));
await page.evaluate(() => __game.giveSpins(2));
await page.evaluate(() => { const b = document.getElementById('freeSpinBtn'); b.click(); });
console.log('有 2 張彩券、按了一次免費抽（轉的途中）', JSON.stringify(await btns()));
await page.waitForFunction(() => !document.getElementById('paySpinBtn').disabled, null, { timeout: 20000 });
console.log('免費抽一次後', JSON.stringify(await pool()), await page.textContent('#wheelResult'), JSON.stringify(await btns()));
// 很多次免費抽（直接算結果，不轉動畫）：大獎多久中一次、平均拿回多少
const stat = await page.evaluate(() => {
  const g = __game; const N = 32000;
  let wins = 0, got = 0, poolWon = 0;
  g.giveSpins(N);
  for (let i = 0; i < N; i++) { const w0 = g.won, b0 = g.jackpotBase; g.instantSpin(); const d = g.won - w0; got += d; if (g.jackpotBase < b0) { wins++; poolWon += d; } }
  return { 抽: N, 中大獎: wins, 平均幾抽中一次: +(N / wins).toFixed(2), 平均一次拿回: +(got / N).toFixed(1), 中大獎平均拿: Math.round(poolWon / wins) };
});
console.log('免費抽 32000 次', JSON.stringify(stat));
await page.evaluate(() => { __game.setUpgrades({ lottery: 3 }); __game.saveGame(); });
await page.click('#wheelClose');
await page.click('#lotteryBtn');
console.log('彩票 3 級', JSON.stringify(await btns()), JSON.stringify(await pool()));
await page.screenshot({ path: '/tmp/pd-shots/jackpot-wheel30.png' });
const before = await page.evaluate(() => __game.jackpotBase);
await page.evaluate(() => __game.saveGame());
await page.reload();
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
console.log('重新整理後獎池', before, '→', await page.evaluate(() => __game.jackpotBase));
await page.evaluate(() => { __game.applyQuality('low'); __game.jackpotCelebrate(15000); });
// 測試機畫面更新很慢，動畫時間不會自己走；直接把慶祝畫面的動畫撥到第 1.2 秒再拍
await page.evaluate(() => document.getElementById('jackpotFx').getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = 1200; }));
await page.screenshot({ path: '/tmp/pd-shots/jackpot-fx.png' });
console.log('錯誤', JSON.stringify(errs));
await browser.close();
