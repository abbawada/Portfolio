/* V1.2 race contract: four cars lap without pause, never touch, stay
   inside the white lines, and change order now and then. Steps the race
   maths directly (the loop is stopped) for the given seconds at 60 Hz.
   Usage: node tools/circuit/racetest.mjs URL [seconds] [OUT.json] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pw = [process.env.PLAYWRIGHT, path.join(ROOT, 'node_modules/playwright/index.mjs'),
    path.join(process.env.HOME || '', 'Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs')].filter(Boolean).find(p => fs.existsSync(p));
const { chromium } = await import(pathToFileURL(pw).href);
const [url, secsArg, out] = process.argv.slice(2);
const secs = +(secsArg || 240);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'load' });
await page.waitForFunction(() => window.__circuit && window.__circuit.groups);
await page.evaluate(() => window.__circuit.ready); await page.waitForTimeout(800);
const r = await page.evaluate(secs => {
    const c = window.__circuit; c.stop();
    const n = Math.round(secs * 60), dt = 1 / 60;
    let minD = Infinity, minPair = null, maxLane = 0, orderChanges = 0, prevOrder = null, passingFrames = 0, moved = 0, lastAt = null;
    for (let i = 0; i < n; i++) {
        c.stepRace(dt);
        const g = c.gridState();
        const order = g.map(x => x.id).join('>');
        if (prevOrder && order !== prevOrder) orderChanges++;
        prevOrder = order;
        if (c.passing()) passingFrames++;
        for (let a = 0; a < g.length; a++) {
            maxLane = Math.max(maxLane, Math.abs(g[a].lane));
            for (let b = a + 1; b < g.length; b++) {
                const d = Math.hypot(g[a].at[0] - g[b].at[0], g[a].at[1] - g[b].at[1]);
                if (d < minD) { minD = d; minPair = [g[a].id, g[b].id, +(i / 60).toFixed(1)]; }
            }
        }
        if (lastAt) moved += Math.hypot(g[0].at[0] - lastAt[0], g[0].at[1] - lastAt[1]); lastAt = g[0].at;
    }
    return { seconds: secs, cars: c.gridState().length, minDistance: +minD.toFixed(2), minPair, maxLateral: +maxLane.toFixed(2), orderChanges, passingShare: +(passingFrames / n).toFixed(2), distanceLapped: Math.round(moved), calls: c.stats.calls, triangles: c.stats.triangles };
}, secs);
r.errors = errors;
/* cars are 1.8 wide and 3.8 long: clear when centres are 2.6 apart; inside the lines when the centre sits within 3.6 of the middle */
r.pass = r.cars === 4 && r.minDistance >= 2.6 && r.maxLateral <= 3.6 && r.orderChanges >= 3 && r.distanceLapped > 0 && errors.length === 0;
console.log(JSON.stringify(r));
if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1));
await browser.close();
