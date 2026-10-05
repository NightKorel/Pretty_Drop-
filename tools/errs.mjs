import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
async function run(name, setup, after) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 800 } });
  const page = await ctx.newPage();
  if (setup) await setup(page);
  await page.goto('http://localhost:8765/');
  await page.waitForTimeout(name === 'ok' || after ? 0 : 8000);
  if (name === 'ok' || after) await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  if (after) { await page.evaluate(after); await page.waitForTimeout(1500); }
  const txt = await page.evaluate(() => [...document.querySelectorAll('div')].filter(d => d.textContent.startsWith('錯誤碼')).map(d => d.textContent.slice(0, 80)).join(' | '));
  console.log(name, '=>', txt || '(沒有錯誤畫面)');
  await page.screenshot({ path: `/tmp/pd-shots/err-${name}.png` });
  await ctx.close();
}
await run('ok');
await run('wasm', p => p.route(/rapier_wasm3d_bg\.wasm/, r => r.abort()));
await run('appjs', p => p.route(/app\.js/, r => r.abort()));
await run('slimejs', p => p.route(/slime\.js/, r => r.abort()));
await run('runtime', null, () => { setTimeout(() => { null.x; }, 0); });
await run('lost', null, () => { document.getElementById('view').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext(); });
await browser.close();
