// 組的解鎖順序（果凍 → 金屬 → 甜點 → 動物 → 寶石）、舊存檔解鎖過的不會被鎖回去、圖鑑分頁順序、裝飾品同類同價
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
async function run(save) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 650 } });
  if (save) await ctx.addInitScript((json) => { if (!sessionStorage.getItem('t')) { localStorage.setItem('pretty_drop_save', json); sessionStorage.setItem('t', '1'); } }, save);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.click('#bookBtn');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({
    分頁: [...document.querySelectorAll('#book .bookTab')].map((b) => b.textContent.replace('・使用中', '') + (b.classList.contains('locked') ? '(鎖)' : '')).join(' '),
    使用中: __game.activeSets.join(','),
  }));
  const base = await page.evaluate(() => __game.saveData());
  await ctx.close();
  return { r, errs, base };
}
const fresh = await run(null);
// 新存檔：果凍收集 6 種
const d1 = { ...fresh.base, collection: Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`jelly.${i}`, 1])) };
delete d1.unlockedSets;
d1.unlockedSets = ['jelly'];
const a = await run(JSON.stringify(d1));
// 舊存檔（沒有 unlockedSets）：果凍 6 種、甜點 6 種、金屬 0 種，正在用甜點
const d2 = { ...fresh.base, collection: Object.fromEntries([...[0, 1, 2, 3, 4, 5].map((i) => [`jelly.${i}`, 1]), ...[0, 1, 2, 3, 4, 5].map((i) => [`sweets.${i}`, 1])]), activeSets: ['sweets'] };
delete d2.unlockedSets;
const b = await run(JSON.stringify(d2));
const prices = await (async () => { const ctx = await browser.newContext(); const p = await ctx.newPage(); await p.goto('http://localhost:8765/'); const r = await p.evaluate(async () => { const m = await import('./achievements.js'); const o = {}; for (const d of m.DECORATIONS) (o[d.slot] = o[d.slot] || new Set()).add(d.price); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v]])); }); await ctx.close(); return r; })();
console.log(JSON.stringify({ 全新: fresh.r, 果凍6種: a.r, 舊存檔甜點已解鎖: b.r, 裝飾品價錢: prices, errs: [...fresh.errs, ...a.errs, ...b.errs] }));
await browser.close();
