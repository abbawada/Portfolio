/* Start lap capture: the chase camera on the day's Wikipedia race, as
   video, with a contact sheet of frames and a screenshot of the Grid.
   Usage: node tools/circuit/lap.mjs URL OUTDIR [--prefix r5]
   Writes <prefix>-lap.webm (the ride, 960x540), <prefix>-lap-frames/*.png
   every 2 s, <prefix>-grid.png (the timing block), <prefix>-lap.json (the
   camera's target log). The order is fixed for the day, so there is no
   "order changes seen" to report the way there was when the race was
   simulated; this instead confirms the leader the camera follows never
   changes mid-lap, which is the point of the current model. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pw = [process.env.PLAYWRIGHT, path.join(ROOT, 'node_modules/playwright/index.mjs'),
    path.join(process.env.HOME || '', 'Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs')].filter(Boolean).find(p => fs.existsSync(p));
const { chromium } = await import(pathToFileURL(pw).href);
const [url, outDir] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const prefix = arg('--prefix', 'lap');
fs.mkdirSync(outDir, { recursive: true });
const framesDir = path.join(outDir, prefix + '-lap-frames'); fs.mkdirSync(framesDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: outDir, size: { width: 960, height: 600 } } });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const full = url + (url.includes('?') ? '&' : '?') + 'lap=' + Date.now();
await page.goto(full, { waitUntil: 'load' });
await page.waitForFunction(() => window.__circuit && window.__circuit.groups);
await page.evaluate(() => window.__circuit.ready);
await page.evaluate(() => window.__circuit.fielded);
await page.evaluate(() => window.__circuit.marked);
await page.waitForTimeout(1200);
const gridBefore = await page.evaluate(() => window.__circuit.gridState().map(r => r.id + ' P' + r.rank + ' ' + r.name + ' (' + r.views + ')'));
const gridEl = await page.$('.ring-broadcast'); await gridEl.screenshot({ path: path.join(outDir, prefix + '-grid.png') });
await page.screenshot({ path: path.join(outDir, prefix + '-race-wide.png') });
const leaderAtStart = await page.evaluate(() => window.__circuit.leaderId());
const t0 = Date.now();
await page.evaluate(() => window.__circuit.nav.startLap());
const log = [];
let leaderChanged = false, k = 0;
while (Date.now() - t0 < 90000) {
    const st = await page.evaluate(() => { const c = window.__circuit, nv = c.nav.state();
        return { lap: nv.lap, leader: c.leaderId(), target: nv.target, zoom: +nv.zoom.toFixed(2) }; });
    if (!st.lap) break;
    const t = +((Date.now() - t0) / 1000).toFixed(1);
    if (st.leader !== leaderAtStart) leaderChanged = true;
    log.push({ t, leader: st.leader, zoom: st.zoom, target: st.target.map(n => +n.toFixed(1)) });
    if (Math.floor(t / 2) > k) { k = Math.floor(t / 2); await page.screenshot({ path: path.join(framesDir, String(k).padStart(2, '0') + '.png') }); }
    await page.waitForTimeout(250);
}
const lapSeconds = +((Date.now() - t0) / 1000).toFixed(1);
const rs = await page.evaluate(() => window.__circuit.raceState());
await page.waitForTimeout(1200);
await ctx.close();
const vid = fs.readdirSync(outDir).find(f => f.endsWith('.webm') && !f.startsWith(prefix));
if (vid) fs.renameSync(path.join(outDir, vid), path.join(outDir, prefix + '-lap.webm'));
const report = { url: full, date: rs.date, status: rs.status, lapSeconds, leaderAtStart, leaderChangedDuringLap: leaderChanged, gridAtStart: gridBefore, cameraLog: log.filter((_, i) => i % 4 === 0), errors };
fs.writeFileSync(path.join(outDir, prefix + '-lap.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ date: rs.date, status: rs.status, lapSeconds, leaderChangedDuringLap: leaderChanged, video: prefix + '-lap.webm', errors }));
await browser.close();
