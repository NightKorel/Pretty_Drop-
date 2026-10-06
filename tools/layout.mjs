// 重新產生開局硬幣擺法 start-layout.js：清空檯面，隨機撒幣，模擬到穩定再存下來
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const fs = require('fs');
const N = Number(process.argv[2] || 130);
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const d = await page.evaluate((N) => {
  const g = __game; g.applyQuality('low'); g.clearTable();
  // 跟原本一樣的撒法：推板前面一點到前緣前面一點，一層一層疊上去
  for (let i = 0; i < N; i++) {
    const x = (Math.random() * 2 - 1) * (3.85 - 0.5 - 0.1);
    const z = -4.5 + Math.random() * (3 - 0.7 + 4.5);
    g.spawnCoin(x, 0.4 + (i % 6) * 0.35, z, 0.3);
    if (i % 20 === 19) g.simulate(0.3);
  }
  g.simulate(6);
  const s = g.saveData();
  return { coins: s.coins, phase: s.pusherPhase };
}, N);
const out = `// 開局檯面上的硬幣擺法（事先模擬好、已經落定），省掉每次開遊戲都要等硬幣掉下來的時間。\n// 由 tools/layout.mjs 產生：清空檯面、隨機撒幣、模擬到穩定，再把位置存下來。改了硬幣大小或檯面要重跑。\nexport const START_PHASE = ${d.phase.toFixed(4)};\nexport const START_LAYOUT = ${JSON.stringify(d.coins)};\n`;
fs.writeFileSync('/home/user/Pretty_Drop-/start-layout.js', out);
console.log(d.coins.length, d.phase);
await browser.close();
