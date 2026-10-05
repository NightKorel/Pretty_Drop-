// 入賞口：平常收著、偶爾滑出來（忽快忽慢）、瞄準洞口投幣會入賞（掉小獎、滑回去）、沒對準的彈開；拍照
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 650 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  const g = __game;
  g.applyQuality('mid');
  g.setWallet(500);
  const out = { hits: 0, tries: 0, startState: g.prize.state };
  // 自然出現：模擬 10 分鐘，數出來幾次
  let shows = 0, last = g.prize.state;
  for (let i = 0; i < 600; i++) { g.simulate(1); const st = g.prize.state; if (last === 'off' && st !== 'off') shows++; last = st; }
  out.showsIn10min = shows;
  const waitOff = () => { for (let i = 0; i < 40 && g.prize.state !== 'off'; i++) g.simulate(0.5); };
  // 叫它出來，跟著洞口瞄準投（每次入賞後會滑回去）
  const speeds = [];
  for (let k = 0; k < 8; k++) {
    waitOff();
    g.showPrize();
    g.simulate(2.5);
    speeds.push(Math.abs(g.prize.v).toFixed(2));
    const before = g.stats.prizes;
    g.dropAt(g.prize.x + g.prize.v * 0.25);
    out.tries++;
    g.simulate(1.5);
    if (g.stats.prizes > before) out.hits++;
  }
  out.speeds = speeds.join(' ');
  // 收著的時候對準軌道中間投，不會入賞
  waitOff();
  const b0 = g.stats.prizes;
  g.dropAt(0); g.simulate(1.5);
  out.offStateHit = g.stats.prizes - b0;
  // 故意投在洞口旁邊 1 格
  g.showPrize(); g.simulate(2.5);
  const b2 = g.stats.prizes;
  g.dropAt(g.prize.x + 1.0);
  g.simulate(1.5);
  out.offHit = g.stats.prizes - b2;
  out.spins = g.freeSpins;
  return out;
});
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/pd-shots/prize.png' });
console.log(JSON.stringify({ ...r, errs }));
await browser.close();
