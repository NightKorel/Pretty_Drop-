// 耳朵、翅膀穿模：把史萊姆擺正固定，在零件正上方丟一枚硬幣，看硬幣停在零件上面，還是穿進去
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const out = {};
for (const [id, which] of [['animal.0', 0], ['animal.6', 0], ['animal.8', 2], ['animal.9', 4]]) {
  out[id] = await page.evaluate(([id, which]) => {
    const g = __game; g.applyQuality('low'); g.clearTable();
    const d = g.spawnDoll(id, 1, { x: 0, y: 0.02, z: 0 });
    d.body.setBodyType(1, true); // 固定不動，只看硬幣
    d.mesh.position.copy(d.body.translation());
    d.mesh.updateMatrixWorld(true);
    const parts = d.mesh.children.filter((c) => c.userData.hit);
    const ch = parts[which];
    ch.geometry.computeBoundingBox();
    const top = ch.geometry.boundingBox.getCenter(new (ch.position.constructor)()).applyMatrix4(ch.matrixWorld);
    // 從零件正上方往下射一條線，看先打到什麼高度
    g.world.step();
    const R = g.RAPIER;
    const hitY = (x, z) => { const h = g.world.castRay(new R.Ray({ x, y: 5, z }, { x: 0, y: -1, z: 0 }), 10, true); return h ? +(5 - h.timeOfImpact).toFixed(2) : null; };
    const bb = ch.geometry.boundingBox;
    const topY = new (ch.position.constructor)(0, bb.max.y, 0);
    return { 零件中心高度: +top.y.toFixed(2), 往下射打到的高度: hitY(top.x, top.z) };
  }, [id, which]);
}
const g = await page.evaluate(() => { const c = __game.camera; c.position.set(0, 1.6, 2.6); c.lookAt(0, 0.6, 0); });
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/pd-shots/clip.png' });
console.log(JSON.stringify({ out, errs }));
await browser.close();
