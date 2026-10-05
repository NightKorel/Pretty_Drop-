// 金幣雨主動技能＋狂熱時間：按金幣雨（冷卻、掉幣）；狂熱值快滿時推下一枚就進入狂熱（20 秒、推板變快、一直下幣、燈光變色），結束後恢復
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { const g = __game; g.applyQuality('low'); g.setWallet(5000); for (const k of ['refill', 'guard', 'speed', 'dropRate', 'lucky', 'rain']) g.buy(k); });
await page.waitForTimeout(300);
const btns = await page.evaluate(() => ({ rain: !document.getElementById('rainBtn').hidden, shake: !document.getElementById('skillBtn').hidden }));
const n0 = await page.evaluate(() => __game.coins.length);
await page.click('#rainBtn');
await page.evaluate(() => __game.play(3));
const rain = await page.evaluate((n0) => ({ 冷卻: Math.round(__game.rainCd), 多了幾枚幣: __game.coins.length - n0, 按鈕字: document.getElementById('rainBtn').textContent }), n0);
// 狂熱：先加到 999，再推下一枚
const fever = await page.evaluate(() => {
  const g = __game;
  g.addFever(999);
  const before = g.fever.gauge;
  g.spawnCoin(0, 0.3, 3.2);
  g.simulate(1.5);
  const f = g.fever;
  return { before, 進入狂熱: f.time > 0, 剩幾秒: Math.round(f.time), body: document.body.className };
});
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/pd-shots/fever.png' });
const during = await page.evaluate(() => { const n0 = __game.coins.length; __game.play(3); return { 三秒多了幾枚: __game.coins.length - n0, 狂熱中推下不加: __game.fever.gauge }; });
const end = await page.evaluate(() => { __game.play(20); return { time: __game.fever.time, body: document.body.className, fevers: __game.stats.fevers }; });
console.log(JSON.stringify({ btns, rain, fever, during, end, errs }));
await browser.close();
