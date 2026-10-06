// 置中的字：首尾符號不算。量「金幣雨！」的「幣」、「狂熱時間！」中間、「轉生中……」的「生」、
// 「+5」的「5」，看離畫面中間（或對準的位置）差幾個像素
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  // 找某個元素裡第 n 個字（不含掛出去的符號）的中心 x
  const charCenter = (el, pick) => {
    const core = el.querySelector('.hc');
    const node = [...core.childNodes].find((n) => n.nodeType === 3);
    const text = node.textContent;
    const i = pick === 'mid' ? null : text.indexOf(pick);
    const range = document.createRange();
    if (i === null) { range.setStart(node, 0); range.setEnd(node, text.length); } else { range.setStart(node, i); range.setEnd(node, i + 1); }
    const b = range.getBoundingClientRect();
    return b.left + b.width / 2;
  };
  const W = window.innerWidth / 2;
  const out = {};
  for (const [id, pick] of [['rainBanner', '幣'], ['feverBanner', 'mid']]) {
    const el = document.getElementById(id);
    el.style.opacity = 1; el.style.animation = 'none';
    out[id] = Math.round(charCenter(el, pick) - W);
    el.style.opacity = ''; el.style.animation = '';
  }
  const rb = document.querySelector('.rebornText');
  document.getElementById('reborn').classList.add('show');
  out.reborn = Math.round(charCenter(rb, '生') - W);
  document.getElementById('reborn').classList.remove('show');
  return out;
});
// 用遊戲裡真的 floatText：推下一枚幣，抓剛出現的 .float
const fl = await page.evaluate(async () => {
  const g = __game; g.applyQuality('low');
  g.spawnCoin(0, 0.3, 3.3);
  for (let i = 0; i < 90 && !document.querySelector('.float'); i++) g.simulate(1 / 60);
  const el = document.querySelector('.float');
  if (!el) return null;
  el.style.animation = 'none';
  const core = el.querySelector('.hc');
  const node = [...core.childNodes].find((n) => n.nodeType === 3);
  const range = document.createRange(); range.setStart(node, 0); range.setEnd(node, node.textContent.length);
  const b = range.getBoundingClientRect();
  return { text: el.textContent, 字中心減對準位置: Math.round(b.left + b.width / 2 - parseFloat(el.style.left)) };
});
console.log(JSON.stringify({ 離畫面中間幾像素: r, 飄字: fl, errs }));
await browser.close();
