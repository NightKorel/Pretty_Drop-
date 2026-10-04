import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.NPMG + '/playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext(devices['Pixel 7']);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.5e6/8*8/8*5, uploadThroughput: 1e5 }); // ~ 5Mbps-ish
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const t0 = Date.now();
await page.goto('http://localhost:8765/?' + Date.now());
await page.waitForFunction(() => window.__game, null, { timeout: 180000 });
const total = Date.now() - t0; console.log(JSON.stringify(await page.evaluate(() => window.__m)));
const res = await page.evaluate(() => performance.getEntriesByType('resource').map(r => [r.name.split('/').pop(), Math.round(r.startTime), Math.round(r.responseEnd), r.transferSize]));
console.log('total', total); for (const r of res) console.log(JSON.stringify(r));
await browser.close();
