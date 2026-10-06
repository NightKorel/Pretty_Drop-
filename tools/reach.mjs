// 長推板：發動後推板最遠推到哪、那一趟多久、有沒有東西卡在擋牆後面（同時一直投幣、下金幣雨）
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  const g = __game; g.applyQuality('low');
  const pz = () => g.world.bodies.get(0) && 0; // 佔位
  let maxFront = -99, normalMax = -99, longStart = null, longEnd = null;
  const pusherZ = () => { let z = -99; g.world.forEachRigidBody((b) => { if (b.isKinematic()) z = b.translation().z; }); return z; };
  for (let i = 0; i < 300; i++) { g.simulate(1 / 60); normalMax = Math.max(normalMax, pusherZ()); }
  g.triggerItem('reach');
  g.startRain();
  for (let i = 0; i < 60 * 20; i++) {
    if (i % 30 === 0) g.dropAt((Math.random() * 2 - 1) * 2);
    g.simulate(1 / 60);
    const z = pusherZ();
    if (z > normalMax + 0.05 && longStart === null) longStart = i / 60;
    if (longStart !== null && longEnd === null && z < normalMax - 0.5 && i / 60 > longStart + 1) longEnd = i / 60;
    maxFront = Math.max(maxFront, z);
  }
  const behind = g.coins.filter((c) => { const t = c.body.translation(); return t.z < -6.5 && t.y < 0.45; }).length;
  return { 平常推板最遠: +normalMax.toFixed(2), 長推板最遠: +maxFront.toFixed(2), 開始伸長在第幾秒: longStart, 卡在牆後的幣: behind };
});
console.log(JSON.stringify({ r, errs }));
await browser.close();
