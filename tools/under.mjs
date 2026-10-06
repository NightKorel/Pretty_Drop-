// 硬幣卡在推板下面：長時間自動投幣（含金幣雨、長推板），每秒數一次有幾枚幣跑進推板的體積裡
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
  g.setWallet(100000);
  let pb = null;
  g.world.forEachRigidBody((b) => { if (b.isKinematic()) pb = b; });
  const half = pb.collider(0).halfExtents();
  let worst = 0; const totals = {}; const ex = []; const ex2 = [];
  const samples = [];
  for (let s = 0; s < 240; s++) {
    if (s % 40 === 5) g.startRain();
    if (s % 30 === 10) g.triggerItem('reach');
    for (let i = 0; i < 60; i++) { if (i % 20 === 0) g.dropAt((Math.random() * 2 - 1) * 2.5); g.simulate(1 / 60); }
    const p = pb.translation();
    const front = p.z + half.z, back = p.z - half.z, top = p.y + half.y;
    const cat = { 推板體積裡: 0, 陷進檯面: 0, 推板後面地上: 0, 推板前緣底下斜插: 0 };
    for (const c of g.coins) {
      const t = c.body.translation();
      if (t.y < -0.3 || Math.abs(t.x) > half.x) continue;
      const q = c.body.rotation();
      const tilt = Math.abs(2 * (q.x * q.x + q.z * q.z) - 1); // 1 平躺、0 立起來
      if (t.z > back && t.z < front - 0.05 && t.y < top - 0.08) cat.推板體積裡++;
      else if (t.y < 0.04) { cat.陷進檯面++; if (ex2.length < 8) ex2.push([t.x, t.y, t.z, front].map((v) => +v.toFixed(2))); }
      else if (t.z < back && t.y < 0.45) { cat.推板後面地上++; if (ex.length < 6) ex.push([t.x, t.y, t.z, back].map((v) => +v.toFixed(2))); }
      else if (t.z > front - 0.05 && t.z < front + 0.5 && t.y < 0.35 && tilt < 0.8) cat.推板前緣底下斜插++;
    }
    for (const k in cat) { totals[k] = (totals[k] || 0) + cat[k]; worst = Math.max(worst, cat[k]); }
    if (Object.values(cat).some((v) => v) && samples.length < 4) samples.push({ s, ...cat });
  }
  return { 陷進的例子_xyz和推板前緣: ex2, 後面的例子_xyz和推板尾巴: ex, 四分鐘每秒數一次加總: totals, 最多同時: worst, 例子: samples };
});
console.log(JSON.stringify({ r, errs }));
await browser.close();
