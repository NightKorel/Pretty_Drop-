// 彩券轉盤：連轉幾次，看停下來指針指的那一格，跟拿到的錢一不一樣；再模擬很多次算平均拿回多少
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { __game.applyQuality('low'); __game.setWallet(100000); });
await page.click('#lotteryBtn');
const res = [];
for (let i = 0; i < 6; i++) {
  const w0 = await page.evaluate(() => __game.wallet);
  await page.click('#paySpinBtn');
  await page.waitForFunction(() => !document.getElementById('paySpinBtn').disabled, null, { timeout: 20000 });
  const r = await page.evaluate((w0) => ({ got: __game.wallet - w0 + 100, top: __game.WHEEL[__game.wheelTop]?.coins, text: document.getElementById('wheelResult').textContent }), w0);
  res.push(r);
}
await page.screenshot({ path: '/tmp/pd-shots/wheel-after.png' });
const ok = res.every((r) => Math.abs(r.got - r.top) <= r.top * 0.06 + 1); // 收入加成 0 級時應該一樣
console.log(JSON.stringify({ 每次: res.map((r) => `${r.text}（指針指 ${r.top}）`), 對得上: ok, errs }));
await browser.close();
