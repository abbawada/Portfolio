/* Detail shots with Playwright over Chrome.
   Usage: node tools/circuit/shots.mjs URL OUTDIR name:u,v,zoom [name:u,v,zoom ...]
   Each spec frames the plan point (u, v) at the zoom and writes OUTDIR/<name>.png. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pw = [process.env.PLAYWRIGHT, path.join(ROOT, 'node_modules/playwright/index.mjs'),
    path.join(process.env.HOME || '', 'Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs')].filter(Boolean).find(p => fs.existsSync(p));
const { chromium } = await import(pathToFileURL(pw).href);
const [url, outDir, ...specs] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'load' });
await page.waitForFunction(() => window.__circuit && window.__circuit.groups);
await page.evaluate(() => window.__circuit.ready); await page.evaluate(() => window.__circuit.dressed); await page.waitForTimeout(1500);
for (const spec of specs) {
    const [name, rest] = spec.split(':'); const [u, v, zoom] = rest.split(',').map(Number);
    await page.evaluate(([u, v, zoom]) => window.__circuit.nav.flyTo(u, v, zoom), [u, v, zoom || 2.5]);
    await page.waitForTimeout(1100);
    const file = path.join(outDir, name + '.png'); await page.screenshot({ path: file }); console.log(file);
}
await browser.close();
