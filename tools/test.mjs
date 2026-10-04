import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.NPMG + '/playwright');
const out = '/tmp/pd-shots/';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, ctxOpts] of [['pc', { viewport: { width: 1280, height: 800 } }], ['phone', devices['iPhone 13']]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  if (name === 'phone') { await page.evaluate(() => __game.applyQuality('low')); }
  const s0 = await page.evaluate(() => ({ n: __game.coins.length, w: __game.wallet, won: __game.won, ys: __game.coins.map(c=>+c.body.translation().y.toFixed(2)).slice(0,5) }));
  await page.screenshot({ path: out + name + '-start.png' });
  // drop 20 coins spread
  for (let i = 0; i < 20; i++) { await page.evaluate((x) => __game.dropAt(x), -3 + (i % 7)); await page.evaluate(() => __game.simulate(0.3)); }
  await page.evaluate(() => __game.simulate(15));
  const s1 = await page.evaluate(() => ({ n: __game.coins.length, w: __game.wallet, won: __game.won }));
  // fps
  const fps = await page.evaluate(() => new Promise(r => { let n=0; const t0=performance.now(); function f(){ n++; if (performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2);} requestAnimationFrame(f); }));
  if (name === 'phone') { await page.tap('#view', { position: { x: 200, y: 400 } }); await page.tap('#settingsBtn'); }
  await page.screenshot({ path: out + name + '-after.png' });
  const q = await page.evaluate(() => __game.quality);
  console.log(name, q, JSON.stringify({ s0, s1, fps, errs }));
  await ctx.close(); // 關掉上一個，不然它在背景一直畫，會拖慢下一個測試
}
await browser.close();
