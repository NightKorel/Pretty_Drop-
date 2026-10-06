import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const variants = JSON.parse(process.argv[2]);
for (const v of variants) {
  const res = [];
  for (let trial = 0; trial < 4; trial++) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto((process.env.BASE || 'http://localhost:8765/'));
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  const r = await page.evaluate((v) => {
    const g = __game; g.applyQuality('low'); g.setWallet(100000);
    const w = g.world;
    const apply = (c) => {
      const col = c.body.collider(0);
      if (v.skin != null) col.setContactSkin(v.skin);
      if (v.ad != null) c.body.setAngularDamping(v.ad);
      if (v.ld != null) c.body.setLinearDamping(v.ld);
      if (v.ccd === false) c.body.enableCcd(false);
    };
    if (v.iter) w.numSolverIterations = v.iter;
    if (v.pgs) w.numInternalPgsIterations = v.pgs;
    g.coins.forEach(apply);
    for (let i = 0; i < 40; i++) { g.dropAt((Math.random()*2-1)*2); g.coins.forEach(apply); g.simulate(0.3); }
    g.simulate(5);
    // measure 3s
    const N = 180; const st = new Map();
    for (const c of g.coins) { const t = c.body.translation(); st.set(c, { x0: t.x, y0: t.y, z0: t.z, px: t.x, py: t.y, pz: t.z, path: 0, rot: 0, q: c.body.rotation() }); }
    for (let i = 0; i < N; i++) {
      g.simulate(1/60);
      for (const c of g.coins) { const s = st.get(c); if (!s) continue; const t = c.body.translation(); s.path += Math.hypot(t.x-s.px, t.y-s.py, t.z-s.pz); s.px=t.x; s.py=t.y; s.pz=t.z; const q = c.body.rotation(); const dot = Math.min(1, Math.abs(q.x*s.q.x+q.y*s.q.y+q.z*s.q.z+q.w*s.q.w)); s.rot += 2*Math.acos(dot); s.q = q; }
    }
    let jit = 0;
    for (const [c, s] of st) {
      if (!g.coins.includes(c)) continue;
      if (s.z0 < -2.2 && s.y0 > 0.45) continue;
      const net = Math.hypot(s.px-s.x0, s.py-s.y0, s.pz-s.z0);
      if (net < 0.08 && (s.path > 0.15 || s.rot > 0.6)) jit++;
    }
    return jit;
  }, v);
  res.push(r);
  await ctx.close();
  }
  console.log(JSON.stringify(v), res);
}
await browser.close();
