// 眨眼：做一隻史萊姆，模擬 10 分鐘，數眨了幾次、兩次之間隔多久、眼睛最扁到多少
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r = await page.evaluate(async () => {
  const S = await import('./slime.js');
  const out = {};
  for (const id of ['jelly.0', 'animal.7']) {
    const m = S.makeSlimeMesh(id, 1, false);
    const eye = m.children.find((c) => c.userData.eyeY);
    const base = eye.userData.eyeY;
    let blinks = 0, shut = false, min = 1, last = null;
    const gaps = [];
    for (let t = 0; t < 600; t += 1 / 60) {
      S.updateSlimeEffects(m, t);
      const f = eye.scale.y / base;
      min = Math.min(min, f);
      if (!shut && f < 0.5) { shut = true; blinks++; if (last !== null) gaps.push(+(t - last).toFixed(1)); last = t; }
      if (shut && f > 0.9) shut = false;
    }
    out[id] = { 十分鐘眨幾次: blinks, 眼睛最扁: +min.toFixed(2), 最短間隔: Math.min(...gaps), 最長間隔: Math.max(...gaps) };
  }
  return out;
});
console.log(JSON.stringify({ r, errs }));
await browser.close();
