// 商店：不分類、滿級收進「已滿級」、一鍵買到最高（勾起來按一次升好幾級）；沒有牆、娃娃上限 3
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:8765/'));
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => { const g = __game; g.applyQuality('low'); g.setWallet(2000); for (let i = 0; i < 7; i++) g.buy('guard'); g.buy('refill'); g.buy('speed'); g.setWallet(400); });
await page.click('#shopBtn');
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/pd-shots/shop3-a.png' });
await page.check('#buyMaxChk');
await page.waitForTimeout(200);
const before = await page.evaluate(() => ({ w: __game.wallet, lv: __game.upgrades.refill }));
await page.click('button[data-buy="refill"]');
const after = await page.evaluate(() => ({ w: __game.wallet, lv: __game.upgrades.refill }));
await page.screenshot({ path: '/tmp/pd-shots/shop3-b.png' });
const order = await page.evaluate(() => __game.UPGRADE_KEYS.map((k) => __game.UPGRADES[k].name).join(' → '));
// 沒有牆：往側邊丟一枚硬幣，會掉進側溝
const side = await page.evaluate(() => { const g = __game; const c = g.spawnCoin(3.6, 0.3, 0); c.body.setLinvel({ x: 4, y: 0, z: 0 }, true); const l0 = g.lost; g.simulate(2); return g.lost - l0; });
const dolls = await page.evaluate(() => { const g = __game; g.clearTable(); for (let i = 0; i < 10; i++) g.dropNewDoll(); return g.dolls.length; });
console.log(JSON.stringify({ order, before, after, 側邊丟一枚掉進側溝: side, 'dropNewDoll十次後檯面娃娃(要自己檢查上限)': dolls, errs }));
await browser.close();
