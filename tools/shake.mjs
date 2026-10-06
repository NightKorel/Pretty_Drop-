// 甩一甩：沒買不能用、買了出現按鈕、甩下去的照樣算（贏或掉側溝）、冷卻倒數、存檔；電腦和手機各一次
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['pc', { width: 1000, height: 650 }], ['phone', { width: 390, height: 780 }]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: name === 'phone', hasTouch: name === 'phone' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto((process.env.BASE || 'http://localhost:8765/'));
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(() => __game.applyQuality('low'));
  const before = await page.evaluate(() => ({ hidden: document.getElementById('skillBtn').hidden }));
  const r = await page.evaluate(() => {
    const g = __game;
    g.setWallet(2000); for (const k of g.UPGRADE_KEYS) g.buy(k);
    const n0 = g.coins.length + g.dolls.length + g.props.length;
    const won0 = g.won, lost0 = g.lost;
    // 往前緣和側溝丟幾枚，讓甩的時候一定有東西掉下去
    for (let i = 0; i < 6; i++) { const c = g.spawnCoin((i - 2.5) * 1.6, 0.4, 2.8); }
    const n1 = g.coins.length + g.dolls.length + g.props.length;
    g.startShake();
    g.simulate(2.9);
    const during = { won: g.won - won0, lost: g.lost - lost0, n: g.coins.length + g.dolls.length + g.props.length };
    g.simulate(3);
    return { n0, n1, during, cd: Math.round(g.shakeCd), shakes: g.stats.shakes };
  });
  await page.waitForTimeout(500);
  const btn = await page.evaluate(() => { const b = document.getElementById('skillBtn'); return { hidden: b.hidden, text: b.textContent, disabled: b.disabled }; });
  await page.screenshot({ path: `/tmp/pd-shots/shake-${name}.png` });
  await page.evaluate(() => __game.saveGame());
  await page.reload();
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  const cdAfter = await page.evaluate(() => Math.round(__game.shakeCd));
  console.log(name, JSON.stringify({ before, r, btn, cdAfter, errs }));
  await ctx.close();
}
await browser.close();
