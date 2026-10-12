/* Gate 3 capture: Start lap, recorded as video, with a contact sheet of
   frames and a screenshot of the Grid mid-race. Round 7: Start lap is a
   tour that opens every stop in turn; the log carries the stop it is on.
   Usage: node tools/circuit/lap.mjs URL OUTDIR [--prefix s3] [--seed N] [--warm 30]
   Writes <prefix>-lap.webm (the ride, 960x540), <prefix>-lap-frames/*.png
   every 2 s, <prefix>-grid.png (the timing block), <prefix>-lap.json (the
   subject log, the order changes seen, the seed). The race runs live in
   the page; --warm seconds pass before the lap starts so the field has
   spread into a race. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pw = [process.env.PLAYWRIGHT, path.join(ROOT, 'node_modules/playwright/index.mjs'),
    path.join(process.env.HOME || '', 'Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs')].filter(Boolean).find(p => fs.existsSync(p));
const { chromium } = await import(pathToFileURL(pw).href);
const [url, outDir] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const prefix = arg('--prefix', 's3'), seed = arg('--seed', null), warm = +arg('--warm', 30);
fs.mkdirSync(outDir, { recursive: true });
const framesDir = path.join(outDir, prefix + '-lap-frames'); fs.mkdirSync(framesDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: outDir, size: { width: 960, height: 600 } } });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const full = url + (url.includes('?') ? '&' : '?') + 'lap=' + Date.now() + (seed ? '&seed=' + seed : '');
await page.goto(full, { waitUntil: 'load' });
await page.waitForFunction(() => window.__circuit && window.__circuit.groups);
await page.evaluate(() => window.__circuit.ready); await page.evaluate(() => window.__circuit.marked);
await page.waitForTimeout(warm * 1000);
const gridBefore = await page.evaluate(() => window.__circuit.gridState().map(r => r.id + ' ' + (r.rank === 1 ? 'Lead' : '+' + r.gap.toFixed(2))));
const gridEl = await page.$('.ring-tower'); await gridEl.screenshot({ path: path.join(outDir, prefix + '-grid.png') });
await page.screenshot({ path: path.join(outDir, prefix + '-race-wide.png') });
const t0 = Date.now();
await page.evaluate(() => window.__circuit.nav.startLap());
const log = [], seen = [];
let prevOrder = null, k = 0, prevSubject = '';
while (Date.now() - t0 < 150000) {   // the tour takes about 110 s
    const st = await page.evaluate(() => { const c = window.__circuit, g = c.gridState(), rs = c.raceState(), nv = c.nav.state();
        return { lap: nv.lap, stop: nv.tour ? nv.tour.stop : null, phase: nv.tour ? nv.tour.phase : null, order: g.map(x => x.id).join('>'), gaps: g.map(x => x.gap), pass: rs.pass, target: nv.target, zoom: +nv.zoom.toFixed(2), race: rs.t }; });
    if (!st.lap) break;
    const t = +((Date.now() - t0) / 1000).toFixed(1);
    if (prevOrder && st.order !== prevOrder) seen.push({ t, order: st.order });
    prevOrder = st.order;
    log.push({ t, stop: st.stop, phase: st.phase, order: st.order, pass: st.pass, zoom: st.zoom, target: st.target.map(n => +n.toFixed(1)) });
    if (Math.floor(t / 2) > k) { k = Math.floor(t / 2); await page.screenshot({ path: path.join(framesDir, String(k).padStart(2, '0') + '.png') }); }
    await page.waitForTimeout(250);
}
const lapSeconds = +((Date.now() - t0) / 1000).toFixed(1);
const rs = await page.evaluate(() => window.__circuit.raceState());
await page.waitForTimeout(1200);
await ctx.close();
const vid = fs.readdirSync(outDir).find(f => f.endsWith('.webm') && !f.startsWith(prefix));
if (vid) fs.renameSync(path.join(outDir, vid), path.join(outDir, prefix + '-lap.webm'));
const report = { url: full, seed: rs.seed, warmSeconds: warm, lapSeconds, orderChangesDuringLap: seen, gridAtStart: gridBefore, passesCompletedTotal: rs.passes, subjectLog: log.filter((_, i) => i % 4 === 0), errors };
fs.writeFileSync(path.join(outDir, prefix + '-lap.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ seed: rs.seed, lapSeconds, orderChangesDuringLap: seen.length, at: seen.map(s => s.t), video: prefix + '-lap.webm', errors }));
await browser.close();
