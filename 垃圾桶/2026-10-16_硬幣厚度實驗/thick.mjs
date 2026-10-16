// 硬幣厚度比較（2026-10-16）：給幾個網址（每個是改了 COIN_H 的 beta 複本），各自量
//   開局落定後：檯面幾枚、幣的平均高度、最高疊多高；自動投幣 2 分鐘：推下幾枚、掉側溝幾枚；再拍一張同角度截圖。
// 用法：先開伺服器、跑 make.sh，再
//   NPMG=$(npm root -g) node 垃圾桶/2026-10-16_硬幣厚度實驗/thick.mjs http://localhost:8765/_t14/ http://localhost:8765/_t11/ http://localhost:8765/_t09/
// 原地抖動另外用 tools/jit.mjs（BASE 設成複本網址，參數 '[{}]'）。截圖存 /tmp/pd-shots/thick-序號.png
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
mkdirSync('/tmp/pd-shots', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
let n = 0;
for (const url of process.argv.slice(2)) {
  n++;
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
  const r = await page.evaluate(() => {
    const g = __game; g.applyQuality('low'); g.setAuto(false);
    g.simulate(10);
    const ys = g.coins.map((c) => c.body.translation().y);
    const settle = { coins: g.coins.length, avgY: +(ys.reduce((a, b) => a + b, 0) / ys.length).toFixed(3), maxY: +Math.max(...ys).toFixed(3), minY: +Math.min(...ys).toFixed(3) };
    const w0 = g.won, l0 = g.lost;
    g.setAuto(true);
    g.play(120, () => { if (g.wallet < 50) g.setWallet(200); });
    g.setAuto(false);
    return { settle, play: { won: g.won - w0, lost: g.lost - l0, coins: g.coins.length } };
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `/tmp/pd-shots/thick-${n}.png` });
  console.log(url, JSON.stringify(r), errs.length ? errs : '');
}
await browser.close();
