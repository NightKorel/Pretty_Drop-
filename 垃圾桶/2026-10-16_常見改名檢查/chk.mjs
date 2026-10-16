import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const vp of [{ width: 1000, height: 700 }, { width: 390, height: 780 }]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8765/beta/');
  await page.waitForFunction(() => window.__game, null, { timeout: 240000 });
  const r = await page.evaluate(async () => { const m = await import('./slime.js?v=0.1.1'); return { ver: document.querySelector('.ver').textContent, name: m.RARITY.common.name }; });
  console.log(vp.width, JSON.stringify(r), errs);
}
await browser.close();
