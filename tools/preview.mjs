// 成就商店預覽：點名字預覽（面板收起來、裝上去、下面一條），返回換回原本的；預覽時直接購買；手機和電腦各一次
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['pc', { width: 900, height: 650 }], ['phone', { width: 390, height: 780 }]]) {
  const page = await (await browser.newContext({ viewport: vp, isMobile: name === 'phone', hasTouch: name === 'phone' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(() => { __game.applyQuality('low'); const b = document.querySelector('button[data-cheat="ach"]'); for (let i = 0; i < 20; i++) b.click(); });
  await page.click('#achBtn'); await page.click('button[data-achtab="shop"]');
  await page.evaluate(() => document.querySelectorAll('#ach details.grp').forEach((d) => { d.open = true; }));
  const color = () => page.evaluate(() => __game.scene ? null : null);
  await page.click('[data-preview="pusherPink"]'); await page.waitForTimeout(400);
  const s1 = await page.evaluate(() => ({ bar: document.getElementById('previewBar').className, ach: document.getElementById('ach').className, name: document.getElementById('previewName').textContent, price: document.getElementById('previewPrice').textContent }));
  await page.screenshot({ path: `/tmp/pd-shots/preview-${name}.png` });
  await page.click('#previewBack'); await page.waitForTimeout(200);
  const s2 = await page.evaluate(() => ({ bar: document.getElementById('previewBar').className, ach: document.getElementById('ach').className }));
  await page.evaluate(() => document.querySelectorAll('#ach details.grp').forEach((d) => { d.open = true; }));
  await page.click('[data-preview="decoStars"]'); await page.waitForTimeout(200);
  await page.click('#previewAct'); await page.waitForTimeout(200);
  const s3 = await page.evaluate(() => JSON.parse(JSON.stringify(__game.saveData().equipped)));
  console.log(name, JSON.stringify({ s1, s2, s3, errs }));
  await page.close();
}
await browser.close();
